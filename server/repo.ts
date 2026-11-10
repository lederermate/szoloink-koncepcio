import type { Db } from './schema.ts'
import type {
  CollectionItem,
  GrapeList,
  GrapeListItem,
  Harvest,
  Parcel,
  Product,
  ProductUse,
  Spray,
  SprayItem,
  SprayParcel,
  WorkEntry,
} from '../shared/types.ts'

type Row = Record<string, any>

// ---------- Ültetvények ----------
export const PARCEL_FIELDS = [
  'name', 'hrsz', 'location', 'area_ha', 'plantings', 'variety', 'rootstock', 'planted_year',
  'row_spacing_m', 'vine_spacing_m', 'vine_count', 'training_system', 'color', 'notes',
] as const

export const WORK_FIELDS = ['parcel_id', 'date', 'type', 'hours', 'workers', 'cost_huf', 'notes'] as const
export const HARVEST_FIELDS = ['parcel_id', 'date', 'variety', 'quantity_kg', 'must_degree', 'buyer', 'notes'] as const

/** Egyszerű CRUD a lapos táblákhoz. */
export function crud<T>(db: Db, table: string, fields: readonly string[], orderBy = 'id DESC') {
  return {
    list: (where = '', params: any[] = []): T[] =>
      db.prepare(`SELECT * FROM ${table} ${where} ORDER BY ${orderBy}`).all(...params) as T[],
    get: (id: number): T | undefined => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T | undefined,
    create(data: Row): T {
      const cols = fields.filter((f) => data[f] !== undefined)
      const r = db
        .prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
        .run(...cols.map((c) => data[c] ?? null))
      return this.get(Number(r.lastInsertRowid))!
    },
    update(id: number, data: Row): T | undefined {
      const cols = fields.filter((f) => data[f] !== undefined)
      if (cols.length)
        db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(
          ...cols.map((c) => data[c] ?? null),
          id,
        )
      return this.get(id)
    },
    remove: (id: number) => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0,
  }
}

const uniq = <T>(a: T[]) => [...new Set(a)]

/** Fajtablokkok → összegző oszlopok (variety, alany, telepítés, tőkeszám), hogy a listák/nyomtatás egyszerűek maradjanak. */
function normParcel(data: Row): Row {
  if (!Array.isArray(data.plantings)) {
    // Régi, egyfajtás formátum → egy fajtablokk
    if (data.variety === undefined) return data
    data = { ...data, plantings: data.variety ? [{ variety: data.variety, rootstock: data.rootstock ?? null, planted_year: data.planted_year ?? null, vine_count: data.vine_count ?? null, rows: null, notes: null }] : [] }
  }
  const pl = (data.plantings as Row[]).filter((x) => x.variety?.trim())
  const counts = pl.map((x) => x.vine_count)
  const years = pl.map((x) => x.planted_year).filter((x): x is number => x != null)
  return {
    ...data,
    plantings: JSON.stringify(pl),
    variety: pl.length ? uniq(pl.map((x) => x.variety.trim())).join(', ') : null,
    rootstock: uniq(pl.map((x) => x.rootstock).filter(Boolean)).join(', ') || null,
    planted_year: years.length ? Math.min(...years) : null,
    vine_count: pl.length && counts.every((c) => c != null) ? counts.reduce((a, b) => a + b, 0) : (data.vine_count ?? null),
  }
}

function hydrateParcel(row: Row): Parcel {
  let plantings = JSON.parse(row.plantings || '[]')
  if (!plantings.length && row.variety)
    plantings = [{ variety: row.variety, rootstock: row.rootstock, planted_year: row.planted_year, vine_count: row.vine_count, rows: null, notes: null }]
  return { ...(row as Parcel), plantings }
}

