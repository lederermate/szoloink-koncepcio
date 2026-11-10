import { format, subDays } from 'date-fns'
import { hu } from 'date-fns/locale'
import { ArrowLeft, CalendarRange, ExternalLink, FlaskConical, History, Leaf, MapPin, Pencil, Plus, ShieldCheck, SprayCan, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TAG_CATEGORIES } from '../../shared/tags'
import { useParcels, useProducts, useSprays } from '../lib/api'
import { USERS } from '../lib/mock'
import { BERRY, dayToDate, fold, ripeningClass, ripeningLabel, useVarieties } from '../lib/varieties'
import { d, n } from '../lib/format'
import { GrapeArt, RipeningBar } from '../components/Grape'
import { Badge, Button, Card, CardHeader, Empty, Segmented, Spinner, cx } from '../components/ui'
import { VarietyModal } from './Varieties'
import { AddToList, CollectionToggle } from '../components/GardenActions'
import type { Product, Variety } from '../../shared/types'

type Tab = 'leiras' | 'vedelem' | 'tortenet'

export default function VarietyDetail() {
  const id = Number(useParams().id)
  const nav = useNavigate()
  const { data: varieties, isLoading } = useVarieties()
  const [tab, setTab] = useState<Tab>('leiras')
  const [edit, setEdit] = useState(false)
  const v = varieties?.find((x) => x.id === id)
  if (isLoading) return <Spinner />
  if (!v) return <Empty icon={<Leaf />} title="A fajta nem található" action={<Link to="/szolok">Vissza a fajtákhoz</Link>} />
  const others = v.other_names?.split(',').map((s) => s.trim()).filter(Boolean) ?? []

  return (
    <>
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4">
        <ArrowLeft className="size-4" /> Vissza
      </button>

      <Card className="overflow-hidden mb-6">
        <div className="grid md:grid-cols-[320px_1fr]">
          <GrapeArt v={v} className="h-56 md:h-auto md:min-h-80" />
          <div className="p-5 sm:p-7 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{v.name}</h1>
                {others.length > 0 && <p className="text-muted mt-1">{others.join(' · ')}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <CollectionToggle v={v} />
                <AddToList v={v} />
                <Link to={`/ultetvenyek?uj=${encodeURIComponent(v.name)}`} title="Új ültetvény ezzel a fajtával"><Button variant="secondary" icon={<Plus className="size-4" />}>Ültetvénybe</Button></Link>
                <Button variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)} aria-label="Fajta szerkesztése" title="Fajta szerkesztése" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge><span className="size-2 rounded-full" style={{ background: BERRY[v.berry_color]?.fill }} />{BERRY[v.berry_color]?.label}</Badge>
              {ripeningClass(v.ripening_from) && <Badge tone="brand">{ripeningClass(v.ripening_from)}</Badge>}
              {v.tags.includes('rezisztens') && <Badge tone="green"><ShieldCheck className="size-3" /> rezisztens</Badge>}
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5"><CalendarRange className="size-4 text-vine-600" /> Érés</span>
                <span className="text-sm">
                  {v.ripening_from != null ? <><b>{v.ripening_from}–{v.ripening_to ?? v.ripening_from} nap</b> <span className="text-muted">· várhatóan {ripeningLabel(v)}</span></> : <span className="text-muted">nincs adat</span>}
                </span>
              </div>
              <RipeningBar v={v} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={setTab} options={[
          { value: 'leiras', label: 'Leírás és címkék' },
          { value: 'vedelem', label: <span className="inline-flex items-center gap-1.5">Növényvédelem <Badge tone="brand">új</Badge></span> },
          { value: 'tortenet', label: 'Történet' },
        ]} />
      </div>

      {tab === 'leiras' && <Description v={v} />}
      {tab === 'vedelem' && <Protection v={v} />}
      {tab === 'tortenet' && <HistoryTab v={v} />}
      <VarietyModal value={edit ? v : null} onClose={() => setEdit(false)} />
    </>
  )
}

