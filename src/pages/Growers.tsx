// „Gazdák” (lista + térkép) és gazdaprofil — MINTAADATOKKAL. A saját profil a Beállításokból és a Szőlőimből töltődik.
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { ArrowLeft, List, Map as MapIcon, MapPin, MessageSquare, Phone, Search, Settings, Users } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useSettings } from '../lib/api'
import { useMyVarieties } from '../lib/garden'
import { ME, USERS, userById, type MockUser } from '../lib/mock'
import { fold, useVarieties } from '../lib/varieties'
import { VarietyCard } from '../components/VarietyCard'
import { Badge, Button, Card, Empty, Input, PageHeader, Segmented, Spinner, cx } from '../components/ui'
import type { Variety } from '../../shared/types'

/** A mintagazdák + a saját profil (Beállítások → Profil) egységes alakban. */
function useGrowers() {
  const { data: settings } = useSettings()
  const { data: mine } = useMyVarieties()
  const { data: varieties = [] } = useVarieties()
  return useMemo(() => {
    const byName = (names: string[] = []) => names.map((n) => varieties.find((v) => fold(v.name) === fold(n))).filter((v): v is Variety => !!v)
    const me: MockUser & { varieties: Variety[]; listed: boolean } = {
      ...ME,
      name: settings?.profile_name || ME.name,
      city: settings?.profile_city || ME.city,
      about: settings?.profile_about || undefined,
      contact: settings?.profile_contact || undefined,
      varieties: (mine ?? []).flatMap((m) => (m.variety ? [m.variety] : [])),
      listed: settings?.profile_listed !== '0',
    }
    return [me, ...USERS.filter((u) => u.id !== ME.id).map((u) => ({ ...u, varieties: byName(u.grapes), listed: true }))]
  }, [settings, mine, varieties])
}
type Grower = ReturnType<typeof useGrowers>[number]

function Avatar({ u, size = 40 }: { u: Pick<MockUser, 'color' | 'initials'>; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ background: u.color, width: size, height: size, fontSize: size * 0.32 }}>
      {u.initials}
    </span>
  )
}