export function parcels(db: Db) {
  const c = crud<Row>(db, 'parcels', PARCEL_FIELDS, 'name COLLATE NOCASE')
  return {
    list: (where = '', params: any[] = []) => c.list(where, params).map(hydrateParcel),
    get: (id: number) => {
      const r = c.get(id)
      return r && hydrateParcel(r)
    },
    create: (data: Row) => hydrateParcel(c.create(normParcel(data))),
    update: (id: number, data: Row) => {
      const r = c.update(id, normParcel(data))
      return r && hydrateParcel(r)
    },
    remove: c.remove,
  }
}

// ---------- Szőlőim (fajtagyűjtemény) és Listáim ----------
export const listCollection = (db: Db): CollectionItem[] =>
  db.prepare('SELECT variety_id, note, added_at FROM my_varieties ORDER BY added_at DESC').all() as CollectionItem[]

export function setCollectionItem(db: Db, variety_id: number, note: string | null) {
  if (!db.prepare('SELECT 1 FROM varieties WHERE id = ?').get(variety_id)) throw new HttpError(404, 'Ismeretlen fajta')
  db.prepare('INSERT INTO my_varieties (variety_id, note) VALUES (?, ?) ON CONFLICT(variety_id) DO UPDATE SET note = excluded.note').run(variety_id, note)
  return listCollection(db)
}
export const removeCollectionItem = (db: Db, variety_id: number) => {
  db.prepare('DELETE FROM my_varieties WHERE variety_id = ?').run(variety_id)
  return listCollection(db)
}

function hydrateList(db: Db, row: Row): GrapeList {
  const items = db.prepare('SELECT variety_id, note FROM grape_list_items WHERE list_id = ? ORDER BY position, rowid').all(row.id) as GrapeListItem[]
  return { ...(row as GrapeList), public: !!row.public, items }
}
export const listLists = (db: Db) => (db.prepare('SELECT * FROM grape_lists ORDER BY created_at DESC, id DESC').all() as Row[]).map((r) => hydrateList(db, r))
export function getList(db: Db, id: number) {
  const r = db.prepare('SELECT * FROM grape_lists WHERE id = ?').get(id) as Row | undefined
  return r && hydrateList(db, r)
}
export function saveList(db: Db, data: { name?: string; description?: string | null; public?: boolean; items?: GrapeListItem[] }, id?: number): GrapeList {
  if (id == null) {
    const r = db.prepare('INSERT INTO grape_lists (name, description, public) VALUES (?, ?, ?)').run(data.name ?? 'Új lista', data.description ?? null, data.public ? 1 : 0)
    id = Number(r.lastInsertRowid)
  } else {
    if (!getList(db, id)) throw new HttpError(404, 'Nem található')
    for (const k of ['name', 'description', 'public'] as const)
      if (data[k] !== undefined) db.prepare(`UPDATE grape_lists SET ${k} = ? WHERE id = ?`).run(k === 'public' ? (data.public ? 1 : 0) : data[k], id)
  }
  if (data.items) {
    db.prepare('DELETE FROM grape_list_items WHERE list_id = ?').run(id)
    const ins = db.prepare('INSERT OR IGNORE INTO grape_list_items (list_id, variety_id, note, position) VALUES (?, ?, ?, ?)')
    data.items.forEach((it, i) => ins.run(id, it.variety_id, it.note ?? null, i))
  }
  return getList(db, id)!
}
export function setListItem(db: Db, id: number, variety_id: number, note: string | null) {
  if (!getList(db, id)) throw new HttpError(404, 'Nem található')
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 p FROM grape_list_items WHERE list_id = ?').get(id) as Row
  db.prepare('INSERT INTO grape_list_items (list_id, variety_id, note, position) VALUES (?, ?, ?, ?) ON CONFLICT(list_id, variety_id) DO UPDATE SET note = excluded.note').run(id, variety_id, note, Number(pos.p))
  return getList(db, id)!
}
export function removeListItem(db: Db, id: number, variety_id: number) {
  db.prepare('DELETE FROM grape_list_items WHERE list_id = ? AND variety_id = ?').run(id, variety_id)
  return found404(getList(db, id))
}
const found404 = <T>(x: T | undefined) => {
  if (!x) throw new HttpError(404, 'Nem található')
  return x
}
export const work = (db: Db) => crud<WorkEntry>(db, 'work_entries', WORK_FIELDS, 'date DESC, id DESC')
export const harvests = (db: Db) => crud<Harvest>(db, 'harvests', HARVEST_FIELDS, 'date DESC, id DESC')