function Description({ v }: { v: Variety }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 items-start">
      <Card className="lg:col-span-2 p-5 sm:p-6">
        <h3 className="font-semibold mb-2">Leírás</h3>
        <p className="leading-relaxed text-[15px]">{v.description ?? 'Még nincs leírás.'}</p>
        <p className="mt-4 text-xs text-muted">Mintaszöveg a koncepcióhoz — a valós rendszerben a közösség szerkeszti, verziókövetéssel.</p>
        {v.links.length > 0 && (
          <div className="mt-5 pt-4 border-t border-line">
            <h4 className="text-sm font-medium mb-2">Külső hivatkozások</h4>
            {v.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-vine-700 dark:text-vine-300 hover:underline">
                <ExternalLink className="size-3.5" /> {l.label}
              </a>
            ))}
          </div>
        )}
      </Card>
      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Címkék</h3>
          <div className="flex flex-col gap-3">
            {TAG_CATEGORIES.map((c) => {
              const ts = c.tags.filter((t) => v.tags.includes(t.id))
              if (!ts.length) return null
              return (
                <div key={c.id}>
                  <div className="text-xs text-muted mb-1">{c.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ts.map((t) => <Link key={t.id} to={`/kereses?cimke=${t.id}`}><Badge tone="brand" className="hover:ring-vine-400">{t.name}</Badge></Link>)}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Kik termesztik" subtitle="Minta — gazdák a közösségből" icon={<Users className="size-5" />} />
          <ul className="px-5 pb-4 flex flex-col gap-2.5">
            {(() => {
              const growers = USERS.filter((u) => u.grapes?.some((g) => fold(g) === fold(v.name)))
              return (growers.length ? growers : USERS.slice(0, 2)).map((u) => (
                <li key={u.id}>
                  <Link to={`/gazda/${u.id}`} className="flex items-center gap-2.5 text-sm hover:underline">
                    <span className="grid size-8 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: u.color }}>{u.initials}</span>
                    <span className="flex-1">{u.name}</span>
                    <span className="text-xs text-muted inline-flex items-center gap-1"><MapPin className="size-3" />{u.city}</span>
                  </Link>
                </li>
              ))
            })()}
            <li><Link to="/gazdak" className="text-xs font-medium text-vine-700 dark:text-vine-300">Összes gazda →</Link></li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

const GRAPE = /sz[őoö]l[őoö]/i

/** Az új integráció: engedélyezett szerek + saját kezelések + „legkésőbbi permetezés” a várható éréshez. */
function Protection({ v }: { v: Variety }) {
  const { data: products = [] } = useProducts()
  const { data: parcels = [] } = useParcels()
  const { data: sprays = [] } = useSprays(new Date().getFullYear())
  const table = v.tags.includes('csemege') || v.tags.includes('kettos')
  const wine = v.tags.includes('bor') || v.tags.includes('kettos') || !table
  const cultureOk = (c: string) =>
    GRAPE.test(c) && (!/\((bor|csemege)\)/i.test(c) || (table && /csemege/i.test(c)) || (wine && /\(bor\)/i.test(c)))
  const rows = products
    .map((p) => {
      const uses = p.uses.filter((u) => cultureOk(u.culture))
      const phi = uses.length ? Math.max(...uses.map((u) => u.phi_days ?? 0)) : null
      return { p, uses, phi }
    })
    .filter((r) => r.uses.length)
    .sort((a, b) => (a.phi ?? 0) - (b.phi ?? 0))
  const ripeStart = v.ripening_from != null ? dayToDate(v.ripening_from) : null
  const myParcels = parcels.filter((p) => p.plantings.some((x) => fold(x.variety) === fold(v.name)))
  const mySprays = sprays.filter((s) => s.parcels.some((pp) => myParcels.some((m) => m.id === pp.parcel_id)))
  const prodName = (pid: number) => products.find((p) => p.id === pid)?.name ?? `#${pid}`
  const usable = (p: Product) => !(p.use_until ?? p.permit_valid_until) || (p.use_until ?? p.permit_valid_until)! >= new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-6 lg:grid-cols-5 items-start">
      <Card className="lg:col-span-3">
        <CardHeader
          title={`Engedélyezett szerek – ${table && !v.tags.includes('bor') ? 'csemegeszőlő' : v.tags.includes('kettos') ? 'bor- és csemegeszőlő' : 'borszőlő'}`}
          subtitle="A saját szeradatbázisból (NÉBIH-ből importált törzskönyvi adatok)"
          icon={<FlaskConical className="size-5" />}
          action={<Link to="/szerek?tab=nebih" className="text-xs font-medium text-vine-700 dark:text-vine-300">+ NÉBIH import</Link>}
        />
        {!rows.length ? (
          <Empty icon={<FlaskConical />} title="Még nincs ide illő szer az adatbázisban" text="Importáljon szereket a NÉBIH keresőből — a kultúra (bor/csemege) alapján automatikusan ide kerülnek." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ p, phi }) => {
              const last = ripeStart && phi != null ? subDays(ripeStart, phi) : null
              return (
                <li key={p.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium">
                      {p.name}
                      {p.source === 'nebih' && <Badge tone="blue">NÉBIH</Badge>}
                      {p.source === 'demo' && <Badge tone="amber">demó</Badge>}
                      {p.extra?.organic && /^felhasználható/i.test(p.extra.organic) && <Badge tone="green">öko</Badge>}
                      {!usable(p) && <Badge tone="red">nem felhasználható</Badge>}
                    </div>
                    <div className="text-xs text-muted truncate">{p.active_substances.map((a) => a.name).join(' + ')} · {[...new Set(p.uses.filter((u) => GRAPE.test(u.culture)).map((u) => u.pest))].join(', ')}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    <Badge tone="red">ÉVI {phi ?? '—'} nap</Badge>
                    {last && <Badge tone="brand">legkésőbb {format(last, 'MMM d.', { locale: hu })}</Badge>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {ripeStart && rows.length > 0 && (
          <p className="px-5 py-3 border-t border-line text-xs text-muted">
            „Legkésőbb” = a várható érés kezdete ({format(ripeStart, 'MMM d.', { locale: hu })}) mínusz az élelmezés-egészségügyi várakozási idő. Tájékoztató jellegű — az évjárat és a termőhely módosítja.
          </p>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Saját kezeléseim ezen a fajtán" subtitle={myParcels.length ? myParcels.map((p) => p.name).join(', ') : 'Nincs ilyen fajtájú parcellája'} icon={<SprayCan className="size-5" />} />
        {!mySprays.length ? (
          <Empty icon={<SprayCan />} title="Nincs idei kezelés" action={<Link to="/permetezes/uj"><Button size="sm">Permetezés rögzítése</Button></Link>} />
        ) : (
          <ul className="divide-y divide-line">
            {mySprays.slice(0, 8).map((s) => (
              <li key={s.id}>
                <Link to={`/permetezes/${s.id}`} className="block px-5 py-2.5 hover:bg-surface-2">
                  <div className="text-xs text-muted">{d(s.date)}</div>
                  <div className="text-sm font-medium">{s.items.map((i) => prodName(i.product_id)).join(' + ')}</div>
                  <div className="text-xs text-muted">{s.items.map((i) => `${i.pest} · ${n(i.dose)} ${i.dose_unit}`).join(' | ')}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function HistoryTab({ v }: { v: Variety }) {
  const entries = [
    { user: USERS[1], ago: '9 órája', what: 'Érési idő pontosítva, leírás bővítve', diff: '+142 / −38 karakter' },
    { user: USERS[0], ago: '3 hete', what: 'Címkék: „lugasra ajánlott” hozzáadva', diff: '+1 címke' },
    { user: USERS[3], ago: '2 hónapja', what: `${v.name} létrehozva`, diff: 'első változat' },
  ]
  return (
    <Card>
      <CardHeader title="Szerkesztési napló" subtitle="Minta — a valós rendszerben verziók összehasonlításával" icon={<History className="size-5" />} />
      <ol className="px-5 pb-5 flex flex-col">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3 py-2.5 border-l-2 border-vine-200 dark:border-vine-800 pl-4 relative">
            <span className="absolute -left-[5px] top-4 size-2 rounded-full bg-vine-500" />
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: e.user.color }}>{e.user.initials}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm"><b>{e.user.name}</b> · <span className="text-muted">{e.ago}</span></div>
              <div className="text-sm">{e.what}</div>
              <div className="text-xs text-muted">{e.diff}</div>
            </div>
            <button disabled className={cx('self-center text-xs text-muted border border-line rounded-lg px-2 h-7 opacity-60')}>Összehasonlítás</button>
          </li>
        ))}
      </ol>
    </Card>
  )
}
