import {
  BookOpen, Boxes, FlaskConical, Grape, Hammer, HelpCircle, Home, LayoutDashboard, ListChecks, ListTree, Mail, Map, Menu, MessageSquare, Moon, Plus, Search,
  Settings, Sprout, SprayCan, Star, Sun, Users, Wheat, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useNebihStatus } from '../lib/api'
import { DEMO } from '../lib/env'
import { USERS } from '../lib/mock'
import { cx } from './ui'

type Item = { to: string; label: string; icon: typeof Home; end?: boolean; badge?: string; isNew?: boolean }
const EXPLORE: Item[] = [
  { to: '/', label: 'Főoldal', icon: Home, end: true },
  { to: '/kereses', label: 'Keresés', icon: Search },
  { to: '/szolok', label: 'Szőlők A–Z', icon: ListTree },
  { to: '/gazdak', label: 'Gazdák', icon: Users },
  { to: '/cikkek', label: 'Cikkek', icon: BookOpen, badge: 'új' },
  { to: '/forum', label: 'Fórum', icon: MessageSquare, badge: '11' },
]
const MINE: Item[] = [
  { to: '/szoloim', label: 'Szőlőim', icon: Star },
  { to: '/listaim', label: 'Listáim', icon: ListChecks },
  { to: '/uzenetek', label: 'Üzenetek', icon: Mail, badge: '2' },
]
const GARDEN: Item[] = [
  { to: '/kertem', label: 'Áttekintés', icon: LayoutDashboard },
  { to: '/ultetvenyek', label: 'Ültetvényeim', icon: Map, isNew: true },
  { to: '/permetezes', label: 'Permetezési napló', icon: SprayCan, isNew: true },
  { to: '/szerek', label: 'Szeradatbázis', icon: FlaskConical, isNew: true },
  { to: '/raktar', label: 'Raktár', icon: Boxes },
  { to: '/munkanaplo', label: 'Munkanapló', icon: Hammer },
  { to: '/szuret', label: 'Szüret', icon: Wheat },
]
const MOBILE: Item[] = [EXPLORE[0], EXPLORE[1], GARDEN[2], MINE[0]]
const ALL = [...EXPLORE, ...MINE, ...GARDEN, { to: '/lista', label: 'Megosztott lista', icon: ListChecks }, { to: '/gazda', label: 'Gazda profil', icon: Users }, { to: '/beallitasok', label: 'Beállítások', icon: Settings }, { to: '/segitseg', label: 'Segítség', icon: HelpCircle }]

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem('theme')
      return s ? s === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])
  return [dark, setDark] as const
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-vine-500 to-vine-800 text-white shadow-md shadow-vine-900/25">
        <Grape className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight">Szőlőink</div>
        <div className="text-[11px] text-muted">magunktól nekünk</div>
      </div>
    </Link>
  )
}

function NavList({ items, onNav }: { items: Item[]; onNav?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end, badge, isNew }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNav}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-xl px-3 h-9 text-sm font-medium transition',
              isActive ? 'bg-vine-100 text-vine-900 dark:bg-vine-900/50 dark:text-vine-100' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )
          }
        >
          <Icon className="size-[18px]" />
          <span className="flex-1">{label}</span>
          {badge && <span className="rounded-full bg-vine-600 px-1.5 text-[10px] font-semibold text-white leading-4">{badge}</span>}
          {isNew && <span className="rounded-full bg-leaf-100 px-1.5 text-[10px] font-semibold text-leaf-800 dark:bg-leaf-900/60 dark:text-leaf-200 leading-4">ÚJ</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function Sidebar({ onNav }: { onNav?: () => void }) {
  const { data: nebih } = useNebihStatus()
  return (
    <>
      <div className="px-2 mb-5"><Logo /></div>
      <Link to="/permetezes/uj" onClick={onNav}
        className="mx-1 mb-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-vine-700 text-sm font-medium text-white shadow-sm shadow-vine-900/20 hover:bg-vine-800 dark:bg-vine-500 dark:hover:bg-vine-400">
        <Plus className="size-4" /> Új permetezés
      </Link>
      <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Felfedezés</div>
      <NavList items={EXPLORE} onNav={onNav} />
      <div className="px-3 mt-5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Saját</div>
      <NavList items={MINE} onNav={onNav} />
      <div className="px-3 mt-5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Gazdálkodás</div>
      <NavList items={GARDEN} onNav={onNav} />
      <div className="mt-auto pt-5 flex flex-col gap-1">
        <NavList items={ALL.slice(-2)} onNav={onNav} />
        <Link to="/szerek?tab=nebih" onClick={onNav} className="mt-2 flex items-center gap-2 px-3 text-xs text-muted hover:text-fg">
          <span className={cx('size-2 rounded-full', nebih?.reachable ? 'bg-leaf-600' : 'bg-amber-500')} />
          {DEMO ? 'NÉBIH: előre importált adatok' : `NÉBIH ${nebih?.reachable ? 'kapcsolódva' : 'nem elérhető'}`}
        </Link>
      </div>
    </>
  )
}

export default function Layout() {
  const [dark, setDark] = useTheme()
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])
  const current = [...ALL].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to)))
  const title = loc.pathname.startsWith('/szolo/') ? 'Fajta adatlap' : loc.pathname.startsWith('/lista/') ? 'Megosztott lista' : current?.label ?? 'Szőlőink'
  const me = USERS[4]

  return (
    <div className="min-h-full lg:pl-64">
      <aside className="no-print hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col overflow-y-auto border-r border-line bg-surface px-3 py-5">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-surface px-3 py-5 shadow-2xl">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 rounded-lg p-2 text-muted" aria-label="Menü bezárása"><X className="size-5" /></button>
            <Sidebar onNav={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      {/* Felső sáv */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-14 lg:h-16">
        <button onClick={() => setDrawer(true)} className="lg:hidden rounded-lg p-1.5 -ml-1.5 text-muted" aria-label="Menü"><Menu className="size-5" /></button>
        <h2 className="font-semibold tracking-tight truncate">{title}</h2>
        <span className="hidden sm:inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">{DEMO ? 'koncepció · demó' : 'koncepció'}</span>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/kereses" className="hidden sm:flex items-center gap-2 h-9 w-56 rounded-xl border border-line bg-surface-2 px-3 text-sm text-muted hover:text-fg">
            <Search className="size-4" /> Fajta keresése…
          </Link>
          <button onClick={() => setDark(!dark)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Téma váltása">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Link to="/beallitasok" className="flex items-center gap-2 rounded-xl pl-1 pr-2 h-9 hover:bg-surface-2" title="Minta felhasználó">
            <span className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: me.color }}>{me.initials}</span>
            <span className="hidden md:inline text-sm font-medium">{me.name}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-28 lg:pb-12">
        <Outlet />
      </main>

      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {MOBILE.slice(0, 2).map((x) => <MobileItem key={x.to} {...x} />)}
          <Link to="/permetezes/uj" className="flex items-center justify-center" aria-label="Új permetezés">
            <span className="grid size-12 -mt-5 place-items-center rounded-2xl bg-vine-700 text-white shadow-lg shadow-vine-900/30 dark:bg-vine-500">
              <Plus className="size-6" />
            </span>
          </Link>
          {MOBILE.slice(2).map((x) => <MobileItem key={x.to} {...x} />)}
        </div>
      </nav>
    </div>
  )
}

function MobileItem({ to, label, icon: Icon, end }: Item) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => cx('flex flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-vine-700 dark:text-vine-300' : 'text-muted')}>
      <Icon className="size-5" />
      {label.replace('Permetezési napló', 'Napló')}
    </NavLink>
  )
}
