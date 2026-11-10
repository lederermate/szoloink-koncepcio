/**
 * NÉBIH Növényvédő szer Engedélykereső – HTML-feldolgozó.
 *
 * Az oldal ASP.NET WebForms alkalmazás (https://novenyvedoszer.nebih.gov.hu/Engedelykereso/kereso):
 *  - keresés: POST postback, __EVENTTARGET = ctl00$ContentPlaceHolder1$KeresesButton,
 *    szernév mező: ctl00$ContentPlaceHolder1$SzernevTextControl
 *  - találatok: #ContentPlaceHolder1_NovszerGridView (tr.gridRow / tr.gridRowAlternate), 50 / lap
 *  - adatlap („törzskönyv”): ugyanazon a lapon postback, __EVENTARGUMENT = Select$<sorindex>,
 *    mezők: #ContentPlaceHolder1_InfoNovszerControl_*Div
 *
 * A törzskönyv a kultúrák és károsítók LISTÁJÁT adja, az ÉVI-t összesítve (pl. „3 - 28 nap”);
 * a kultúránkénti dózis és kezelésszám csak az engedélyokirat PDF-ben szerepel.
 * Valós mintákon tesztelve: tests/fixtures/nebih-*.html
 */
import * as cheerio from 'cheerio'
import type { ActiveSubstance, NebihDocument, NebihSearchHit, ProductUse } from '../../shared/types.ts'

export const FIELD = {
  query: 'ctl00$ContentPlaceHolder1$SzernevTextControl',
  searchTarget: 'ctl00$ContentPlaceHolder1$KeresesButton',
  gridTarget: 'ctl00$ContentPlaceHolder1$NovszerGridView',
}

