/**
 * Keretrendszer-független API-útvonalak. A Node szerver (Express, server/app.ts) és a böngészős
 * demó (src/demo/backend.ts, sql.js) ugyanezt a táblát használja — így a növényvédelmi ellenőrzés
 * és minden üzleti logika egy helyen él.
 */
import { z } from 'zod'
import type { Db } from './schema.ts'
import * as repo from './repo.ts'
import { HttpError } from './repo.ts'
import { dashboard, parcelStatuses, validateSpray } from './logic.ts'
import type { NebihSearchHit, NebihStatus, Product } from '../shared/types.ts'

const num = z.coerce.number()
const optNum = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().nullable())
const optStr = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.string().nullable())
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dátum formátuma: ÉÉÉÉ-HH-NN')

const ParcelSchema = z.object({
  name: z.string().min(1, 'Név kötelező'),
  hrsz: optStr, location: optStr,
  area_ha: num.positive('A terület legyen pozitív'),
  variety: optStr, rootstock: optStr, planted_year: optNum,
  row_spacing_m: optNum, vine_spacing_m: optNum, vine_count: optNum,
  training_system: optStr, color: z.string().default('#65a30d'), notes: optStr,
})
const WorkSchema = z.object({
  parcel_id: num.int(), date, type: z.string().min(1),
  hours: optNum, workers: optNum, cost_huf: optNum, notes: optStr,
})
const HarvestSchema = z.object({
  parcel_id: num.int(), date, quantity_kg: num.nonnegative(),
  must_degree: optNum, buyer: optStr, notes: optStr,
})
const UseSchema = z.object({
  culture: z.string().min(1), pest: z.string().default(''),
  dose_min: optNum, dose_max: optNum, dose_unit: z.string().default('l/ha'),
  phi_days: optNum, rei_days: optNum, max_treatments: optNum, notes: optStr,
})
export const ProductSchema = z.object({
  name: z.string().min(1, 'Név kötelező'),
  permit_number: optStr, holder: optStr, formulation: optStr, category: optStr,
  active_substances: z.array(z.object({ name: z.string(), concentration: optStr })).default([]),
  permit_valid_until: optStr, use_until: optStr, status: optStr,
  extra: z.record(z.string(), z.any()).optional(),
  source: z.enum(['nebih', 'manual', 'demo']).default('manual'),
  nebih_id: optStr, nebih_url: optStr, synced_at: optStr,
  unit: z.string().default('l'),
  uses: z.array(UseSchema).default([]),
})
const SpraySchema = z.object({
  date, start_time: optStr, end_time: optStr,
  operator_name: optStr, operator_license: optStr, machine: optStr,
  water_l_per_ha: optNum, temperature_c: optNum, wind: optStr, phenology: optStr, notes: optStr,
  parcels: z.array(z.object({ parcel_id: num.int(), treated_area_ha: num.positive() })),
  items: z.array(
    z.object({
      product_id: num.int(), pest: z.string().default(''),
      dose: num.positive('A dózis legyen pozitív'), dose_unit: z.string().min(1),
      total_amount: num.nonnegative(),
    }),
  ),
})
const VarietySchema = z.object({
  name: z.string().min(1, 'Név kötelező'), other_names: optStr,
  berry_color: z.enum(['fehér', 'rózsaszín', 'piros', 'kék']).default('fehér'),
  ripening_from: optNum, ripening_to: optNum,
  tags: z.array(z.string()).default([]), description: optStr,
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
})

export interface Ctx {
  params: Record<string, string>
  query: Record<string, string | undefined>
  body: any
}
export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string // pl. '/parcels/:id'
  status?: number
  handler: (ctx: Ctx) => unknown
}

/** A NÉBIH-műveletek (a szerveren valós kliens, a böngészős demóban csonk). */
export interface NebihApi {
  status(force: boolean): Promise<NebihStatus>
  search(q: string): Promise<{ hits: NebihSearchHit[]; has_more: boolean }>
  importHit(db: Db, hit: Pick<NebihSearchHit, 'query' | 'index' | 'name'>): Promise<Product>
  resyncAll(db: Db): Promise<unknown>
}

const found = <T>(x: T | undefined | false): T => {
  if (!x) throw new HttpError(404, 'Nem található')
  return x
}
const idOf = (c: Ctx) => {
  const n = Number(c.params.id)
  if (!Number.isInteger(n)) throw new HttpError(400, 'Hibás azonosító')
  return n
}