export function Growers() {
  const growers = useGrowers()
  const [sp, setSp] = useSearchParams()
  const view = sp.get('nezet') === 'terkep' ? 'map' : 'list'
  const q = sp.get('q') ?? ''
  const withLoc = sp.get('hely') !== '0'
  const withGrapes = sp.get('szolo') === '1'
  const withContact = sp.get('elerheto') === '1'
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp)
    if (v == null || v === '') n.delete(k)
    else n.set(k, v)
    setSp(n, { replace: true })
  }
  const rows = growers.filter(
    (g) =>
      g.listed &&
      (!withLoc || g.lat != null) &&
      (!withGrapes || g.varieties.length > 0) &&
      (!withContact || !!g.contact) &&
      (!q || fold(g.name).includes(fold(q)) || fold(g.city).includes(fold(q))),
  )

  return (
    <>
      <PageHeader
        title="Gazdák"
        subtitle="Szőlőtermesztők a közösségből — keress a környékeden, nézd meg, mit termesztenek, és írj nekik. (Mintaadatok)"
        actions={<Segmented value={view} onChange={(v) => set('nezet', v === 'map' ? 'terkep' : null)} options={[
          { value: 'list', label: <span className="inline-flex items-center gap-1.5"><List className="size-4" />Lista</span> },
          { value: 'map', label: <span className="inline-flex items-center gap-1.5"><MapIcon className="size-4" />Térkép</span> },
        ]} />}
      />
      <Card className="mb-5 p-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input className="pl-9" value={q} onChange={(e) => set('q', e.target.value)} placeholder="Név vagy település…" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip on={withLoc} onClick={() => set('hely', withLoc ? '0' : null)}>Helyet megadók</Chip>
          <Chip on={withGrapes} onClick={() => set('szolo', withGrapes ? null : '1')}>Szőlőt felvettek</Chip>
          <Chip on={withContact} onClick={() => set('elerheto', withContact ? null : '1')}>Elérhetőséget adtak</Chip>
        </div>
      </Card>
      {view === 'map' ? (
        <GrowerMap growers={rows} />
      ) : rows.length === 0 ? (
        <Card><Empty icon={<Users />} title="Nincs a szűrésnek megfelelő gazda" /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((g) => (
            <Link key={g.id} to={`/gazda/${g.id}`} className="group">
              <Card className="h-full p-4 flex gap-3 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="relative">
                  <Avatar u={g} size={48} />
                  {g.online && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-leaf-500 ring-2 ring-[var(--surface)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate group-hover:text-vine-700 dark:group-hover:text-vine-300">{g.name}</span>
                    {g.id === ME.id && <Badge tone="brand">te</Badge>}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-1"><MapPin className="size-3" />{g.city}{g.lat == null && ' · térképen nem jelenik meg'}</div>
                  {g.about && <p className="mt-1.5 text-sm text-muted line-clamp-2">{g.about}</p>}
                  <div className="mt-2 text-xs"><b>{g.varieties.length}</b> <span className="text-muted">féle szőlő</span>{g.contact && <span className="text-muted"> · elérhetőség megadva</span>}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cx('h-8 rounded-full border px-3 text-sm transition', on ? 'border-vine-600 bg-vine-50 text-vine-800 dark:bg-vine-900/40 dark:text-vine-100' : 'border-line text-muted hover:text-fg')}>
      {children}
    </button>
  )
}

function GrowerMap({ growers }: { growers: Grower[] }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const nav = useNavigate()
  const dark = document.documentElement.classList.contains('dark')

  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([47.15, 19.4], 7)
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [dark])

  useEffect(() => {
    const m = map.current
    const lg = layer.current
    if (!m || !lg) return
    lg.clearLayers()
    const pts = growers.filter((g) => g.lat != null && g.lng != null)
    for (const g of pts) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="display:grid;place-items:center;width:36px;height:36px;border-radius:9999px;background:${g.color};color:#fff;font:600 12px system-ui;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);cursor:pointer">${g.initials}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      L.marker([g.lat!, g.lng!], { icon, title: `${g.name} — ${g.city}` })
        .bindTooltip(`<b>${g.name}</b><br>${g.city} · ${g.varieties.length} féle szőlő`, { direction: 'top', offset: [0, -16] })
        .on('click', () => nav(`/gazda/${g.id}`))
        .addTo(lg)
    }
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts.map((g) => [g.lat!, g.lng!])), { padding: [40, 40], maxZoom: 9 })
  }, [growers, nav])

  return (
    <Card className="overflow-hidden">
      <div ref={el} className="h-[60dvh] min-h-96 w-full z-0" />
      <p className="px-4 py-2 text-xs text-muted border-t border-line">Település vagy kerület szintű pontosság — utcát, házszámot nem tárolunk. Kattints egy gazdára a profiljához.</p>
    </Card>
  )
}

export function GrowerProfile() {
  const { id } = useParams()
  const growers = useGrowers()
  const { ids: mine } = useMyVarieties()
  const g = growers.find((x) => x.id === id)
  if (!userById(id)) return <Card><Empty icon={<Users />} title="A gazda nem található" action={<Link to="/gazdak">Vissza a gazdákhoz</Link>} /></Card>
  if (!g) return <Spinner />
  const isMe = g.id === ME.id
  const common = g.varieties.filter((v) => mine.has(v.id)).length

  return (
    <>
      <Link to="/gazdak" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4"><ArrowLeft className="size-4" /> Gazdák</Link>
      <Card className="mb-6 p-5 sm:p-7 flex flex-col md:flex-row gap-5 md:items-center">
        <Avatar u={g} size={96} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{g.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{g.city}</span>
            {g.since && <span>tag {g.since} óta</span>}
            {g.contact && <span className="inline-flex items-center gap-1"><Phone className="size-4" />{g.contact}</span>}
          </div>
          {g.about && <p className="mt-3 max-w-2xl">{g.about}</p>}
        </div>
        <div className="flex gap-2">
          {isMe ? (
            <Link to="/beallitasok"><Button variant="secondary" icon={<Settings className="size-4" />}>Profil szerkesztése</Button></Link>
          ) : (
            <Link to={`/uzenetek?to=${g.id}`}><Button icon={<MessageSquare className="size-4" />}>Üzenet küldése</Button></Link>
          )}
        </div>
      </Card>
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <h2 className="text-lg font-semibold">Szőlők ({g.varieties.length} féle)</h2>
        {!isMe && common > 0 && <span className="text-sm text-muted">{common} fajta nálad is megvan</span>}
      </div>
      {g.varieties.length === 0 ? (
        <Card><Empty icon={<Users />} title="Még nem vett fel szőlőt" /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {g.varieties.map((v) => <VarietyCard key={v.id} v={v} mine={!isMe && mine.has(v.id)} />)}
        </div>
      )}
    </>
  )
}
