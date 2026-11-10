import { CloudOff, Database, ExternalLink, FlaskConical, Import, Pencil, Plus, RefreshCw, Search, Trash2, Upload, Wifi } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, useNebihSearch, useNebihStatus, useProducts, useSave } from '../lib/api'
import { DOSE_UNITS, PESTS } from '../lib/constants'
import { d, n } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Segmented, Spinner, cx } from '../components/ui'
import type { NebihSearchHit, Product, ProductUse } from '../../shared/types'

const GRAPE = /sz[őoö]l[őoö]/i
type Tab = 'local' | 'nebih'

export default function Products() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) ?? 'local'
  return (
    <>
      <PageHeader
        title="Szeradatbázis"
        subtitle="Növényvédő szerek engedélyadatokkal — a NÉBIH Engedélykeresőből szinkronizálva"
        actions={<Segmented<Tab> value={tab} onChange={(t) => setSp(t === 'local' ? {} : { tab: t })} options={[{ value: 'local', label: 'Saját adatbázis' }, { value: 'nebih', label: 'NÉBIH kereső' }]} />}
      />
      {tab === 'local' ? <LocalProducts /> : <NebihSearch />}
    </>
  )
}

function SourceBadge({ p }: { p: Product }) {
  if (p.source === 'nebih') return <Badge tone="blue"><Database className="size-3" />NÉBIH · {d(p.synced_at, 'yyyy.MM.dd.')}</Badge>
  if (p.source === 'demo') return <Badge tone="amber">DEMÓ – nem valós adat</Badge>
  return <Badge>Kézi rögzítés</Badge>
}

