/** Adatbázis-séma — futtatókörnyezet-független (node:sqlite a szerveren, sql.js a böngészős demóban). */

/** A node:sqlite DatabaseSync és a demó sql.js-adapter közös felülete. */
export interface Statement {
  all(...params: any[]): any[]
  get(...params: any[]): any
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint }
}
export interface Db {
  prepare(sql: string): Statement
  exec(sql: string): void
}

export function migrate(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS parcels (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      hrsz TEXT,
      location TEXT,
      area_ha REAL NOT NULL DEFAULT 0,
      variety TEXT,
      rootstock TEXT,
      planted_year INTEGER,
      row_spacing_m REAL,
      vine_spacing_m REAL,
      vine_count INTEGER,
      training_system TEXT,
      color TEXT NOT NULL DEFAULT '#65a30d',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_entries (
      id INTEGER PRIMARY KEY,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      hours REAL,
      workers INTEGER,
      cost_huf REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      permit_number TEXT,
      holder TEXT,
      formulation TEXT,
      category TEXT,
      active_substances TEXT NOT NULL DEFAULT '[]',
      permit_valid_until TEXT,
      status TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      nebih_id TEXT,
      nebih_url TEXT,
      synced_at TEXT,
      unit TEXT NOT NULL DEFAULT 'l'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS products_nebih ON products(nebih_id) WHERE nebih_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS product_uses (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      culture TEXT NOT NULL,
      pest TEXT NOT NULL,
      dose_min REAL,
      dose_max REAL,
      dose_unit TEXT NOT NULL DEFAULT 'l/ha',
      phi_days INTEGER,
      rei_days INTEGER,
      max_treatments INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      quantity REAL NOT NULL,
      note TEXT,
      spray_id INTEGER REFERENCES sprays(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sprays (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      operator_name TEXT,
      operator_license TEXT,
      machine TEXT,
      water_l_per_ha REAL,
      temperature_c REAL,
      wind TEXT,
      phenology TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS spray_parcels (
      spray_id INTEGER NOT NULL REFERENCES sprays(id) ON DELETE CASCADE,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      treated_area_ha REAL NOT NULL,
      PRIMARY KEY (spray_id, parcel_id)
    );

    CREATE TABLE IF NOT EXISTS spray_items (
      id INTEGER PRIMARY KEY,
      spray_id INTEGER NOT NULL REFERENCES sprays(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      pest TEXT NOT NULL,
      dose REAL NOT NULL,
      dose_unit TEXT NOT NULL,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS harvests (
      id INTEGER PRIMARY KEY,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      must_degree REAL,
      buyer TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS varieties (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      other_names TEXT,
      berry_color TEXT NOT NULL DEFAULT 'fehér',
      ripening_from INTEGER,
      ripening_to INTEGER,
      tags TEXT NOT NULL DEFAULT '[]',
      description TEXT,
      links TEXT NOT NULL DEFAULT '[]',
      popularity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS my_varieties (
      variety_id INTEGER PRIMARY KEY REFERENCES varieties(id) ON DELETE CASCADE,
      note TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grape_lists (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grape_list_items (
      list_id INTEGER NOT NULL REFERENCES grape_lists(id) ON DELETE CASCADE,
      variety_id INTEGER NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
      note TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (list_id, variety_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
  // Oszlopbővítések meglévő adatbázisokhoz
  const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name)
  const pc = cols('products')
  if (!pc.includes('use_until')) db.exec('ALTER TABLE products ADD COLUMN use_until TEXT')
  if (!pc.includes('extra')) db.exec(`ALTER TABLE products ADD COLUMN extra TEXT NOT NULL DEFAULT '{}'`)
  if (!cols('parcels').includes('plantings')) db.exec(`ALTER TABLE parcels ADD COLUMN plantings TEXT NOT NULL DEFAULT '[]'`)
  if (!cols('harvests').includes('variety')) db.exec('ALTER TABLE harvests ADD COLUMN variety TEXT')
}

