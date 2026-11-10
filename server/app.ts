import express, { type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Db } from './db.ts'
import * as repo from './repo.ts'
import { HttpError } from './repo.ts'
import { dashboard, parcelStatuses, validateSpray } from './logic.ts'
import * as nebih from './nebih/client.ts'

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
const ProductSchema = z.object({
  name: z.string().min(1, 'Név kötelező'),
  permit_number: optStr, holder: optStr, formulation: optStr, category: optStr,
  active_substances: z.array(z.object({ name: z.string(), concentration: optStr })).default([]),
  permit_valid_until: optStr, use_until: optStr, status: optStr,
  extra: z.record(z.string(), z.any()).optional(),
  source: z.enum(['nebih', 'manual', 'demo']).default('manual'),
  nebih_id: optStr, nebih_url: optStr,
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

const id = (req: Request) => {
  const n = Number(req.params.id)
  if (!Number.isInteger(n)) throw new HttpError(400, 'Hibás azonosító')
  return n
}
const found = <T>(x: T | undefined | false): T => {
  if (!x) throw new HttpError(404, 'Nem található')
  return x
}
const wrap = (fn: (req: Request, res: Response) => unknown) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const out = await fn(req, res)
    if (!res.headersSent) res.json(out ?? { ok: true })
  } catch (e) {
    next(e)
  }
}