function LocalProducts() {
  const { data: products, isLoading } = useProducts()
  const [q, setQ] = useState('')
  const [onlyGrape, setOnlyGrape] = useState(false)
  const [view, setView] = useState<Product | null>(null)
  const [edit, setEdit] = useState<Partial<Product> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const removeDemo = useSave(() => api<{ removed: number; kept: number }>('/demo-products', { method: 'DELETE' }))
  const resync = useSave(() => api<{ ok: number; failed: any[] }>('/nebih/resync', { method: 'POST' }))
  const importJson = useSave((list: unknown) => api<{ imported: number }>('/products/import', { method: 'POST', json: list }))

  const list = (products ?? []).filter(
    (p) =>
      (!onlyGrape || p.uses.some((u) => GRAPE.test(u.culture))) &&
      (!q || [p.name, p.permit_number, p.holder, ...p.active_substances.map((a) => a.name)].join(' ').toLowerCase().includes(q.toLowerCase())),
  )
  const demoCount = products?.filter((p) => p.source === 'demo').length ?? 0

  return (
    <>
      {demoCount > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="flex-1">
            Az adatbázisban <b>{demoCount} kitalált demó szer</b> van a funkciók kipróbálásához. Éles használat előtt törölje őket, és importálja a valós szereket a NÉBIH-ből.
          </span>
          <Button size="sm" variant="secondary" loading={removeDemo.isPending} onClick={() => removeDemo.mutate(undefined)}>Demó szerek törlése</Button>
        </div>
      )}
      {removeDemo.data && removeDemo.data.kept > 0 && (
        <p className="mb-4 text-sm text-muted">{removeDemo.data.removed} törölve; {removeDemo.data.kept} megmaradt, mert szerepel a permetezési naplóban.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név, engedélyszám, hatóanyag szerint…" className="pl-9" />
        </div>
        <Button variant={onlyGrape ? 'primary' : 'secondary'} onClick={() => setOnlyGrape(!onlyGrape)}>Csak szőlőre engedélyezett</Button>
        <Button variant="secondary" icon={<RefreshCw className="size-4" />} loading={resync.isPending} onClick={() => resync.mutate(undefined)} title="NÉBIH-ből származó szerek frissítése">Szinkron</Button>
        <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>Import</Button>
        <input
          ref={fileRef} type="file" accept="application/json" hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) importJson.mutate(JSON.parse(await file.text()))
            e.target.value = ''
          }}
        />
        <Button icon={<Plus className="size-4" />} onClick={() => setEdit({ source: 'manual', unit: 'l', active_substances: [], uses: [] })}>Új szer</Button>
      </div>
      {(resync.data || resync.error || importJson.data || importJson.error) && (
        <p className="mb-4 text-sm text-muted">
          {resync.data && `Szinkron: ${resync.data.ok} frissítve, ${resync.data.failed.length} sikertelen. `}
          {resync.error && `Szinkron hiba: ${resync.error.message} `}
          {importJson.data && `${importJson.data.imported} szer importálva. `}
          {importJson.error && `Import hiba: ${importJson.error.message}`}
        </p>
      )}

      {isLoading ? (
        <Spinner />
      ) : !list.length ? (
        <Card><Empty icon={<FlaskConical />} title="Nincs találat" text="Keressen a NÉBIH adatbázisban, vagy rögzítsen szert kézzel." /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const grape = p.uses.filter((u) => GRAPE.test(u.culture))
            return (
              <button key={p.id} onClick={() => setView(p)} className="text-left">
                <Card className="p-4 h-full transition hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <p className="text-xs text-muted truncate">{p.active_substances.map((a) => `${a.name}${a.concentration ? ` ${a.concentration}` : ''}`).join(' + ') || '—'}</p>
                    </div>
                    {p.category && <Badge>{p.category}</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <SourceBadge p={p} />
                    {grape.length ? <Badge tone="green">Szőlő: {grape.map((u) => u.pest).join(', ')}</Badge> : <Badge tone="red">Szőlőben nem engedélyezett</Badge>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex justify-between text-xs">
                    <span className="text-muted">{p.permit_number ?? 'nincs engedélyszám'}</span>
                    <span className={cx('font-medium', p.stock <= 0 && 'text-red-600')}>Készlet: {n(p.stock)} {p.unit}</span>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}
      <ProductView p={view} onClose={() => setView(null)} onEdit={(p) => { setView(null); setEdit(p) }} />
      <ProductModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

function ProductView({ p, onClose, onEdit }: { p: Product | null; onClose: () => void; onEdit: (p: Product) => void }) {
  const del = useSave(() => api(`/products/${p?.id}`, { method: 'DELETE' }))
  const [allCultures, setAllCultures] = useState(false)
  if (!p) return null
  const x = p.extra ?? {}
  const grape = p.uses.filter((u) => GRAPE.test(u.culture))
  const shownUses = allCultures ? p.uses : grape
  const missingDose = grape.some((u) => u.dose_max == null)
  const yn = (v: boolean | null | undefined) => (v == null ? null : v ? 'igen' : 'nem')
  return (
    <Modal
      open
      onClose={onClose}
      title={p.name}
      wide
      footer={
        <>
          {del.error && <span className="mr-auto self-center text-sm text-red-600">{del.error.message}</span>}
          <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => confirm('Törli a szert?') && del.mutate(undefined, { onSuccess: onClose })}>Törlés</Button>
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(p)}>{missingDose ? 'Dózisok megadása' : 'Szerkesztés'}</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-4">
        <SourceBadge p={p} />
        {p.status && <Badge tone={/nem felh|lejárt|visszavon/i.test(p.status) ? 'red' : 'green'}>{p.status}</Badge>}
        {x.organic && /^felhasználható/i.test(x.organic) && <Badge tone="green">Ökológiai gazdálkodásban felhasználható</Badge>}
        {grape.length ? <Badge tone="green">Szőlőben engedélyezett</Badge> : <Badge tone="red">Szőlőben nem engedélyezett</Badge>}
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-5">
        {[
          ['Engedélyszám', p.permit_number], ['Engedély típusa', x.permit_type], ['Forgalmi kategória', p.category],
          ['Rendeltetés', x.purpose], ['Formuláció', p.formulation], ['Engedély érvényes', p.permit_valid_until],
          ['Felhasználható eddig', p.use_until], ['Élelmezés-eü. várakozási idő', x.phi_max != null ? (x.phi_min !== x.phi_max ? `${x.phi_min}–${x.phi_max} nap` : `${x.phi_max} nap`) : null],
          ['Méhveszélyesség', x.bee_hazard], ['Légi / drónos kijuttatás', [yn(x.aerial), yn(x.drone)].filter(Boolean).join(' / ') || null],
          ['Engedélyes', p.holder], ['Készlet', `${n(p.stock)} ${p.unit}`],
        ].map(([k, v]) => (
          <div key={k as string} className={cx(k === 'Engedélyes' && 'col-span-2')}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>
        ))}
        <div className="col-span-full"><dt className="text-xs text-muted">Hatóanyag(ok)</dt><dd className="font-medium">{p.active_substances.map((a) => `${a.name}${a.concentration ? ` (${a.concentration})` : ''}`).join(', ') || '—'}</dd></div>
        {!!x.pests?.length && <div className="col-span-full"><dt className="text-xs text-muted">Károsítók (NÉBIH)</dt><dd>{x.pests.join(', ')}</dd></div>}
      </dl>

      {missingDose && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          A NÉBIH adatlap a dózist és a maximális kezelésszámot nem tartalmazza — ezek az engedélyokiratban (PDF) vannak. Adja meg őket a szőlő sorokra, és a napló ellenőrizni fogja.
        </p>
      )}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Engedélyezett felhasználás {allCultures ? `(${p.uses.length} kultúra)` : '— szőlő'}</h4>
        {p.uses.length > grape.length && (
          <button className="text-xs text-vine-700 dark:text-vine-300 font-medium" onClick={() => setAllCultures(!allCultures)}>
            {allCultures ? 'Csak szőlő' : `Mind a ${p.uses.length} kultúra`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line max-h-72">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs text-muted sticky top-0">
            <tr className="text-left"><th className="px-3 py-2">Kultúra</th><th className="px-3 py-2">Károsító</th><th className="px-3 py-2">Dózis</th><th className="px-3 py-2">ÉVI</th><th className="px-3 py-2">MVI</th><th className="px-3 py-2">Max. kez.</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shownUses.map((u, i) => (
              <tr key={i} className={cx(GRAPE.test(u.culture) && 'bg-vine-50/60 dark:bg-vine-950/30')}>
                <td className="px-3 py-2 whitespace-nowrap">{u.culture}</td><td className="px-3 py-2 text-xs">{u.pest}</td>
                <td className="px-3 py-2 whitespace-nowrap">{u.dose_max == null ? <span className="text-muted">PDF</span> : `${u.dose_min != null && u.dose_min !== u.dose_max ? `${n(u.dose_min)}–` : ''}${n(u.dose_max)} ${u.dose_unit}`}</td>
                <td className="px-3 py-2 whitespace-nowrap">{u.phi_days ?? '—'} nap</td><td className="px-3 py-2">{u.rei_days ?? '—'}</td><td className="px-3 py-2">{u.max_treatments ?? '—'}</td>
              </tr>
            ))}
            {!shownUses.length && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted">Nincs {allCultures ? '' : 'szőlőre vonatkozó '}felhasználási adat</td></tr>}
          </tbody>
        </table>
      </div>
      {!!x.documents?.length && (
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Engedélyokirat és módosításai (NÉBIH)</h4>
          <ul className="flex flex-col gap-1">
            {[...x.documents].reverse().map((d, i) => (
              <li key={d.url}>
                <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-vine-700 dark:text-vine-300 hover:underline">
                  <ExternalLink className="size-3.5" /> {d.name} {i === 0 && <Badge tone="green">legújabb</Badge>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

const emptyUse = (): ProductUse => ({ culture: 'szőlő', pest: '', dose_min: null, dose_max: null, dose_unit: 'l/ha', phi_days: null, rei_days: null, max_treatments: null, notes: null })

function ProductModal({ value, onClose }: { value: Partial<Product> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Product>>({})
  const [prev, setPrev] = useState<typeof value>(null)
  if (value !== prev) {
    setPrev(value)
    setF(value ?? {})
  }
  const save = useSave((b: Partial<Product>) => (b.id ? api(`/products/${b.id}`, { method: 'PUT', json: b }) : api('/products', { method: 'POST', json: b })))
  const uses = f.uses ?? []
  const subs = f.active_substances ?? []
  const setUse = (i: number, patch: Partial<ProductUse>) => setF({ ...f, uses: uses.map((u, k) => (k === i ? { ...u, ...patch } : u)) })
  const numOrNull = (v: string) => (v === '' ? null : Number(v))
  const { id, stock, synced_at, ...body } = f as Product

  return (
    <Modal
      open={!!value}
      onClose={onClose}
      title={f.id ? 'Szer szerkesztése' : 'Új szer (kézi rögzítés)'}
      wide
      footer={
        <>
          {save.error && <span className="mr-auto self-center text-sm text-red-600">{save.error.message}</span>}
          <Button variant="secondary" onClick={onClose}>Mégse</Button>
          <Button loading={save.isPending} onClick={() => save.mutate({ ...body, id } as Partial<Product>, { onSuccess: onClose })}>Mentés</Button>
        </>
      }
    >
      {f.source === 'nebih' && <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">NÉBIH-ből szinkronizált szer — a törzsadatokat a szinkron frissíti, de az itt megadott dózisokat, MVI-t és kezelésszámot megőrzi.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Készítmény neve *" className="sm:col-span-2"><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Engedélyszám"><Input value={f.permit_number ?? ''} onChange={(e) => setF({ ...f, permit_number: e.target.value })} /></Field>
        <Field label="Engedélyes"><Input value={f.holder ?? ''} onChange={(e) => setF({ ...f, holder: e.target.value })} /></Field>
        <Field label="Forgalmi kategória">
          <select className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" value={f.category ?? ''} onChange={(e) => setF({ ...f, category: e.target.value || null })}>
            <option value="">—</option><option>I.</option><option>II.</option><option>III.</option>
          </select>
        </Field>
        <Field label="Készlet mértékegysége">
          <select className="h-10 rounded-xl border border-line bg-surface px-3 text-sm" value={f.unit ?? 'l'} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            <option value="l">liter</option><option value="kg">kg</option>
          </select>
        </Field>
        <Field label="Hatóanyag(ok)" hint="Pl.: réz-hidroxid 50%; kén 80%" className="sm:col-span-2">
          <Input
            value={subs.map((s) => `${s.name}${s.concentration ? ` ${s.concentration}` : ''}`).join('; ')}
            onChange={(e) => setF({ ...f, active_substances: e.target.value.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const m = x.match(/^(.*?)\s+([\d.,]+\s*\S*)$/); return m ? { name: m[1], concentration: m[2] } : { name: x, concentration: null } }) })}
          />
        </Field>
        <Field label="Engedély érvényes"><Input type="date" value={f.permit_valid_until ?? ''} onChange={(e) => setF({ ...f, permit_valid_until: e.target.value || null })} /></Field>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h4 className="font-semibold text-sm">Engedélyezett felhasználás</h4>
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setF({ ...f, uses: [...uses, emptyUse()] })}>Sor</Button>
      </div>
      <datalist id="pest-list">{PESTS.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="mt-2 flex flex-col gap-2">
        {uses.map((u, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1.3fr_.7fr_.7fr_.8fr_.6fr_.6fr_.6fr_auto] gap-2 items-end rounded-xl border border-line p-2">
            <Field label="Kultúra"><Input value={u.culture} onChange={(e) => setUse(i, { culture: e.target.value })} /></Field>
            <Field label="Károsító"><Input list="pest-list" value={u.pest} onChange={(e) => setUse(i, { pest: e.target.value })} /></Field>
            <Field label="Min."><Input type="number" step="0.01" value={u.dose_min ?? ''} onChange={(e) => setUse(i, { dose_min: numOrNull(e.target.value) })} /></Field>
            <Field label="Max."><Input type="number" step="0.01" value={u.dose_max ?? ''} onChange={(e) => setUse(i, { dose_max: numOrNull(e.target.value) })} /></Field>
            <Field label="Egység">
              <select className="h-10 rounded-xl border border-line bg-surface px-2 text-sm" value={u.dose_unit} onChange={(e) => setUse(i, { dose_unit: e.target.value })}>{DOSE_UNITS.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="ÉVI"><Input type="number" value={u.phi_days ?? ''} onChange={(e) => setUse(i, { phi_days: numOrNull(e.target.value) })} /></Field>
            <Field label="MVI"><Input type="number" value={u.rei_days ?? ''} onChange={(e) => setUse(i, { rei_days: numOrNull(e.target.value) })} /></Field>
            <Field label="Max kez."><Input type="number" value={u.max_treatments ?? ''} onChange={(e) => setUse(i, { max_treatments: numOrNull(e.target.value) })} /></Field>
            <Button variant="ghost" size="sm" aria-label="Sor törlése" icon={<Trash2 className="size-4" />} onClick={() => setF({ ...f, uses: uses.filter((_, k) => k !== i) })} />
          </div>
        ))}
        {!uses.length && <p className="text-sm text-muted">Adjon meg legalább egy szőlő sort a dózis- és várakozási idő-ellenőrzéshez.</p>}
      </div>
    </Modal>
  )
}

function NebihSearch() {
  const { data: st, refetch, isFetching } = useNebihStatus()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [hideExpired, setHideExpired] = useState(true)
  const search = useNebihSearch(q)
  const imp = useSave((hit: NebihSearchHit) => api<Product>('/nebih/import', { method: 'POST', json: { query: hit.query, index: hit.index, name: hit.name } }))
  const [imported, setImported] = useState<Record<string, Product>>({})
  const [pending, setPending] = useState<string | null>(null)
  const hits = (search.data?.hits ?? []).filter((h) => !hideExpired || !h.expired)
  const expiredCount = (search.data?.hits ?? []).filter((h) => h.expired).length
  const key = (h: NebihSearchHit) => `${h.query}#${h.index}`

  return (
    <>
      <Card className={cx('p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center', !st?.reachable && 'border-amber-300 dark:border-amber-800')}>
        <div className={cx('grid size-10 shrink-0 place-items-center rounded-xl', st?.reachable ? 'bg-vine-100 text-vine-700 dark:bg-vine-900/60 dark:text-vine-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300')}>
          {st?.reachable ? <Wifi className="size-5" /> : <CloudOff className="size-5" />}
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium">{st?.reachable ? 'Kapcsolódva a NÉBIH Növényvédő szer Engedélykeresőhöz' : 'A NÉBIH Engedélykereső jelenleg nem érhető el a szerverről'}</div>
          <div className="text-muted text-xs mt-0.5 break-all">
            {st?.base_url}
            {st?.error && ` · ${st.error}`}
            {!st?.reachable && ' — ellenőrizze a szerver internet-hozzáférését (tűzfal / proxy).'}
          </div>
        </div>
        <Button variant="secondary" size="sm" loading={isFetching} icon={<RefreshCw className="size-3.5" />} onClick={() => api('/nebih/status?force=1').then(() => refetch())}>Újra</Button>
      </Card>

      <form className="flex flex-col sm:flex-row gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); setQ(input.trim()) }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Növényvédő szer neve (pl. Kumulus, Ridomil, Champion…)" className="pl-9" />
        </div>
        <Button type="submit" disabled={input.trim().length < 2}>Keresés a NÉBIH-ben</Button>
      </form>
      {search.data && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm text-muted">
          <span>{search.data.hits.length} találat{search.data.has_more ? ' (az első 50 — szűkítse a keresést)' : ''}</span>
          {expiredCount > 0 && (
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hideExpired} onChange={(e) => setHideExpired(e.target.checked)} className="accent-[var(--color-vine-600)]" />
              Lejárt / nem felhasználható engedélyek elrejtése ({expiredCount})
            </label>
          )}
        </div>
      )}

      {search.isFetching ? (
        <Spinner />
      ) : search.error ? (
        <Card className="p-5 text-sm text-red-600">{search.error.message}</Card>
      ) : search.data ? (
        hits.length ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {hits.map((h) => {
                const k = key(h)
                const done = imported[k]
                const grapeOk = done ? done.uses.some((u) => GRAPE.test(u.culture)) : null
                return (
                  <li key={k} className="flex flex-col sm:flex-row gap-2 sm:items-center px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex flex-wrap items-center gap-2">
                        {h.name}
                        {h.expired ? <Badge tone="red">nem felhasználható</Badge> : <Badge tone="neutral">érvényes: {h.valid_until?.replaceAll('-', '.')}</Badge>}
                        {h.eco && <Badge tone="green">öko</Badge>}
                      </div>
                      <div className="text-xs text-muted mt-0.5">{[h.active_substances, h.purpose, h.permit_type].filter(Boolean).join(' · ')}</div>
                    </div>
                    {done ? (
                      <Badge tone={grapeOk ? 'green' : 'amber'}>Importálva{grapeOk === false ? ' · szőlőben nem engedélyezett' : ''}</Badge>
                    ) : (
                      <Button size="sm" variant="secondary" icon={<Import className="size-3.5" />} loading={pending === k}
                        onClick={() => { setPending(k); imp.mutate(h, { onSuccess: (p) => setImported((m) => ({ ...m, [k]: p })), onSettled: () => setPending(null) }) }}>
                        Importálás
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
            {imp.error && <p className="px-5 py-3 text-sm text-red-600 border-t border-line">{imp.error.message}</p>}
          </Card>
        ) : (
          <Card><Empty icon={<Search />} title="Nincs találat a NÉBIH adatbázisban" /></Card>
        )
      ) : (
        <Card>
          <Empty icon={<Database />} title="Keressen a hivatalosan engedélyezett szerek között" text="Az importált szer törzskönyvi adatai (engedélyszám, érvényesség, forgalmi kategória, kultúrák, károsítók, ÉVI, engedélyokirat PDF-ek) a saját adatbázisba kerülnek, és a permetezési napló ezek alapján ellenőriz." />
        </Card>
      )}
    </>
  )
}