export const BACKUP_TABLES = ['parcels', 'work_entries', 'products', 'product_uses', 'stock_movements', 'sprays', 'spray_parcels', 'spray_items', 'harvests', 'varieties', 'settings']

export function buildRoutes(db: Db, nebih: NebihApi): Route[] {
  const R: Route[] = []
  const add = (method: Route['method'], path: string, handler: Route['handler'], status?: number) => R.push({ method, path, handler, status })

  // Egyszerű CRUD erőforrások
  const resources = [
    ['parcels', repo.parcels(db), ParcelSchema],
    ['work', repo.work(db), WorkSchema],
    ['harvests', repo.harvests(db), HarvestSchema],
  ] as const
  for (const [name, store, schema] of resources) {
    add('GET', `/${name}`, (c) => {
      const pid = c.query.parcel_id ? Number(c.query.parcel_id) : null
      return pid && name !== 'parcels' ? store.list('WHERE parcel_id = ?', [pid]) : store.list()
    })
    add('GET', `/${name}/:id`, (c) => found(store.get(idOf(c))))
    add('POST', `/${name}`, (c) => store.create(schema.parse(c.body)), 201)
    add('PUT', `/${name}/:id`, (c) => found(store.update(idOf(c), schema.partial().parse(c.body))))
    add('DELETE', `/${name}/:id`, (c) => ({ ok: found(store.remove(idOf(c))) }))
  }

  // Fajtakatalógus
  const hydrateVariety = (row: any) => row && { ...row, tags: JSON.parse(row.tags || '[]'), links: JSON.parse(row.links || '[]') }
  const saveVariety = (b: z.infer<typeof VarietySchema>, vid?: number) => {
    const vals = [b.name, b.other_names, b.berry_color, b.ripening_from, b.ripening_to, JSON.stringify(b.tags), b.description, JSON.stringify(b.links)]
    if (vid) db.prepare(`UPDATE varieties SET name=?, other_names=?, berry_color=?, ripening_from=?, ripening_to=?, tags=?, description=?, links=?, updated_at=datetime('now') WHERE id=?`).run(...vals, vid)
    else vid = Number(db.prepare('INSERT INTO varieties (name, other_names, berry_color, ripening_from, ripening_to, tags, description, links) VALUES (?,?,?,?,?,?,?,?)').run(...vals).lastInsertRowid)
    return hydrateVariety(db.prepare('SELECT * FROM varieties WHERE id = ?').get(vid))
  }
  add('GET', '/varieties', () => (db.prepare('SELECT * FROM varieties ORDER BY name COLLATE NOCASE').all() as any[]).map(hydrateVariety))
  add('GET', '/varieties/:id', (c) => found(hydrateVariety(db.prepare('SELECT * FROM varieties WHERE id = ?').get(idOf(c)))))
  add('POST', '/varieties', (c) => saveVariety(VarietySchema.parse(c.body)), 201)
  add('PUT', '/varieties/:id', (c) => {
    found(db.prepare('SELECT id FROM varieties WHERE id = ?').get(idOf(c)))
    return saveVariety(VarietySchema.parse(c.body), idOf(c))
  })
  add('DELETE', '/varieties/:id', (c) => ({ ok: found(db.prepare('DELETE FROM varieties WHERE id = ?').run(idOf(c)).changes > 0) }))

  // Szerek
  add('GET', '/products', (c) => repo.listProducts(db, c.query.q || undefined))
  add('GET', '/products/:id', (c) => found(repo.getProduct(db, idOf(c))))
  add('POST', '/products', (c) => repo.saveProduct(db, ProductSchema.parse(c.body)), 201)
  add('PUT', '/products/:id', (c) => {
    found(repo.getProduct(db, idOf(c)))
    return repo.saveProduct(db, ProductSchema.partial().parse(c.body), idOf(c))
  })
  add('DELETE', '/products/:id', (c) => ({ ok: found(repo.deleteProduct(db, idOf(c))) }))
  add('POST', '/products/import', (c) => {
    const list = z.array(ProductSchema).parse(c.body)
    return { imported: list.map((p) => repo.saveProduct(db, p).id).length }
  })
  add('DELETE', '/demo-products', () => {
    const ids = (db.prepare(`SELECT id FROM products WHERE source = 'demo'`).all() as any[]).map((x) => x.id)
    let removed = 0
    for (const pid of ids) {
      try {
        repo.deleteProduct(db, pid)
        removed++
      } catch {}
    }
    return { removed, kept: ids.length - removed }
  })

  // Készlet
  add('GET', '/stock', (c) => repo.stockMovements(db, c.query.product_id ? Number(c.query.product_id) : undefined))
  add('POST', '/stock', (c) => {
    const b = z.object({ product_id: num.int(), quantity: num, date, note: optStr }).parse(c.body)
    found(repo.getProduct(db, b.product_id))
    repo.addStock(db, b.product_id, b.quantity, b.date, b.note)
    return repo.getProduct(db, b.product_id)
  })

  // Permetezési napló
  add('GET', '/sprays', (c) =>
    repo.listSprays(db, {
      year: c.query.year ? Number(c.query.year) : undefined,
      parcel_id: c.query.parcel_id ? Number(c.query.parcel_id) : undefined,
    }),
  )
  add('GET', '/sprays/:id', (c) => found(repo.getSpray(db, idOf(c))))
  add('POST', '/sprays/validate', (c) => validateSpray(db, SpraySchema.parse(c.body), c.query.exclude ? Number(c.query.exclude) : undefined))
  const saveSpray = (c: Ctx, sprayId?: number) => {
    const b = SpraySchema.parse(c.body)
    const warnings = validateSpray(db, b, sprayId)
    if (warnings.some((w) => w.level === 'error') && !c.query.force)
      throw Object.assign(new HttpError(422, 'A permetezés növényvédelmi ellenőrzésen elbukott.'), { warnings })
    return { spray: repo.saveSpray(db, b, sprayId), warnings }
  }
  add('POST', '/sprays', (c) => saveSpray(c), 201)
  add('PUT', '/sprays/:id', (c) => {
    found(repo.getSpray(db, idOf(c)))
    return saveSpray(c, idOf(c))
  })
  add('DELETE', '/sprays/:id', (c) => ({ ok: found(repo.deleteSpray(db, idOf(c))) }))

  // Áttekintés
  const year = (c: Ctx) => Number(c.query.year ?? new Date().getFullYear())
  add('GET', '/dashboard', (c) => dashboard(db, year(c)))
  add('GET', '/parcel-status', (c) => parcelStatuses(db, year(c)))

  // Beállítások + mentés
  add('GET', '/settings', () => repo.getSettings(db))
  add('PUT', '/settings', (c) => {
    repo.setSettings(db, z.record(z.string(), z.string()).parse(c.body))
    return repo.getSettings(db)
  })
  add('GET', '/backup', () => ({
    version: 1,
    exported_at: new Date().toISOString(),
    ...Object.fromEntries(BACKUP_TABLES.map((t) => [t, db.prepare(`SELECT * FROM ${t}`).all()])),
  }))

  // NÉBIH
  add('GET', '/nebih/status', (c) => nebih.status(c.query.force === '1'))
  add('GET', '/nebih/search', (c) => {
    const q = String(c.query.q ?? '').trim()
    if (q.length < 2) throw new HttpError(400, 'Legalább 2 karakter szükséges.')
    return nebih.search(q)
  })
  add('POST', '/nebih/import', (c) => {
    const b = z.object({ query: z.string().min(2), index: z.coerce.number().int().min(0), name: z.string().min(1) }).parse(c.body)
    return nebih.importHit(db, b)
  })
  add('POST', '/nebih/resync', () => nebih.resyncAll(db))

  return R
}

/** Útvonal-illesztés: '/parcels/:id' ↔ '/parcels/12' */
export function matchRoute(routes: Route[], method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const parts = path.split('/').filter(Boolean)
  for (const route of routes) {
    if (route.method !== method) continue
    const rp = route.path.split('/').filter(Boolean)
    if (rp.length !== parts.length) continue
    const params: Record<string, string> = {}
    if (rp.every((seg, i) => (seg.startsWith(':') ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i]))) return { route, params }
  }
  return null
}

/** Hiba → HTTP válasz (mindkét futtatókörnyezetben azonos). */
export function errorResponse(err: any): { status: number; body: { error: string; warnings?: unknown } } {
  if (err instanceof z.ZodError) return { status: 400, body: { error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') } }
  if (err instanceof HttpError) return { status: err.status, body: { error: err.message, warnings: (err as any).warnings } }
  if (err?.name === 'NebihError') return { status: 502, body: { error: err.message } }
  return { status: 500, body: { error: err?.message ?? 'Szerverhiba' } }
}