export function createApp(db: Db) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  const r = express.Router()

  // Egyszerű CRUD erőforrások
  const resources = [
    ['parcels', repo.parcels(db), ParcelSchema],
    ['work', repo.work(db), WorkSchema],
    ['harvests', repo.harvests(db), HarvestSchema],
  ] as const
  for (const [name, store, schema] of resources) {
    r.get(`/${name}`, wrap((req) => {
      const pid = req.query.parcel_id ? Number(req.query.parcel_id) : null
      return pid && name !== 'parcels' ? store.list('WHERE parcel_id = ?', [pid]) : store.list()
    }))
    r.get(`/${name}/:id`, wrap((req) => found(store.get(id(req)))))
    r.post(`/${name}`, wrap((req, res) => res.status(201).json(store.create(schema.parse(req.body)))))
    r.put(`/${name}/:id`, wrap((req) => found(store.update(id(req), schema.partial().parse(req.body)))))
    r.delete(`/${name}/:id`, wrap((req) => ({ ok: found(store.remove(id(req))) })))
  }

  // Fajtakatalógus
  const VarietySchema = z.object({
    name: z.string().min(1, 'Név kötelező'), other_names: optStr,
    berry_color: z.enum(['fehér', 'rózsaszín', 'piros', 'kék']).default('fehér'),
    ripening_from: optNum, ripening_to: optNum,
    tags: z.array(z.string()).default([]), description: optStr,
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  })
  const hydrateVariety = (row: any) => row && { ...row, tags: JSON.parse(row.tags || '[]'), links: JSON.parse(row.links || '[]') }
  r.get('/varieties', wrap(() => (db.prepare('SELECT * FROM varieties ORDER BY name COLLATE NOCASE').all() as any[]).map(hydrateVariety)))
  r.get('/varieties/:id', wrap((req) => found(hydrateVariety(db.prepare('SELECT * FROM varieties WHERE id = ?').get(id(req))))))
  const saveVariety = (b: z.infer<typeof VarietySchema>, vid?: number) => {
    const vals = [b.name, b.other_names, b.berry_color, b.ripening_from, b.ripening_to, JSON.stringify(b.tags), b.description, JSON.stringify(b.links)]
    if (vid) db.prepare(`UPDATE varieties SET name=?, other_names=?, berry_color=?, ripening_from=?, ripening_to=?, tags=?, description=?, links=?, updated_at=datetime('now') WHERE id=?`).run(...vals, vid)
    else vid = Number(db.prepare('INSERT INTO varieties (name, other_names, berry_color, ripening_from, ripening_to, tags, description, links) VALUES (?,?,?,?,?,?,?,?)').run(...vals).lastInsertRowid)
    return hydrateVariety(db.prepare('SELECT * FROM varieties WHERE id = ?').get(vid))
  }
  r.post('/varieties', wrap((req, res) => res.status(201).json(saveVariety(VarietySchema.parse(req.body)))))
  r.put('/varieties/:id', wrap((req) => {
    found(db.prepare('SELECT id FROM varieties WHERE id = ?').get(id(req)))
    return saveVariety(VarietySchema.parse(req.body), id(req))
  }))
  r.delete('/varieties/:id', wrap((req) => ({ ok: found(db.prepare('DELETE FROM varieties WHERE id = ?').run(id(req)).changes > 0) })))

  // Szerek
  r.get('/products', wrap((req) => repo.listProducts(db, req.query.q ? String(req.query.q) : undefined)))
  r.get('/products/:id', wrap((req) => found(repo.getProduct(db, id(req)))))
  r.post('/products', wrap((req, res) => res.status(201).json(repo.saveProduct(db, ProductSchema.parse(req.body)))))
  r.put('/products/:id', wrap((req) => {
    found(repo.getProduct(db, id(req)))
    return repo.saveProduct(db, ProductSchema.partial().parse(req.body), id(req))
  }))
  r.delete('/products/:id', wrap((req) => ({ ok: found(repo.deleteProduct(db, id(req))) })))
  r.post('/products/import', wrap((req) => {
    const list = z.array(ProductSchema).parse(req.body)
    return { imported: list.map((p) => repo.saveProduct(db, p).id).length }
  }))
  r.delete('/demo-products', wrap(() => {
    const ids = (db.prepare(`SELECT id FROM products WHERE source = 'demo'`).all() as any[]).map((x) => x.id)
    let removed = 0
    for (const pid of ids) {
      try {
        repo.deleteProduct(db, pid)
        removed++
      } catch {}
    }
    return { removed, kept: ids.length - removed }
  }))

  // Készlet
  r.get('/stock', wrap((req) => repo.stockMovements(db, req.query.product_id ? Number(req.query.product_id) : undefined)))
  r.post('/stock', wrap((req) => {
    const b = z.object({ product_id: num.int(), quantity: num, date, note: optStr }).parse(req.body)
    found(repo.getProduct(db, b.product_id))
    repo.addStock(db, b.product_id, b.quantity, b.date, b.note)
    return repo.getProduct(db, b.product_id)
  }))

  // Permetezési napló
  r.get('/sprays', wrap((req) =>
    repo.listSprays(db, {
      year: req.query.year ? Number(req.query.year) : undefined,
      parcel_id: req.query.parcel_id ? Number(req.query.parcel_id) : undefined,
    }),
  ))
  r.get('/sprays/:id', wrap((req) => found(repo.getSpray(db, id(req)))))
  r.post('/sprays/validate', wrap((req) => {
    const b = SpraySchema.parse(req.body)
    return validateSpray(db, b, req.query.exclude ? Number(req.query.exclude) : undefined)
  }))
  const saveSpray = (req: Request, sprayId?: number) => {
    const b = SpraySchema.parse(req.body)
    const warnings = validateSpray(db, b, sprayId)
    const errors = warnings.filter((w) => w.level === 'error')
    if (errors.length && !req.query.force)
      throw Object.assign(new HttpError(422, 'A permetezés növényvédelmi ellenőrzésen elbukott.'), { warnings })
    return { spray: repo.saveSpray(db, b, sprayId), warnings }
  }
  r.post('/sprays', wrap((req, res) => res.status(201).json(saveSpray(req))))
  r.put('/sprays/:id', wrap((req) => {
    found(repo.getSpray(db, id(req)))
    return saveSpray(req, id(req))
  }))
  r.delete('/sprays/:id', wrap((req) => ({ ok: found(repo.deleteSpray(db, id(req))) })))

  // Áttekintés
  const year = (req: Request) => Number(req.query.year ?? new Date().getFullYear())
  r.get('/dashboard', wrap((req) => dashboard(db, year(req))))
  r.get('/parcel-status', wrap((req) => parcelStatuses(db, year(req))))

  // Beállítások + mentés
  r.get('/settings', wrap(() => repo.getSettings(db)))
  r.put('/settings', wrap((req) => {
    repo.setSettings(db, z.record(z.string(), z.string()).parse(req.body))
    return repo.getSettings(db)
  }))
  r.get('/backup', wrap((_req, res) => {
    const tables = ['parcels', 'work_entries', 'products', 'product_uses', 'stock_movements', 'sprays', 'spray_parcels', 'spray_items', 'harvests', 'settings']
    const dump = Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT * FROM ${t}`).all()]))
    res.setHeader('Content-Disposition', `attachment; filename="szolonaplo-mentes-${new Date().toISOString().slice(0, 10)}.json"`)
    res.json({ version: 1, exported_at: new Date().toISOString(), ...dump })
  }))

  // NÉBIH
  r.get('/nebih/status', wrap((req) => nebih.status(req.query.force === '1')))
  r.get('/nebih/search', wrap(async (req) => {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) throw new HttpError(400, 'Legalább 2 karakter szükséges.')
    return nebih.search(q)
  }))
  r.post('/nebih/import', wrap(async (req) => {
    const b = z.object({ query: z.string().min(2), index: z.coerce.number().int().min(0), name: z.string().min(1) }).parse(req.body)
    return nebih.importHit(db, b)
  }))
  r.post('/nebih/resync', wrap(() => nebih.resyncAll(db)))

  app.use('/api', r)

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, warnings: (err as any).warnings })
    if (err instanceof nebih.NebihError) return res.status(502).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: err?.message ?? 'Szerverhiba' })
  })
  return app
}
