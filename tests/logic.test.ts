import { beforeEach, describe, expect, it } from 'vitest'
import { openDb, type Db } from '../server/db'
import { harvests, parcels, saveProduct, saveSpray, addStock } from '../server/repo'
import { parcelStatuses, validateSpray } from '../server/logic'
import { totalAmount } from '../src/pages/SprayForm'

let db: Db, pid: number, prod: number, apple: number
const use = { culture: 'szőlő', pest: 'peronoszpóra', dose_min: 1, dose_max: 2, dose_unit: 'kg/ha', phi_days: 21, rei_days: 2, max_treatments: 2, notes: null }
const spray = (date: string, dose = 2, product_id = prod) => ({
  date, start_time: null, end_time: null, operator_name: 'X', operator_license: null, machine: null, water_l_per_ha: 400,
  temperature_c: null, wind: null, phenology: null, notes: null,
  parcels: [{ parcel_id: pid, treated_area_ha: 1 }], items: [{ product_id, pest: 'peronoszpóra', dose, dose_unit: 'kg/ha', total_amount: dose }],
})

beforeEach(() => {
  db = openDb(':memory:')
  pid = parcels(db).create({ name: 'A', area_ha: 1, color: '#000' }).id
  prod = saveProduct(db, { name: 'Réz', source: 'manual', unit: 'kg', category: 'III.', active_substances: [], uses: [use] }).id
  apple = saveProduct(db, { name: 'Alma szer', source: 'manual', unit: 'l', category: 'II.', active_substances: [], uses: [{ ...use, culture: 'alma' }] }).id
  addStock(db, prod, 10, '2026-01-01', null)
})

const levels = (w: { level: string; message: string }[], l: string) => w.filter((x) => x.level === l).map((x) => x.message)

describe('validateSpray', () => {
  it('rendben lévő kezelés: nincs hiba', () => {
    expect(levels(validateSpray(db, spray('2026-06-01')), 'error')).toEqual([])
  })
  it('túladagolás', () => {
    expect(levels(validateSpray(db, spray('2026-06-01', 3)), 'error').join()).toMatch(/meghaladja/)
  })
  it('nem szőlőre engedélyezett szer + képesítés figyelmeztetés', () => {
    const w = validateSpray(db, spray('2026-06-01', 1, apple))
    expect(levels(w, 'error').join()).toMatch(/szőlőben nem engedélyezett/)
    expect(levels(w, 'warning').join()).toMatch(/képesítés/)
  })
  it('max. kezelésszám túllépése', () => {
    saveSpray(db, spray('2026-05-01'))
    saveSpray(db, spray('2026-05-15'))
    expect(levels(validateSpray(db, spray('2026-06-01')), 'error').join()).toMatch(/3\. kezelés/)
  })
  it('szüret az ÉVI-n belül', () => {
    harvests(db).create({ parcel_id: pid, date: '2026-06-10', quantity_kg: 100 })
    expect(levels(validateSpray(db, spray('2026-06-01')), 'error').join()).toMatch(/várakozási időn/)
  })
  it('ÉVI / MVI lejárat számítása és készletlevonás', () => {
    saveSpray(db, spray('2026-06-01'))
    const st = parcelStatuses(db, 2026)[0]
    expect(st).toMatchObject({ harvest_allowed_from: '2026-06-22', reentry_allowed_from: '2026-06-03', sprays_this_season: 1 })
    const stock = db.prepare('SELECT SUM(quantity) s FROM stock_movements WHERE product_id = ?').get(prod) as any
    expect(stock.s).toBe(8)
  })
})

describe('totalAmount', () => {
  it('egységek', () => {
    expect(totalAmount(2, 'kg/ha', 1.5, 400)).toBe(3)
    expect(totalAmount(500, 'ml/ha', 2, 400)).toBe(1)
    expect(totalAmount(0.25, '%', 1, 400)).toBe(1)
    expect(totalAmount(0.3, 'l/hl', 1, 500)).toBeCloseTo(1.5)
  })
})