const clean = (s: string | undefined | null) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/** „2027.07.31” → „2027-07-31” */
export function huDate(s: string | null | undefined): string | null {
  const m = clean(s).match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

/** Az ASP.NET űrlap összes beküldendő mezője (ViewState, EventValidation, szűrők alapértékei). */
export function formFields(html: string): Record<string, string> {
  const $ = cheerio.load(html)
  const f: Record<string, string> = {}
  $('#form1 input, #form1 select, #form1 textarea').each((_, el) => {
    const e = $(el)
    const name = e.attr('name')
    const type = (e.attr('type') ?? 'text').toLowerCase()
    if (!name || ['submit', 'button', 'image', 'reset', 'file'].includes(type)) return
    if ((type === 'checkbox' || type === 'radio') && e.attr('checked') === undefined) return
    f[name] = el.tagName === 'select' ? e.find('option[selected]').attr('value') ?? '' : e.attr('value') ?? ''
  })
  return f
}

export interface SearchPage {
  hits: NebihSearchHit[]
  has_more: boolean
}

export function parseSearchResults(html: string, query: string): SearchPage {
  const $ = cheerio.load(html)
  const grid = $('#ContentPlaceHolder1_NovszerGridView')
  const hits = grid
    .find('tr.gridRow, tr.gridRowAlternate')
    .toArray()
    .map((tr) => {
      const cells = $(tr).children('td').toArray()
      const href = $(cells[0]).find('a').attr('href') ?? ''
      const idx = href.match(/Select\$(\d+)/)?.[1]
      const t = (i: number) => clean($(cells[i]).text()) || null
      if (idx == null || !t(1)) return null
      const valid = huDate(t(5))
      const ecoTitle = $(cells[10]).find('[title]').attr('title') ?? ''
      return {
        query,
        index: Number(idx),
        name: t(1)!,
        active_substances: t(2),
        permit_type: t(3),
        purpose: t(4),
        valid_until: valid,
        expired: /már nem felhasználható/i.test(ecoTitle) || (valid ? valid < new Date().toISOString().slice(0, 10) : false),
        eco: /^felhasználható/i.test(ecoTitle.trim()),
      } satisfies NebihSearchHit
    })
    .filter((x): x is NebihSearchHit => !!x)
  return { hits, has_more: grid.find('a[href*="Page$"]').length > 0 }
}

export interface ParsedPermit {
  name: string
  permit_number: string | null
  permit_type: string | null
  holder: string | null
  purpose: string | null
  formulation: string | null
  category: string | null
  permit_valid_until: string | null
  issued_at: string | null
  use_until: string | null // felhasználási idő lejárata
  sale_until: string | null // türelmi idő kis-/nagyker
  active_substances: ActiveSubstance[]
  cultures: string[]
  pests: string[]
  phi_min: number | null
  phi_max: number | null
  aerial: boolean | null
  drone: boolean | null
  organic: string | null
  bee_hazard: string | null
  documents: NebihDocument[]
  uses: ProductUse[]
}

/** Vesszővel tagolt lista szétszedése, a zárójelen belüli vesszők megtartásával. */
export function splitList(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  // A NÉBIH adatban előfordul be nem zárt zárójel — ilyenkor egyszerű vesszős bontás
  if (depth > 0) return s.split(',').map((x) => x.trim()).filter(Boolean)
  return out
}

/** „Alma - ULT01” → „Alma” (a kultúrakód elhagyása) */
const stripCode = (s: string) => s.replace(/\s+-\s+[A-Z]{3}\d{2}$/, '').trim()

/** „0 nap” → [0,0]; „3 - 28 nap” → [3,28] */
export function parsePhi(s: string): [number | null, number | null] {
  const nums = [...clean(s).matchAll(/\d+/g)].map((m) => Number(m[0]))
  if (!nums.length) return [null, null]
  return [Math.min(...nums), Math.max(...nums)]
}

const yesNo = (s: string) => (/^igen/i.test(s) ? true : /^nem/i.test(s) ? false : null)

export function parsePermit(html: string): ParsedPermit | null {
  const $ = cheerio.load(html)
  const id = (k: string) => clean($(`#ContentPlaceHolder1_InfoNovszerControl_${k}`).first().text()) || null
  const name = id('SzernevDiv')
  if (!name) return null

  const active_substances = $('#ContentPlaceHolder1_InfoNovszerControl_HatoanyagDiv tbody tr')
    .toArray()
    .map((tr) => {
      const c = $(tr).children('td').toArray().map((x) => clean($(x).text()))
      if (!c[0]) return null
      const amount = c[1] ? c[1].replace(/,?0+$/, '').replace(/,$/, '') : ''
      return { name: c[0], concentration: amount ? `${amount} ${c[2] ?? ''}`.trim() : null }
    })
    .filter((x): x is ActiveSubstance => !!x)

  const cultures = splitList(id('KulturaDiv') ?? '').map(stripCode)
  const pests = splitList(id('KarositoDiv') ?? '')
  const [phi_min, phi_max] = parsePhi(id('ElelmVarakozasDiv') ?? '')
  const documents = $('#ContentPlaceHolder1_InfoNovszerControl_OkiratDiv a[href]')
    .toArray()
    .map((a) => ({ name: clean($(a).text()), url: $(a).attr('href')! }))
    .filter((d) => d.name && /^https?:/.test(d.url))
  const phiNote =
    phi_min != null && phi_max != null && phi_min !== phi_max
      ? `ÉVI ${phi_min}–${phi_max} nap a NÉBIH adatlapon (kultúránként eltér); a felső értékkel számolunk — pontos érték az engedélyokiratban.`
      : null

  return {
    name,
    permit_number: id('EngszamDiv'),
    permit_type: id('EngTipusDiv'),
    holder: id('TulajdonosDiv'),
    purpose: id('RendeltetesDiv'),
    formulation: id('FormulacioDiv'),
    category: id('ForgKatDiv')?.match(/^(I{1,3})\.?/)?.[1].concat('.') ?? id('ForgKatDiv'),
    permit_valid_until: huDate(id('ErvenyessegDiv')),
    issued_at: huDate(id('KiadasDiv')),
    use_until: huDate(id('FelhIdoDiv')),
    sale_until: huDate(id('KisNagykerDiv')),
    active_substances,
    cultures,
    pests,
    phi_min,
    phi_max,
    aerial: yesNo(id('LegiSpan') ?? ''),
    drone: yesNo(id('DroneSpan') ?? ''),
    organic: id('OkoGazdalkodasDiv'),
    bee_hazard: id('MehveszelyessegDiv'),
    documents,
    uses: cultures.map((culture) => ({
      culture,
      pest: pests.join(', '),
      dose_min: null,
      dose_max: null,
      dose_unit: /granul|por|WG|WP|SG|GR/i.test(id('FormulacioDiv') ?? '') ? 'kg/ha' : 'l/ha',
      phi_days: phi_max,
      rei_days: null,
      max_treatments: null,
      notes: phiNote,
    })),
  }
}
