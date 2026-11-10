/**
 * NÉBIH Növényvédő szer Engedélykereső kliens.
 * https://novenyvedoszer.nebih.gov.hu/Engedelykereso/kereso (felülírható: NEBIH_BASE_URL)
 *
 * Az oldal ASP.NET WebForms: minden lekérés ugyanarra az URL-re megy, a ViewState-et és a
 * munkamenet-sütit vinni kell. Az adatlaphoz előbb a keresést kell lefuttatni, majd a
 * találati sor indexével „kiválasztani” (Select$N).
 *
 * Proxy mögött a Node beépített fetch-je csak NODE_USE_ENV_PROXY=1 mellett használja a
 * HTTPS_PROXY-t (Node ≥ 22.21) — az npm scriptek ezt beállítják.
 */
import type { Db } from '../db.ts'
import { saveProduct } from '../repo.ts'
import type { NebihSearchHit, NebihStatus, Product } from '../../shared/types.ts'
import { FIELD, formFields, parsePermit, parseSearchResults, type ParsedPermit, type SearchPage } from './parser.ts'

export const NEBIH_BASE = (process.env.NEBIH_BASE_URL ?? 'https://novenyvedoszer.nebih.gov.hu').replace(/\/$/, '')
export const SEARCH_URL = `${NEBIH_BASE}/Engedelykereso/kereso`
const UA = 'Mozilla/5.0 (compatible; Szolonaplo/0.2)'
const TIMEOUT_MS = 30_000

export class NebihError extends Error {}

/** Egy NÉBIH-munkamenet: sütik + az utolsó lap (ViewState) megőrzése. */
class Session {
  private cookies = new Map<string, string>()
  private page: string | null = null

  private async request(init: RequestInit = {}): Promise<string> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(SEARCH_URL, {
        ...init,
        signal: ctrl.signal,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'hu-HU,hu;q=0.9',
          Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
          ...(init.headers ?? {}),
        },
      })
      for (const line of res.headers.getSetCookie?.() ?? []) {
        const [pair] = line.split(';')
        const i = pair.indexOf('=')
        if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
      }
      if (!res.ok) throw new NebihError(`NÉBIH HTTP ${res.status}`)
      this.page = await res.text()
      return this.page
    } catch (e: any) {
      if (e instanceof NebihError) throw e
      throw new NebihError(`A NÉBIH oldal nem érhető el: ${e?.cause?.code ?? e?.name ?? e?.message ?? e}`)
    } finally {
      clearTimeout(t)
    }
  }

  private postback(target: string, argument: string, extra: Record<string, string> = {}) {
    if (!this.page) throw new NebihError('Nincs betöltött NÉBIH lap.')
    const body = new URLSearchParams({ ...formFields(this.page), ...extra, __EVENTTARGET: target, __EVENTARGUMENT: argument })
    return this.request({ method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: SEARCH_URL } })
  }

  async search(query: string): Promise<SearchPage> {
    await this.request()
    const html = await this.postback(FIELD.searchTarget, '', { [FIELD.query]: query })
    return parseSearchResults(html, query)
  }

  async select(index: number) {
    const html = await this.postback(FIELD.gridTarget, `Select$${index}`)
    const p = parsePermit(html)
    if (!p) throw new NebihError('A NÉBIH adatlap nem dolgozható fel (változott az oldal szerkezete?).')
    return p
  }
}

let lastStatus: NebihStatus | null = null

export async function status(force = false): Promise<NebihStatus> {
  if (!force && lastStatus && Date.now() - Date.parse(lastStatus.checked_at) < 60_000) return lastStatus
  const st: NebihStatus = { base_url: SEARCH_URL, reachable: false, http_status: null, error: null, checked_at: new Date().toISOString() }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(SEARCH_URL, { signal: ctrl.signal, headers: { 'User-Agent': UA } })
    clearTimeout(t)
    st.http_status = res.status
    st.reachable = res.ok
    if (!res.ok) st.error = `HTTP ${res.status}`
  } catch (e: any) {
    st.error = String(e?.cause?.code ?? e?.name ?? e?.message ?? e)
  }
  lastStatus = st
  return st
}

/** Keresés szernévre (első találati lap, max. 50 sor). */
export async function search(query: string): Promise<SearchPage> {
  return new Session().search(query)
}