// ---------- Szerek ----------
const PRODUCT_FIELDS = [
  'name', 'permit_number', 'holder', 'formulation', 'category', 'active_substances',
  'permit_valid_until', 'use_until', 'status', 'source', 'nebih_id', 'nebih_url', 'synced_at', 'unit', 'extra',
] as const
const USE_FIELDS = [
  'culture', 'pest', 'dose_min', 'dose_max', 'dose_unit', 'phi_days', 'rei_days', 'max_treatments', 'notes',
] as const

function hydrateProduct(db: Db, row: Row): Product {
  const uses = db.prepare('SELECT * FROM product_uses WHERE product_id = ? ORDER BY culture, pest').all(row.id) as unknown as ProductUse[]
  const stock = db.prepare('SELECT COALESCE(SUM(quantity),0) s FROM stock_movements WHERE product_id = ?').get(row.id) as Row
  return {
    ...(row as Product),
    active_substances: JSON.parse(row.active_substances || '[]'),
    extra: JSON.parse(row.extra || '{}'),
    stock: Math.round(Number(stock.s) * 1000) / 1000,
    uses,
  }
}

export function listProducts(db: Db, q?: string): Product[] {
  const rows = q
    ? db
        .prepare(
          `SELECT * FROM products WHERE name LIKE ? OR permit_number LIKE ? OR active_substances LIKE ? ORDER BY name COLLATE NOCASE`,
        )
        .all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE').all()
  return rows.map((r) => hydrateProduct(db, r as Row))
}

export function getProduct(db: Db, id: number): Product | undefined {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Row | undefined
  return row ? hydrateProduct(db, row) : undefined
}

