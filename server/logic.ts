import { addDays, format, parseISO } from 'date-fns'
import type { Db } from './schema.ts'
import { getProduct, listSprays, parcels as parcelRepo } from './repo.ts'
import type {
  ComplianceWarning,
  Dashboard,
  ParcelStatus,
  Product,
  ProductUse,
  Spray,
} from '../shared/types.ts'
import type { SprayInput } from './repo.ts'

const GRAPE = /sz[őoö]l[őoö]/i

export const norm = (s: string) =>
  s.toLocaleLowerCase('hu').normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** A szőlőre vonatkozó engedélyezett felhasználások. */
export function grapeUses(p: Product): ProductUse[] {
  return p.uses.filter((u) => GRAPE.test(u.culture))
}

/** A károsítóhoz tartozó szőlő-felhasználás, ha van egyezés. */
export function matchUse(p: Product, pest: string): ProductUse | undefined {
  const uses = grapeUses(p)
  const n = norm(pest)
  if (!n) return undefined
  return uses.find((u) => norm(u.pest) === n) ?? uses.find((u) => norm(u.pest).includes(n) || n.includes(norm(u.pest)))
}

/** ÉVI / MVI napok egy tételre: a károsítóhoz illő sor, különben a legszigorúbb szőlő-sor. */
export function waitingDays(p: Product, pest: string): { phi: number | null; rei: number | null } {
  const u = matchUse(p, pest)
  if (u) return { phi: u.phi_days, rei: u.rei_days }
  const uses = grapeUses(p)
  const max = (k: 'phi_days' | 'rei_days') => {
    const vals = uses.map((x) => x[k]).filter((v): v is number => v != null)
    return vals.length ? Math.max(...vals) : null
  }
  return { phi: max('phi_days'), rei: max('rei_days') }
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

/** Növényvédelmi ellenőrzések permetezés rögzítése előtt. */
export function validateSpray(db: Db, s: SprayInput, excludeSprayId?: number): ComplianceWarning[] {
  const out: ComplianceWarning[] = []
  if (!s.parcels.length) out.push({ level: 'error', message: 'Legalább egy ültetvényt ki kell választani.' })
  if (!s.items.length) out.push({ level: 'error', message: 'Legalább egy szert meg kell adni.' })

  const year = s.date.slice(0, 4)
  const season = listSprays(db, { year: Number(year) }).filter((x) => x.id !== excludeSprayId)
  const pRepo = parcelRepo(db)
  let needsLicense = false

  for (const it of s.items) {
    const p = getProduct(db, it.product_id)
    if (!p) {
      out.push({ level: 'error', message: `Ismeretlen szer (#${it.product_id}).` })
      continue
    }
    const tag = { product_id: p.id }
    if (p.source === 'demo')
      out.push({ level: 'info', message: `${p.name}: DEMÓ adat, nem valós engedélyokirat — ne használja éles naplóhoz.`, ...tag })

    // Lejárt engedélynél a NÉBIH „felhasználási idő lejárata” a mérvadó, ha meg van adva
    const deadline = p.use_until ?? p.permit_valid_until
    if (deadline && deadline < s.date)
      out.push({ level: 'error', message: `${p.name}: ${p.use_until ? 'a felhasználási idő' : 'az engedély'} ${deadline}-án lejárt.`, ...tag })
    else if (p.status && /visszavon|lejárt|törölt|megszűnt/i.test(p.status))
      out.push({ level: 'error', message: `${p.name}: az engedély állapota „${p.status}”.`, ...tag })

    const cat = p.category?.match(/^\s*(I{1,3})(?![IVX])/)
    if (cat && cat[1].length <= 2) needsLicense = true

    const uses = grapeUses(p)
    if (!p.uses.length) {
      out.push({ level: 'warning', message: `${p.name}: nincs engedélyezési (kultúra/dózis) adat — ellenőrizze a NÉBIH engedélyokiratot.`, ...tag })
    } else if (!uses.length) {
      out.push({ level: 'error', message: `${p.name}: az engedélyokirat szerint szőlőben nem engedélyezett.`, ...tag })
    } else {
      const u = matchUse(p, it.pest)
      if (!u) {
        out.push({
          level: 'warning',
          message: `${p.name}: „${it.pest || '—'}” károsító nem szerepel a szőlőre engedélyezett célszervezetek között (${[...new Set(uses.map((x) => x.pest))].join(', ')}).`,
          ...tag,
        })
      } else {
        if (u.dose_max == null)
          out.push({ level: 'info', message: `${p.name}: a dózis nincs ellenőrizve — a NÉBIH adatlap nem tartalmazza, az engedélyokirat (PDF) alapján a Szeradatbázisban megadható.`, ...tag })
        else if (u.dose_unit && it.dose_unit && norm(u.dose_unit) !== norm(it.dose_unit))
          out.push({ level: 'warning', message: `${p.name}: a dózis mértékegysége (${it.dose_unit}) eltér az engedélyezettől (${u.dose_unit}).`, ...tag })
        else if (u.dose_max != null && it.dose > u.dose_max + 1e-9)
          out.push({ level: 'error', message: `${p.name}: a dózis (${it.dose} ${it.dose_unit}) meghaladja az engedélyezett maximumot (${u.dose_max} ${u.dose_unit}).`, ...tag })
        else if (u.dose_min != null && it.dose < u.dose_min - 1e-9)
          out.push({ level: 'info', message: `${p.name}: a dózis az engedélyezett minimum (${u.dose_min} ${u.dose_unit}) alatt van.`, ...tag })

        if (u.notes && /ÉVI/.test(u.notes)) out.push({ level: 'info', message: `${p.name}: ${u.notes}`, ...tag })

        if (u.max_treatments != null) {
          for (const sp of s.parcels) {
            const used = season.filter(
              (x) => x.parcels.some((pp) => pp.parcel_id === sp.parcel_id) && x.items.some((i) => i.product_id === p.id),
            ).length
            if (used + 1 > u.max_treatments) {
              const parcel = pRepo.get(sp.parcel_id)
              out.push({
                level: 'error',
                message: `${p.name}: ${parcel?.name ?? 'ültetvény'} — ezzel ${used + 1}. kezelés lenne idén, az engedélyezett legfeljebb ${u.max_treatments}.`,
                ...tag,
                parcel_id: sp.parcel_id,
              })
            }
          }
        }
      }
    }

    // Szerkesztéskor a bejegyzés saját korábbi levonását visszaadjuk a készlethez
    const own = excludeSprayId
      ? Number((db.prepare('SELECT COALESCE(-SUM(quantity),0) v FROM stock_movements WHERE spray_id = ? AND product_id = ?').get(excludeSprayId, p.id) as any).v)
      : 0
    const available = Math.round((p.stock + own) * 1000) / 1000
    if (available < it.total_amount - 1e-9)
      out.push({ level: 'warning', message: `${p.name}: a készlet (${available} ${p.unit}) kevesebb, mint a felhasznált mennyiség (${it.total_amount} ${p.unit}).`, ...tag })

    // Már rögzített szüret az ÉVI-n belül?
    const { phi } = waitingDays(p, it.pest)
    if (phi) {
      const until = iso(addDays(parseISO(s.date), phi))
      for (const sp of s.parcels) {
        const h = db
          .prepare('SELECT date FROM harvests WHERE parcel_id = ? AND date >= ? AND date < ? ORDER BY date LIMIT 1')
          .get(sp.parcel_id, s.date, until) as { date: string } | undefined
        if (h)
          out.push({
            level: 'error',
            message: `${p.name}: a(z) ${h.date}-i szüret az élelmezés-egészségügyi várakozási időn (${phi} nap, ${until}-ig) belül van.`,
            ...tag,
            parcel_id: sp.parcel_id,
          })
      }
    }
  }

  for (const sp of s.parcels) {
    const parcel = pRepo.get(sp.parcel_id)
    if (!parcel) out.push({ level: 'error', message: `Ismeretlen ültetvény (#${sp.parcel_id}).` })
    else if (sp.treated_area_ha > parcel.area_ha + 1e-9)
      out.push({ level: 'warning', message: `${parcel.name}: a kezelt terület (${sp.treated_area_ha} ha) nagyobb, mint az ültetvény (${parcel.area_ha} ha).`, parcel_id: parcel.id })
  }

  if (needsLicense && !s.operator_license)
    out.push({ level: 'warning', message: 'I. vagy II. forgalmi kategóriás szer: adja meg a kezelést végző növényvédelmi képesítésének/engedélyének számát.' })

  return out
}

/** Ültetvényenként az utolsó kezelés és a várakozási idők lejárta. */
export function parcelStatuses(db: Db, year: number): ParcelStatus[] {
  const sprays = listSprays(db, { year })
  const cache = new Map<number, Product | undefined>()
  const prod = (id: number) => {
    if (!cache.has(id)) cache.set(id, getProduct(db, id))
    return cache.get(id)
  }
  return parcelRepo(db)
    .list()
    .map((parcel) => {
      const mine = sprays.filter((s) => s.parcels.some((p) => p.parcel_id === parcel.id))
      let harvest: string | null = null
      let reentry: string | null = null
      for (const s of mine) {
        for (const it of s.items) {
          const p = prod(it.product_id)
          if (!p) continue
          const { phi, rei } = waitingDays(p, it.pest)
          if (phi != null) harvest = later(harvest, iso(addDays(parseISO(s.date), phi)))
          if (rei != null) reentry = later(reentry, iso(addDays(parseISO(s.date), rei)))
        }
      }
      return {
        parcel_id: parcel.id,
        last_spray_date: mine[0]?.date ?? null,
        harvest_allowed_from: harvest,
        reentry_allowed_from: reentry,
        sprays_this_season: mine.length,
      }
    })
}

export function dashboard(db: Db, year: number): Dashboard {
  const y = String(year)
  const one = (sql: string, ...p: any[]) => Number((db.prepare(sql).get(...p) as any)?.v ?? 0)
  const sprays: Spray[] = listSprays(db, { year })
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: sprays.filter((s) => Number(s.date.slice(5, 7)) === i + 1).length,
  }))
  const lowStock = db
    .prepare(
      `SELECT p.id, p.name, p.unit, COALESCE(SUM(m.quantity),0) stock FROM products p
       JOIN stock_movements m ON m.product_id = p.id GROUP BY p.id HAVING stock <= 1 ORDER BY stock`,
    )
    .all() as any[]
  return {
    season: year,
    total_area_ha: one('SELECT COALESCE(SUM(area_ha),0) v FROM parcels'),
    parcel_count: one('SELECT COUNT(*) v FROM parcels'),
    spray_count_season: sprays.length,
    work_hours_season: one(`SELECT COALESCE(SUM(hours * COALESCE(workers,1)),0) v FROM work_entries WHERE substr(date,1,4)=?`, y),
    harvest_kg_season: one(`SELECT COALESCE(SUM(quantity_kg),0) v FROM harvests WHERE substr(date,1,4)=?`, y),
    parcel_status: parcelStatuses(db, year),
    recent_sprays: sprays.slice(0, 5),
    low_stock: lowStock.map((r) => ({ ...r, stock: Math.round(r.stock * 1000) / 1000 })),
    monthly_sprays: monthly,
  }
}