/** Egy találat adatlapjának letöltése és mentése a helyi szeradatbázisba. */
export async function importHit(db: Db, hit: Pick<NebihSearchHit, 'query' | 'index' | 'name'>): Promise<Product> {
  const s = new Session()
  const page = await s.search(hit.query)
  const row = page.hits.find((h) => h.index === hit.index)
  if (!row || row.name !== hit.name)
    throw new NebihError(`A találati lista megváltozott („${hit.name}” nem található a ${hit.index}. helyen) — keressen újra.`)
  return savePermit(db, await s.select(hit.index))
}

/** Egy feldolgozott adatlap mentése/frissítése. */
export function savePermit(db: Db, p: ParsedPermit): Product {
  const nebih_id = p.permit_number ?? `${p.name}|${p.permit_valid_until}`
  const existing = db.prepare('SELECT id FROM products WHERE nebih_id = ?').get(nebih_id) as { id: number } | undefined
  const today = new Date().toISOString().slice(0, 10)
  const deadline = p.use_until ?? p.permit_valid_until
  return saveProduct(
    db,
    {
      name: p.name,
      permit_number: p.permit_number,
      holder: p.holder,
      formulation: p.formulation,
      category: p.category,
      active_substances: p.active_substances,
      permit_valid_until: p.permit_valid_until,
      use_until: p.use_until,
      status: deadline && deadline < today ? 'nem felhasználható' : 'engedélyezett',
      source: 'nebih',
      nebih_id,
      nebih_url: p.documents.at(-1)?.url ?? null,
      synced_at: new Date().toISOString(),
      extra: {
        permit_type: p.permit_type, purpose: p.purpose, issued_at: p.issued_at, sale_until: p.sale_until,
        cultures: p.cultures, pests: p.pests, phi_min: p.phi_min, phi_max: p.phi_max,
        aerial: p.aerial, drone: p.drone, organic: p.organic, bee_hazard: p.bee_hazard, documents: p.documents,
      },
      // A meglévő, kézzel kiegészített dózis/kezelésszám adatokat megtartjuk
      uses: mergeUses(existing ? (db.prepare('SELECT * FROM product_uses WHERE product_id = ?').all(existing.id) as any[]) : [], p.uses),
      ...(existing ? {} : { unit: /kg/.test(p.uses[0]?.dose_unit ?? '') ? 'kg' : 'l' }),
    },
    existing?.id,
  )
}

/** A NÉBIH kultúralistáját frissíti, de a felhasználó által a PDF-ből beírt dózisokat megőrzi. */
function mergeUses(old: any[], fresh: Product['uses']): Product['uses'] {
  return fresh.map((u) => {
    const o = old.find((x) => x.culture === u.culture)
    return o
      ? { ...u, dose_min: o.dose_min ?? null, dose_max: o.dose_max ?? null, dose_unit: o.dose_unit ?? u.dose_unit, rei_days: o.rei_days ?? null, max_treatments: o.max_treatments ?? null }
      : u
  })
}

/** Az összes NÉBIH-ből importált szer frissítése (soros, udvarias lekérésekkel). */
export async function resyncAll(db: Db, onProgress?: (done: number, total: number, name: string) => void) {
  const rows = db.prepare(`SELECT id, name, permit_number FROM products WHERE source = 'nebih'`).all() as any[]
  const result = { ok: 0, failed: [] as { name: string; error: string }[] }
  for (const [i, r] of rows.entries()) {
    try {
      const candidates = (await search(r.name)).hits.filter((h) => h.name === r.name)
      let done = false
      for (const h of candidates) {
        // több azonos nevű engedély is lehet (pl. lejárt + új) — az engedélyszám dönt
        const s = new Session()
        await s.search(r.name)
        const p = await s.select(h.index)
        if (!r.permit_number || p.permit_number === r.permit_number) {
          savePermit(db, p)
          done = true
          break
        }
      }
      if (!done) throw new NebihError('Nem található a NÉBIH-ben ezzel az engedélyszámmal.')
      result.ok++
    } catch (e: any) {
      result.failed.push({ name: r.name, error: e.message })
    }
    onProgress?.(i + 1, rows.length, r.name)
    await new Promise((res) => setTimeout(res, 750))
  }
  return result
}
