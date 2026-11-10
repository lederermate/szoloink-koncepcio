import { ArrowLeft, Grape, Hammer, Pencil, ShieldAlert, ShieldCheck, SprayCan, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, useHarvests, useParcelStatus, useParcels, useProducts, useSave, useSprays, useWork } from '../lib/api'
import { d, daysUntil, huf, n } from '../lib/format'
import { Badge, Button, Card, CardHeader, Empty, Segmented, Spinner, cx } from '../components/ui'
import { ParcelModal } from './Parcels'
import { BERRY, dayToDate, ripeningLabel, useVarieties } from '../lib/varieties'
import { findVariety } from '../lib/garden'
import type { Planting } from '../../shared/types'

/** A katalógus érési dátumát (évfüggetlen) a várakozási idő évére vetíti. */
const inYear = (date: Date, ref: string) => new Date(Number(ref.slice(0, 4)), date.getMonth(), date.getDate())

type Kind = 'all' | 'spray' | 'work' | 'harvest'

export default function ParcelDetail() {
  const id = Number(useParams().id)
  const nav = useNavigate()
  const { data: parcels } = useParcels()
  const { data: status = [] } = useParcelStatus()
  const { data: sprays = [] } = useSprays(undefined, id)
  const { data: work = [] } = useWork(id)
  const { data: harvests = [] } = useHarvests(id)
  const { data: products = [] } = useProducts()
  const [edit, setEdit] = useState(false)
  const { data: varieties = [] } = useVarieties()
  const [kind, setKind] = useState<Kind>('all')
  const del = useSave(() => api(`/parcels/${id}`, { method: 'DELETE' }), [['parcels']])

  const p = parcels?.find((x) => x.id === id)
  if (!parcels) return <Spinner />
  if (!p) return <Empty icon={<Grape />} title="Az ültetvény nem található" action={<Link to="/ultetvenyek">Vissza</Link>} />
  const st = status.find((s) => s.parcel_id === id)
  const phi = daysUntil(st?.harvest_allowed_from)
  const prod = (pid: number) => products.find((x) => x.id === pid)
  // Fajtablokkok érés szerint, a várható érés és az ÉVI lejárta összevetve
  const plantRows = (pl: Planting[]) =>
    pl
      .map((x) => {
        const v = findVariety(varieties, x.variety)
        const ripe = v?.ripening_from != null && st?.harvest_allowed_from ? inYear(dayToDate(v.ripening_from), st.harvest_allowed_from) : null
        return { x, v, ripe, clash: !!ripe && ripe < new Date(st!.harvest_allowed_from!) }
      })
      .sort((a, b) => (a.v?.ripening_from ?? 999) - (b.v?.ripening_from ?? 999))

  const events = [
    ...sprays.map((s) => ({ kind: 'spray' as const, date: s.date, key: `s${s.id}`, s })),
    ...work.map((w) => ({ kind: 'work' as const, date: w.date, key: `w${w.id}`, w })),
    ...harvests.map((h) => ({ kind: 'harvest' as const, date: h.date, key: `h${h.id}`, h })),
  ]
    .filter((e) => kind === 'all' || e.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Link to="/ultetvenyek" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4">
        <ArrowLeft className="size-4" /> Ültetvényeim
      </Link>

      <Card className="overflow-hidden mb-6">
        <div className="h-2" style={{ background: p.color }} />
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted mt-1">{[p.location, p.hrsz && `hrsz. ${p.hrsz}`, p.plantings.length > 1 ? `${p.plantings.length} fajta` : p.variety, p.rootstock && `alany: ${p.rootstock}`].filter(Boolean).join(' · ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {phi != null && phi > 0 ? (
                <Badge tone="red"><ShieldAlert className="size-3" /> Élelmezés-egészségügyi várakozási idő: még {phi} nap ({d(st?.harvest_allowed_from)})</Badge>
              ) : (
                <Badge tone="green"><ShieldCheck className="size-3" /> Szüretelhető{st?.harvest_allowed_from ? ` (ÉVI lejárt: ${d(st.harvest_allowed_from)})` : ''}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/permetezes/uj?parcel=${p.id}`}><Button icon={<SprayCan className="size-4" />}>Permetezés</Button></Link>
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>Szerkesztés</Button>
            <Button
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              aria-label="Törlés"
              onClick={() => confirm(`Biztosan törli: ${p.name}? A hozzá tartozó bejegyzések is törlődnek.`) && del.mutate(undefined, { onSuccess: () => nav('/ultetvenyek') })}
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-5 border-t border-line divide-x divide-line">
          {[
            ['Terület', `${n(p.area_ha)} ha`],
            ['Tőkeszám', p.vine_count ? n(p.vine_count, 0) : '—'],
            ['Sor × tőtáv', p.row_spacing_m ? `${n(p.row_spacing_m)} × ${n(p.vine_spacing_m)} m` : '—'],
            ['Telepítés', p.planted_year ?? '—'],
            ['Művelésmód', p.training_system ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="px-5 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-medium mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Fajták az ültetvényen"
          subtitle="A permetezés az egész ültetvényre vonatkozik — a várakozási időt a legkorábban érő fajtához kell igazítani."
          icon={<Grape className="size-5" />}
        />
        {p.plantings.length === 0 ? (
          <Empty icon={<Grape />} title="Nincs fajta megadva" action={<Button variant="secondary" onClick={() => setEdit(true)}>Fajták felvétele</Button>} />
        ) : (
          <>
          <ul className="sm:hidden divide-y divide-line border-t border-line">
            {plantRows(p.plantings).map(({ x, v, ripe, clash }) => (
              <li key={x.variety} className="px-5 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  {v ? <Link to={`/szolo/${v.id}`} className="font-medium inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: BERRY[v.berry_color]?.fill }} />{x.variety}</Link> : <span className="font-medium">{x.variety}</span>}
                  {clash ? <Badge tone="red"><ShieldAlert className="size-3" /> ÉVI-ütközés</Badge> : ripe ? <Badge tone="green"><ShieldCheck className="size-3" /> rendben</Badge> : null}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {[x.rows, x.vine_count != null && `${n(x.vine_count, 0)} tő`, x.rootstock, x.planted_year, v?.ripening_from != null && `érés: ${ripeningLabel(v)}`].filter(Boolean).join(' · ')}
                </div>
                {clash && <div className="mt-1 text-xs text-red-700 dark:text-red-300">Érés ~{d(ripe!.toISOString().slice(0, 10), 'MMM d.')}, de a várakozási idő {d(st!.harvest_allowed_from, 'MMM d.')}-ig tart.</div>}
              </li>
            ))}
          </ul>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left">
                <tr className="border-y border-line">
                  {['Fajta', 'Sorok / hely', 'Tőke', 'Alany', 'Telepítés', 'Várható érés', 'Várakozási idő'].map((h) => <th key={h} className="px-5 py-2 font-medium whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {plantRows(p.plantings).map(({ x, v, ripe, clash }) => {
                    return (
                      <tr key={x.variety} className="border-b border-line last:border-0">
                        <td className="px-5 py-2.5 font-medium whitespace-nowrap">
                          {v ? <Link to={`/szolo/${v.id}`} className="inline-flex items-center gap-2 hover:text-vine-700 dark:hover:text-vine-300"><span className="size-2.5 rounded-full" style={{ background: BERRY[v.berry_color]?.fill }} />{x.variety}</Link> : x.variety}
                          {x.notes && <div className="text-xs text-muted font-normal">{x.notes}</div>}
                        </td>
                        <td className="px-5 py-2.5 text-muted whitespace-nowrap">{x.rows ?? '—'}</td>
                        <td className="px-5 py-2.5 tabular-nums">{x.vine_count != null ? n(x.vine_count, 0) : '—'}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">{x.rootstock ?? '—'}</td>
                        <td className="px-5 py-2.5">{x.planted_year ?? '—'}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">{v?.ripening_from != null ? ripeningLabel(v) : <span className="text-muted">nincs adat</span>}</td>
                        <td className="px-5 py-2.5">
                          {clash ? (
                            <Badge tone="red"><ShieldAlert className="size-3" /> érés ~{d(ripe!.toISOString().slice(0, 10), 'MMM d.')}, ÉVI {d(st!.harvest_allowed_from, 'MMM d.')}-ig</Badge>
                          ) : ripe ? (
                            <Badge tone="green"><ShieldCheck className="size-3" /> rendben</Badge>
                          ) : <span className="text-xs text-muted">—</span>}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Idővonal"
          subtitle="Permetezések, munkák és szüretek"
          action={
            <Segmented<Kind>
              value={kind}
              onChange={setKind}
              options={[{ value: 'all', label: 'Mind' }, { value: 'spray', label: 'Permet' }, { value: 'work', label: 'Munka' }, { value: 'harvest', label: 'Szüret' }]}
            />
          }
        />
        {events.length === 0 ? (
          <Empty icon={<SprayCan />} title="Nincs bejegyzés" />
        ) : (
          <ol className="relative px-5 pb-5">
            <span className="absolute left-[38px] top-2 bottom-6 w-px bg-[var(--border)]" />
            {events.map((e) => (
              <li key={e.key} className="relative flex gap-4 py-2.5">
                <span
                  className={cx(
                    'relative z-10 grid size-9 shrink-0 place-items-center rounded-xl ring-4 ring-[var(--surface)] [&>svg]:size-4',
                    e.kind === 'spray' && 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
                    e.kind === 'work' && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                    e.kind === 'harvest' && 'bg-rose-100 text-grape-600 dark:bg-rose-950 dark:text-rose-300',
                  )}
                >
                  {e.kind === 'spray' ? <SprayCan /> : e.kind === 'work' ? <Hammer /> : <Grape />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-xs text-muted">{d(e.date)}</div>
                  {e.kind === 'spray' && (
                    <Link to={`/permetezes/${e.s.id}`} className="block hover:underline">
                      <div className="font-medium">{e.s.items.map((i) => prod(i.product_id)?.name).join(' + ')}</div>
                      <div className="text-xs text-muted">{e.s.items.map((i) => `${i.pest} · ${n(i.dose)} ${i.dose_unit}`).join(' | ')}{e.s.phenology ? ` · ${e.s.phenology}` : ''}</div>
                    </Link>
                  )}
                  {e.kind === 'work' && (
                    <>
                      <div className="font-medium capitalize">{e.w.type}</div>
                      <div className="text-xs text-muted">{[e.w.hours && `${n(e.w.hours)} óra × ${e.w.workers ?? 1} fő`, e.w.cost_huf && huf(e.w.cost_huf), e.w.notes].filter(Boolean).join(' · ')}</div>
                    </>
                  )}
                  {e.kind === 'harvest' && (
                    <>
                      <div className="font-medium">Szüret: {n(e.h.quantity_kg, 0)} kg</div>
                      <div className="text-xs text-muted">{[e.h.must_degree && `${n(e.h.must_degree)} MM°`, e.h.quantity_kg && p.area_ha && `${n(e.h.quantity_kg / p.area_ha / 1000, 1)} t/ha`, e.h.buyer].filter(Boolean).join(' · ')}</div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <ParcelModal value={edit ? p : null} onClose={() => setEdit(false)} />
    </>
  )
}
