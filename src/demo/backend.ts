// Böngészős „szerver” a GitHub Pages demóhoz: ugyanaz az útvonaltábla és üzleti logika, mint a
// Node szerveren (server/routes.ts), csak az adatbázis sql.js, és localStorage-ban marad meg.
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { migrate } from '../../server/schema'
import { buildRoutes, errorResponse, matchRoute, type NebihApi, type Route } from '../../server/routes'
import { HttpError, addStock, saveProduct } from '../../server/repo'
import { seed } from '../../server/seed'
import { seedVarieties } from '../../server/seed-varieties'
import nebihSnapshot from './nebih-products.json'
import { wrapSqlJs } from './sqljs-db'
import type { Product } from '../../shared/types'

const KEY = 'szoloink-demo-db-v2'
const NEBIH_URL = 'https://novenyvedoszer.nebih.gov.hu/Engedelykereso/kereso'
const OFFLINE = 'A böngészős demóban az élő NÉBIH-keresés nem elérhető (a NÉBIH oldala nem engedi a böngészőből való lekérést). A szerveres változatban működik — a demó 14 előre importált, valós NÉBIH-szert tartalmaz.'

const nebihStub: NebihApi = {
  status: async () => ({ base_url: NEBIH_URL, reachable: false, http_status: null, error: 'böngészős demó — előre importált adatok', checked_at: new Date().toISOString() }),
  search: async () => { throw new HttpError(503, OFFLINE) },
  importHit: async () => { throw new HttpError(503, OFFLINE) },
  resyncAll: async () => { throw new HttpError(503, OFFLINE) },
}

const b64 = {
  enc: (u8: Uint8Array) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) },
  dec: (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
}

let state: Promise<{ routes: Route[]; save: () => void }> | null = null

async function init() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  let saved: string | null = null
  try { saved = localStorage.getItem(KEY) } catch {}
  let sdb
  try { sdb = saved ? new SQL.Database(b64.dec(saved)) : new SQL.Database() } catch { sdb = new SQL.Database() }
  const db = wrapSqlJs(sdb)
  db.exec('PRAGMA foreign_keys = ON;')
  migrate(db)
  const fresh = !(db.prepare('SELECT COUNT(*) c FROM parcels').get() as any)?.c
  if (fresh) {
    seedVarieties(db)
    seed(db)
    const y = new Date().getFullYear()
    for (const p of nebihSnapshot as unknown as Partial<Product>[]) {
      const saved = saveProduct(db, p)
      addStock(db, saved.id, saved.unit === 'kg' ? 10 : 5, `${y}-04-10`, 'Nyitókészlet (demó)')
    }
  }
  const save = () => {
    try { localStorage.setItem(KEY, b64.enc(sdb.export())) } catch {}
  }
  if (fresh) save()
  return { routes: buildRoutes(db, nebihStub), save }
}

/** Az /api/* kérések kiszolgálása a böngészőben. */
export async function demoRequest(method: string, url: string, body: unknown): Promise<{ status: number; body: any }> {
  state ??= init()
  const { routes, save } = await state
  const u = new URL(url, 'http://demo')
  const m = matchRoute(routes, method, u.pathname)
  if (!m) return { status: 404, body: { error: `Ismeretlen végpont: ${method} ${u.pathname}` } }
  try {
    const out = await m.route.handler({ params: m.params, query: Object.fromEntries(u.searchParams), body })
    if (method !== 'GET') save()
    return { status: m.route.status ?? 200, body: out ?? { ok: true } }
  } catch (e) {
    return errorResponse(e)
  }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY) } catch {}
  location.reload()
}