export function saveProduct(db: Db, data: Partial<Product>, id?: number): Product {
  const values: Row = { ...data }
  if (data.active_substances) values.active_substances = JSON.stringify(data.active_substances)
  if (data.extra) values.extra = JSON.stringify(data.extra)
  const cols = PRODUCT_FIELDS.filter((f) => values[f] !== undefined)
  db.exec('BEGIN')
  try {
    if (id) {
      if (cols.length)
        db.prepare(`UPDATE products SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(
          ...cols.map((c) => values[c] ?? null),
          id,
        )
    } else {
      const r = db
        .prepare(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
        .run(...cols.map((c) => values[c] ?? null))
      id = Number(r.lastInsertRowid)
    }
    if (data.uses) {
      db.prepare('DELETE FROM product_uses WHERE product_id = ?').run(id)
      const ins = db.prepare(
        `INSERT INTO product_uses (product_id, ${USE_FIELDS.join(',')}) VALUES (?, ${USE_FIELDS.map(() => '?').join(',')})`,
      )
      for (const u of data.uses) ins.run(id, ...USE_FIELDS.map((f) => (u as Row)[f] ?? null))
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return getProduct(db, id!)!
}

export function deleteProduct(db: Db, id: number): boolean {
  const used = db.prepare('SELECT COUNT(*) c FROM spray_items WHERE product_id = ?').get(id) as Row
  if (Number(used.c) > 0) throw new HttpError(409, 'A szer szerepel a permetezési naplóban, nem törölhető.')
  return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0
}

export function addStock(db: Db, product_id: number, quantity: number, date: string, note: string | null) {
  db.prepare('INSERT INTO stock_movements (product_id, date, quantity, note) VALUES (?,?,?,?)').run(
    product_id, date, quantity, note,
  )
}

export function stockMovements(db: Db, product_id?: number) {
  return db
    .prepare(
      `SELECT m.*, p.name product_name, p.unit FROM stock_movements m JOIN products p ON p.id = m.product_id
       ${product_id ? 'WHERE m.product_id = ?' : ''} ORDER BY m.date DESC, m.id DESC LIMIT 500`,
    )
    .all(...(product_id ? [product_id] : []))
}

// ---------- Permetezések ----------
const SPRAY_FIELDS = [
  'date', 'start_time', 'end_time', 'operator_name', 'operator_license', 'machine',
  'water_l_per_ha', 'temperature_c', 'wind', 'phenology', 'notes',
] as const

function hydrateSpray(db: Db, row: Row): Spray {
  return {
    ...(row as Spray),
    parcels: db.prepare('SELECT parcel_id, treated_area_ha FROM spray_parcels WHERE spray_id = ?').all(row.id) as unknown as SprayParcel[],
    items: db
      .prepare('SELECT product_id, pest, dose, dose_unit, total_amount FROM spray_items WHERE spray_id = ? ORDER BY id')
      .all(row.id) as unknown as SprayItem[],
  }
}

export function listSprays(db: Db, opts: { year?: number; parcel_id?: number } = {}): Spray[] {
  const where: string[] = []
  const params: any[] = []
  if (opts.year) {
    where.push(`substr(s.date,1,4) = ?`)
    params.push(String(opts.year))
  }
  if (opts.parcel_id) {
    where.push(`EXISTS (SELECT 1 FROM spray_parcels sp WHERE sp.spray_id = s.id AND sp.parcel_id = ?)`)
    params.push(opts.parcel_id)
  }
  const rows = db
    .prepare(`SELECT s.* FROM sprays s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.date DESC, s.id DESC`)
    .all(...params)
  return rows.map((r) => hydrateSpray(db, r as Row))
}

export function getSpray(db: Db, id: number): Spray | undefined {
  const row = db.prepare('SELECT * FROM sprays WHERE id = ?').get(id) as Row | undefined
  return row ? hydrateSpray(db, row) : undefined
}

export type SprayInput = Omit<Spray, 'id'>

export function saveSpray(db: Db, data: SprayInput, id?: number): Spray {
  db.exec('BEGIN')
  try {
    const values = data as unknown as Row
    if (id) {
      db.prepare(`UPDATE sprays SET ${SPRAY_FIELDS.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(
        ...SPRAY_FIELDS.map((c) => values[c] ?? null),
        id,
      )
      db.prepare('DELETE FROM spray_parcels WHERE spray_id = ?').run(id)
      db.prepare('DELETE FROM spray_items WHERE spray_id = ?').run(id)
      db.prepare('DELETE FROM stock_movements WHERE spray_id = ?').run(id)
    } else {
      const r = db
        .prepare(`INSERT INTO sprays (${SPRAY_FIELDS.join(',')}) VALUES (${SPRAY_FIELDS.map(() => '?').join(',')})`)
        .run(...SPRAY_FIELDS.map((c) => values[c] ?? null))
      id = Number(r.lastInsertRowid)
    }
    const insP = db.prepare('INSERT INTO spray_parcels (spray_id, parcel_id, treated_area_ha) VALUES (?,?,?)')
    for (const p of data.parcels) insP.run(id, p.parcel_id, p.treated_area_ha)
    const insI = db.prepare(
      'INSERT INTO spray_items (spray_id, product_id, pest, dose, dose_unit, total_amount) VALUES (?,?,?,?,?,?)',
    )
    // Készletből automatikus levonás
    const insM = db.prepare('INSERT INTO stock_movements (product_id, date, quantity, note, spray_id) VALUES (?,?,?,?,?)')
    for (const it of data.items) {
      insI.run(id, it.product_id, it.pest, it.dose, it.dose_unit, it.total_amount)
      insM.run(it.product_id, data.date, -Math.abs(it.total_amount), 'Permetezés', id)
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return getSpray(db, id!)!
}

export function deleteSpray(db: Db, id: number) {
  return db.prepare('DELETE FROM sprays WHERE id = ?').run(id).changes > 0
}

// ---------- Beállítások ----------
export function getSettings(db: Db): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Row[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}
export function setSettings(db: Db, values: Record<string, string>) {
  const st = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const [k, v] of Object.entries(values)) st.run(k, v)
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
