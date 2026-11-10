import { ArrowRight, Boxes, CalendarClock, Grape, Hammer, Map, ShieldAlert, ShieldCheck, SprayCan } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, useParcels, useProducts } from '../lib/api'
import { d, daysUntil, monthShort, n } from '../lib/format'
import { Badge, Card, CardHeader, ColorDot, Empty, PageHeader, Spinner, Stat, cx } from '../components/ui'
import type { Dashboard as DashboardT } from '../../shared/types'

export default function Dashboard() {
  const { data, isLoading } = useDashboard()
  const { data: parcels = [] } = useParcels()
  const { data: products = [] } = useProducts()
  if (isLoading || !data) return <Spinner />
  const pName = (id: number) => parcels.find((p) => p.id === id)
  const prod = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`

  return (
    <>
      <PageHeader
        title="Kertem — áttekintés"
        subtitle={`${data.season}. évi szezon · ${new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Szőlőim" value={n(data.total_area_ha)} unit={`ha · ${data.parcel_count} db`} icon={<Map />} />
        <Stat label="Permetezések" value={data.spray_count_season} unit="alkalom" icon={<SprayCan />} tone="sky" />
        <Stat label="Munkaórák" value={n(data.work_hours_season, 0)} unit="óra" icon={<Hammer />} tone="amber" />
        <Stat label="Szüret" value={n(data.harvest_kg_season / 1000, 1)} unit="tonna" icon={<Grape />} tone="grape" />
      </div>

      <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Parcellák állapota"
            subtitle="Várakozási idők a legutóbbi kezelések alapján"
            icon={<CalendarClock className="size-5" />}
            action={<Link to="/ultetvenyek" className="text-sm text-vine-700 dark:text-vine-300 font-medium inline-flex items-center gap-1">Mind <ArrowRight className="size-3.5" /></Link>}
          />
          {data.parcel_status.length === 0 ? (
            <Empty icon={<Map />} title="Még nincs ültetvény" action={<Link className="text-vine-700 font-medium text-sm" to="/ultetvenyek">Ültetvény felvétele</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {data.parcel_status.map((s) => {
                const p = pName(s.parcel_id)
                const phi = daysUntil(s.harvest_allowed_from)
                const rei = daysUntil(s.reentry_allowed_from)
                return (
                  <li key={s.parcel_id}>
                    <Link to={`/ultetvenyek/${s.parcel_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition">
                      <ColorDot color={p?.color ?? '#999'} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p?.name}</div>
                        <div className="text-xs text-muted truncate">
                          {p?.variety ?? '—'} · {n(p?.area_ha)} ha · utolsó kezelés: {d(s.last_spray_date)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {phi != null && phi > 0 ? (
                          <Badge tone="red"><ShieldAlert className="size-3" /> ÉVI még {phi} nap</Badge>
                        ) : (
                          <Badge tone="green"><ShieldCheck className="size-3" /> Szüretelhető</Badge>
                        )}
                        {rei != null && rei > 0 && <Badge tone="amber">Belépés {d(s.reentry_allowed_from, 'MMM d.')}-tól</Badge>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Permetezések havonta" subtitle={`${data.season}. év`} icon={<SprayCan className="size-5" />} />
          <MonthlyChart data={data.monthly_sprays} />
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Legutóbbi permetezések"
            icon={<SprayCan className="size-5" />}
            action={<Link to="/permetezes" className="text-sm text-vine-700 dark:text-vine-300 font-medium inline-flex items-center gap-1">Napló <ArrowRight className="size-3.5" /></Link>}
          />
          {data.recent_sprays.length === 0 ? (
            <Empty icon={<SprayCan />} title="Nincs még permetezés idén" action={<Link to="/permetezes/uj" className="text-vine-700 font-medium text-sm">Első bejegyzés</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {data.recent_sprays.map((s) => (
                <li key={s.id}>
                  <Link to={`/permetezes/${s.id}`} className="flex gap-4 px-5 py-3 hover:bg-surface-2">
                    <div className="w-12 shrink-0 text-center">
                      <div className="text-[11px] uppercase text-muted">{d(s.date, 'MMM')}</div>
                      <div className="text-lg font-semibold leading-tight">{d(s.date, 'd')}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1.5">
                        {s.items.map((i, k) => <Badge key={k} tone="green">{prod(i.product_id)}</Badge>)}
                      </div>
                      <div className="text-xs text-muted mt-1 truncate">
                        {s.parcels.map((p) => pName(p.parcel_id)?.name).join(', ')} · {s.items.map((i) => i.pest).filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Fogyó készlet" subtitle="1 egység vagy kevesebb" icon={<Boxes className="size-5" />} />
          {data.low_stock.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Minden szerből van elegendő készlet.</p>
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-2">
              {data.low_stock.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge tone={p.stock < 0 ? 'red' : 'amber'}>{n(p.stock)} {p.unit}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function MonthlyChart({ data }: { data: DashboardT['monthly_sprays'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(2, ...data.map((x) => x.count))
  const ticks = [0, Math.ceil(max / 2), max]
  return (
    <div className="px-5 pb-5">
      <div className="relative h-44 pl-6">
        {ticks.map((t) => (
          <div key={t} className="absolute left-6 right-0 border-t border-dashed border-line" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="absolute -left-6 -top-2 w-5 text-right text-[10px] text-muted tabular-nums">{t}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-6 flex items-end gap-[2px]" role="img" aria-label="Permetezések száma havonta">
          {data.map((m) => (
            <div
              key={m.month}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(m.month)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cx('w-full max-w-4 rounded-t-[4px] transition-colors', hover === m.month ? 'bg-vine-700 dark:bg-vine-300' : 'bg-vine-500 dark:bg-vine-400')}
                style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count ? 3 : 0 }}
              />
              {hover === m.month && (
                <div className="pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-lg bg-surface border border-line px-2 py-1 text-xs shadow-lg">
                  <span className="text-muted">{monthShort(m.month)}:</span> <b>{m.count}</b> permetezés
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-[2px] pl-6 mt-1.5">
        {data.map((m) => (
          <span key={m.month} className="flex-1 text-center text-[10px] text-muted">{monthShort(m.month).slice(0, 3)}</span>
        ))}
      </div>
    </div>
  )
}
