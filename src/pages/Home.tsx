import { ArrowRight, BookOpen, FlaskConical, Grape, MessageSquare, PenLine, Search, ShieldAlert, ShieldCheck, Sparkles, SprayCan } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDashboard, useParcels, useProducts } from '../lib/api'
import { ARTICLES, FEED, FORUM, type EventKind } from '../lib/mock'
import { matchScore, useVarieties } from '../lib/varieties'
import { d, daysUntil } from '../lib/format'
import { GrapeArt } from '../components/Grape'
import { VarietyCard } from '../components/VarietyCard'
import { Badge, Card, CardHeader, ColorDot, cx } from '../components/ui'

const KIND: Record<EventKind, { label: string; icon: React.ReactNode; cls: string }> = {
  forum: { label: 'Fórum hozzászólás', icon: <MessageSquare />, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  variety: { label: 'Új fajta', icon: <Grape />, cls: 'bg-vine-100 text-vine-700 dark:bg-vine-900/60 dark:text-vine-300' },
  edit: { label: 'Fajta szerkesztve', icon: <PenLine />, cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  article: { label: 'Új cikk', icon: <BookOpen />, cls: 'bg-rose-100 text-grape-600 dark:bg-rose-950 dark:text-rose-300' },
  spray: { label: 'Permetezési napló', icon: <SprayCan />, cls: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-900/50 dark:text-leaf-200' },
}

export default function Home() {
  const { data: varieties = [] } = useVarieties()
  const { data: dash } = useDashboard()
  const { data: parcels = [] } = useParcels()
  const { data: products = [] } = useProducts()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const nav = useNavigate()
  const suggestions = useMemo(
    () => (q.trim() ? varieties.map((v) => ({ v, s: matchScore(v, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6) : []),
    [q, varieties],
  )
  const popular = [...varieties].sort((a, b) => b.popularity - a.popularity).slice(0, 6)
  const blocked = dash?.parcel_status.filter((s) => (daysUntil(s.harvest_allowed_from) ?? 0) > 0) ?? []

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-vine-800 via-vine-700 to-vine-600 text-white px-5 py-8 sm:px-10 sm:py-12 mb-6">
        <div className="absolute -right-16 -top-10 hidden sm:block size-80 opacity-25 rotate-12">
          <GrapeArt v={{ id: 3, berry_color: 'kék' }} className="size-full !bg-none" />
        </div>
        <div className="relative max-w-2xl">
          <Badge className="!bg-white/15 !text-white !ring-white/20 mb-3"><Sparkles className="size-3" /> Közösségi tér szőlőfajta-rajongóknak</Badge>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Szőlőink</h1>
          <p className="mt-3 text-white/80 text-sm sm:text-base max-w-xl">
            Fedezz fel új fajtákat, oszd meg a tapasztalataidat — és vezesd a kerted permetezési naplóját a NÉBIH hivatalos szeradataival.
          </p>
          <form className="relative mt-6" onSubmit={(e) => { e.preventDefault(); nav(suggestions[0] ? `/szolo/${suggestions[0].v.id}` : `/kereses?q=${encodeURIComponent(q)}`) }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-vine-700" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
              placeholder="Gyorskeresés: szőlő neve… (elírástűrő, cirill betűvel is)"
              className="w-full h-13 rounded-2xl bg-white text-[var(--color-vine-950)] pl-12 pr-4 text-base shadow-xl shadow-vine-950/30 outline-none placeholder:text-gray-400 focus:ring-4 focus:ring-white/30"
            />
            {focus && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface text-fg shadow-2xl">
                {suggestions.map(({ v }) => (
                  <li key={v.id}>
                    <Link to={`/szolo/${v.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2">
                      <GrapeArt v={v} className="size-9 rounded-lg" />
                      <div className="min-w-0"><div className="font-medium text-sm">{v.name}</div><div className="text-xs text-muted truncate">{v.other_names}</div></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {['rezisztens', 'magvatlan', 'muskotaly', 'csemege'].map((t) => (
              <Link key={t} to={`/kereses?cimke=${t}`} className="rounded-full bg-white/10 hover:bg-white/20 px-3 h-7 inline-flex items-center ring-1 ring-white/20">#{t}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section>
            <div className="flex items-end justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Népszerű fajták</h2>
              <Link to="/kereses" className="text-sm font-medium text-vine-700 dark:text-vine-300 inline-flex items-center gap-1">Összes <ArrowRight className="size-3.5" /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{popular.map((v) => <VarietyCard key={v.id} v={v} />)}</div>
          </section>

          <Card>
            <CardHeader title="Eseményfolyam" subtitle="Mi történt a közösségben — mintaadatok" />
            <ol className="relative px-5 pb-5">
              <span className="absolute left-[38px] top-1 bottom-6 w-px bg-[var(--border)]" />
              {FEED.map((e, i) => (
                <li key={i} className="relative flex gap-4 py-2">
                  <span className={cx('relative z-10 grid size-9 shrink-0 place-items-center rounded-xl ring-4 ring-[var(--surface)] [&>svg]:size-4', KIND[e.kind].cls)}>{KIND[e.kind].icon}</span>
                  <Link to={e.to ?? '#'} className="min-w-0 flex-1 rounded-xl px-3 py-2 -my-1 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{KIND[e.kind].label}</span><span>{e.ago}</span>
                    </div>
                    <div className="font-medium">{e.title}</div>
                    <p className="text-sm text-muted line-clamp-2">{e.text}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className="grid size-5 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: e.user.color }}>{e.user.initials}</span>
                      {e.user.name}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="order-first lg:order-none flex flex-col gap-6">
          {/* Integráció: saját kert */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-leaf-50 to-transparent dark:from-leaf-900/30 px-5 pt-4 pb-3 border-b border-line">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold tracking-tight flex items-center gap-2"><SprayCan className="size-4 text-leaf-700 dark:text-leaf-200" /> Kertem — {dash?.season}</h3>
                <Badge tone="brand">új</Badge>
              </div>
              <p className="text-xs text-muted mt-1">{parcels.length} parcella · {dash?.spray_count_season ?? 0} permetezés · {products.length} szer az adatbázisban</p>
            </div>
            <ul className="divide-y divide-line">
              {dash?.parcel_status.map((s) => {
                const p = parcels.find((x) => x.id === s.parcel_id)
                const left = daysUntil(s.harvest_allowed_from)
                return (
                  <li key={s.parcel_id} className="flex items-center gap-3 px-5 py-2.5">
                    <ColorDot color={p?.color ?? '#999'} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p?.name}</div>
                      <div className="text-xs text-muted truncate">{p?.variety} · utolsó kezelés {d(s.last_spray_date, 'MMM d.')}</div>
                    </div>
                    {left && left > 0 ? <Badge tone="red"><ShieldAlert className="size-3" />ÉVI {left} nap</Badge> : <Badge tone="green"><ShieldCheck className="size-3" />szüretelhető</Badge>}
                  </li>
                )
              })}
            </ul>
            <div className="grid grid-cols-2 border-t border-line text-sm">
              <Link to="/permetezes/uj" className="flex items-center justify-center gap-1.5 h-11 font-medium text-vine-700 dark:text-vine-300 hover:bg-surface-2"><SprayCan className="size-4" /> Új permetezés</Link>
              <Link to="/szerek" className="flex items-center justify-center gap-1.5 h-11 font-medium text-vine-700 dark:text-vine-300 hover:bg-surface-2 border-l border-line"><FlaskConical className="size-4" /> Szeradatbázis</Link>
            </div>
            {blocked.length > 0 && <p className="px-5 py-2 text-xs text-red-700 dark:text-red-300 border-t border-line">{blocked.length} parcellán még fut a várakozási idő.</p>}
          </Card>

          <Card>
            <CardHeader title="Friss cikkek" icon={<BookOpen className="size-5" />} action={<Link to="/cikkek" className="text-sm font-medium text-vine-700 dark:text-vine-300">Mind</Link>} />
            <ul className="divide-y divide-line">
              {ARTICLES.map((a) => (
                <li key={a.slug}>
                  <Link to={`/cikkek/${a.slug}`} className="block px-5 py-3 hover:bg-surface-2">
                    <div className="text-xs text-muted">{a.category} · {a.minutes} perc</div>
                    <div className="font-medium leading-snug">{a.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Fórum" icon={<MessageSquare className="size-5" />} action={<Link to="/forum" className="text-sm font-medium text-vine-700 dark:text-vine-300">Megnyitás</Link>} />
            <ul className="px-5 pb-4 flex flex-col gap-2">
              {FORUM.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link to={`/forum/${c.id}`} className="flex items-center justify-between text-sm hover:text-vine-700 dark:hover:text-vine-300">
                    <span>{c.name}</span>
                    {c.unread > 0 ? <Badge tone="brand">{c.unread} új</Badge> : <span className="text-xs text-muted">{c.threads} téma</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
