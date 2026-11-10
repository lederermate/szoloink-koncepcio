// Bemutató adatok — kitalált ültetvények és KITALÁLT „DEMO” szerek.
// A demó szerek NEM valós NÉBIH engedélyokiratok; a Szeradatbázis oldalon egy
// kattintással törölhetők, és a valós szereket a NÉBIH-ből kell importálni.
import { fileURLToPath } from 'node:url'
import type { Db } from './db.ts'
import { openDb } from './db.ts'
import { addStock, harvests, parcels, saveProduct, saveSpray, setSettings, work } from './repo.ts'
import type { ProductUse } from '../shared/types.ts'

const use = (pest: string, dose_min: number, dose_max: number, dose_unit: string, phi: number, rei: number, max: number | null): ProductUse => ({
  culture: 'szőlő', pest, dose_min, dose_max, dose_unit, phi_days: phi, rei_days: rei, max_treatments: max, notes: null,
})

export function seedIfEmpty(db: Db) {
  const n = db.prepare('SELECT COUNT(*) c FROM parcels').get() as { c: number }
  if (Number(n.c) > 0) return false
  seed(db)
  return true
}

export function seed(db: Db) {
  const P = parcels(db)
  const p1 = P.create({ name: 'Öreg-hegy', hrsz: '0123/4', location: 'Badacsonytomaj', area_ha: 1.2, variety: 'Olaszrizling', rootstock: 'Teleki 5C', planted_year: 1998, row_spacing_m: 2.4, vine_spacing_m: 1.0, vine_count: 5000, training_system: 'Középmagas kordon', color: '#65a30d' })
  const p2 = P.create({ name: 'Kis-dűlő', hrsz: '0456/2', location: 'Badacsonytomaj', area_ha: 0.65, variety: 'Kékfrankos', rootstock: 'T.K. 5BB', planted_year: 2012, row_spacing_m: 2.2, vine_spacing_m: 0.9, vine_count: 3280, training_system: 'Guyot', color: '#9f1239' })
  const p3 = P.create({ name: 'Templom alatti', hrsz: '0789/11', location: 'Szigliget', area_ha: 0.9, variety: 'Szürkebarát', rootstock: 'SO4', planted_year: 2005, row_spacing_m: 2.5, vine_spacing_m: 1.0, vine_count: 3600, training_system: 'Ernyő', color: '#d97706' })

  const demo = { source: 'demo' as const, category: 'III.', permit_valid_until: '2030-12-31', status: 'DEMÓ' }
  const cu = saveProduct(db, { ...demo, name: 'DEMO Réz 50 WG', permit_number: 'DEMO-001', holder: 'Bemutató Kft.', formulation: 'WG', unit: 'kg',
    active_substances: [{ name: 'réz (rézhidroxid formában)', concentration: '50%' }],
    uses: [use('peronoszpóra', 1.5, 2.5, 'kg/ha', 21, 1, 4)] })
  const s = saveProduct(db, { ...demo, name: 'DEMO Kén 80 WG', permit_number: 'DEMO-002', holder: 'Bemutató Kft.', formulation: 'WG', unit: 'kg',
    active_substances: [{ name: 'kén', concentration: '80%' }],
    uses: [use('lisztharmat', 2, 6, 'kg/ha', 5, 0, 8)] })
  const sys = saveProduct(db, { ...demo, name: 'DEMO Felszívódó EC', permit_number: 'DEMO-003', holder: 'Bemutató Kft.', formulation: 'EC', unit: 'l', category: 'II.',
    active_substances: [{ name: 'demo hatóanyag A', concentration: '100 g/l' }],
    uses: [use('peronoszpóra', 0.4, 0.5, 'l/ha', 28, 2, 3), use('lisztharmat', 0.4, 0.5, 'l/ha', 28, 2, 3)] })
  const bot = saveProduct(db, { ...demo, name: 'DEMO Botrytis SC', permit_number: 'DEMO-004', holder: 'Bemutató Kft.', formulation: 'SC', unit: 'l',
    active_substances: [{ name: 'demo hatóanyag B', concentration: '500 g/l' }],
    uses: [use('szürkerothadás', 1, 1.5, 'l/ha', 35, 1, 1)] })
  saveProduct(db, { ...demo, name: 'DEMO Rovarölő (csak alma)', permit_number: 'DEMO-005', holder: 'Bemutató Kft.', formulation: 'EC', unit: 'l',
    active_substances: [{ name: 'demo hatóanyag C', concentration: '25 g/l' }],
    uses: [{ ...use('almamoly', 0.2, 0.3, 'l/ha', 14, 1, 2), culture: 'alma' }] })

  const y = new Date().getFullYear()
  addStock(db, cu.id, 25, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, s.id, 50, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, sys.id, 5, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, bot.id, 5, `${y}-04-10`, 'Nyitókészlet')

  const op = { operator_name: 'Kovács János', operator_license: 'DEMO-ZK-1234', machine: 'Permetező, 400 l', wind: 'szélcsend', notes: null, end_time: null }
  const all = [p1, p2, p3].map((p) => ({ parcel_id: p.id, treated_area_ha: p.area_ha }))
  const area = all.reduce((a, b) => a + b.treated_area_ha, 0)
  const round = (x: number) => Math.round(x * 100) / 100
  const plan: [string, string, [number, string, number, string][]][] = [
    ['05-12', 'BBCH 15 – 5 levél', [[s.id, 'lisztharmat', 4, 'kg/ha'], [cu.id, 'peronoszpóra', 2, 'kg/ha']]],
    ['05-28', 'BBCH 57 – fürtmegnyúlás', [[s.id, 'lisztharmat', 4, 'kg/ha'], [cu.id, 'peronoszpóra', 2, 'kg/ha']]],
    ['06-12', 'BBCH 65 – teljes virágzás', [[sys.id, 'peronoszpóra', 0.5, 'l/ha']]],
    ['06-27', 'BBCH 71 – terméskötődés', [[sys.id, 'lisztharmat', 0.5, 'l/ha'], [s.id, 'lisztharmat', 3, 'kg/ha']]],
    ['07-14', 'BBCH 77 – fürtzáródás', [[cu.id, 'peronoszpóra', 2, 'kg/ha'], [bot.id, 'szürkerothadás', 1.2, 'l/ha']]],
    ['08-02', 'BBCH 81 – zsendülés kezdete', [[cu.id, 'peronoszpóra', 1.8, 'kg/ha'], [s.id, 'lisztharmat', 3, 'kg/ha']]],
  ]
  for (const [md, bbch, items] of plan)
    saveSpray(db, {
      ...op, date: `${y}-${md}`, start_time: '06:30', water_l_per_ha: 400, temperature_c: 19, phenology: bbch, parcels: all,
      items: items.map(([product_id, pest, dose, dose_unit]) => ({ product_id, pest, dose, dose_unit, total_amount: round(dose * area) })),
    })

  const W = work(db)
  W.create({ parcel_id: p1.id, date: `${y}-02-20`, type: 'metszés', hours: 8, workers: 3, cost_huf: 96000, notes: 'Csapos metszés' })
  W.create({ parcel_id: p2.id, date: `${y}-03-05`, type: 'metszés', hours: 6, workers: 2, cost_huf: 48000, notes: null })
  W.create({ parcel_id: p3.id, date: `${y}-05-20`, type: 'zöldmunka', hours: 5, workers: 2, cost_huf: 40000, notes: 'Hajtásválogatás' })
  W.create({ parcel_id: p1.id, date: `${y}-06-15`, type: 'kaszálás', hours: 3, workers: 1, cost_huf: 15000, notes: 'Sorköz' })

  const H = harvests(db)
  H.create({ parcel_id: p1.id, date: `${y}-09-18`, quantity_kg: 9800, must_degree: 19.5, buyer: 'Saját feldolgozás', notes: null })
  H.create({ parcel_id: p2.id, date: `${y}-10-02`, quantity_kg: 4200, must_degree: 20.5, buyer: 'Saját feldolgozás', notes: null })
  H.create({ parcel_id: p3.id, date: `${y}-09-25`, quantity_kg: 6900, must_degree: 21.0, buyer: 'Saját feldolgozás', notes: null })

  setSettings(db, { farm_name: 'Bemutató Pincészet', operator_name: op.operator_name, operator_license: op.operator_license, machine: op.machine })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb()
  console.log(seedIfEmpty(db) ? 'Bemutató adatok betöltve.' : 'Az adatbázis nem üres, kihagyva.')
}
