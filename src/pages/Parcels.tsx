import { Map, Plus, Ruler, Sprout, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fold, useVarieties } from '../lib/varieties'
import { api, useParcelStatus, useParcels, useSave } from '../lib/api'
import { PARCEL_COLORS, ROOTSTOCKS, TRAINING, VARIETIES } from '../lib/constants'
import { d, daysUntil, n } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Spinner, Textarea, cx } from '../components/ui'
import type { Parcel, Planting } from '../../shared/types'

const blank = (variety = ''): Planting => ({ variety, rows: null, vine_count: null, rootstock: null, planted_year: null, notes: null })

export default function Parcels() {
  const { data: parcels, isLoading } = useParcels()
  const { data: status = [] } = useParcelStatus()
  const [edit, setEdit] = useState<Partial<Parcel> | null>(null)
  const [sp, setSp] = useSearchParams()
  const { data: varieties = [] } = useVarieties()
  useEffect(() => {
    const v = sp.get('uj')
    if (v && parcels) {
      setEdit({ color: PARCEL_COLORS[parcels.length % PARCEL_COLORS.length], plantings: [blank(v)], name: v })
      setSp({}, { replace: true })
    }
  }, [sp, parcels, setSp])
  const varietyOf = (name: string | null) => varieties.find((v) => fold(v.name) === fold(name ?? ''))
  const nVar = new Set(parcels?.flatMap((p) => p.plantings.map((x) => fold(x.variety)))).size
  const total = parcels?.reduce((a, p) => a + p.area_ha, 0) ?? 0

  return (
    <>
      <PageHeader
        title="Ültetvényeim"
        subtitle={parcels ? `${parcels.length} ültetvény · ${n(total)} ha · ${nVar} fajta — egy ültetvényen több fajta is lehet` : undefined}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit({ color: PARCEL_COLORS[(parcels?.length ?? 0) % PARCEL_COLORS.length], plantings: [blank()] })}>Új ültetvény</Button>}
      />
      {isLoading ? (
        <Spinner />
      ) : !parcels?.length ? (
        <Card>
          <Empty icon={<Map />} title="Még nincs ültetvény" text="Vegye fel a dűlőket, parcellákat a helyrajzi számmal és a rajtuk lévő fajtákkal." action={<Button onClick={() => setEdit({ color: PARCEL_COLORS[0], plantings: [blank()] })}>Ültetvény felvétele</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcels.map((p) => {
            const st = status.find((s) => s.parcel_id === p.id)
            const phi = daysUntil(st?.harvest_allowed_from)
            return (
              <Link key={p.id} to={`/ultetvenyek/${p.id}`} className="group">
                <Card className="overflow-hidden transition group-hover:shadow-lg group-hover:-translate-y-0.5">
                  <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)` }}>
                    <VineRows />
                    <div className="absolute bottom-2 right-3 text-white/90 text-xs font-medium">{n(p.area_ha)} ha</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{p.name}</h3>
                        <p className="text-xs text-muted truncate">{[p.location, p.hrsz && `hrsz. ${p.hrsz}`].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      {phi != null && phi > 0 ? <Badge tone="red">ÉVI {phi} nap</Badge> : <Badge tone="green">Szüretelhető</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.plantings.slice(0, 4).map((x) => (
                        <Badge key={x.variety} tone={varietyOf(x.variety) ? 'brand' : 'neutral'}>
                          <Sprout className="size-3" />{x.variety}{p.plantings.length > 1 && x.vine_count ? <span className="text-muted font-normal">· {n(x.vine_count, 0)}</span> : null}
                        </Badge>
                      ))}
                      {p.plantings.length > 4 && <Badge>+{p.plantings.length - 4} fajta</Badge>}
                      {!p.plantings.length && <span className="text-xs text-muted">nincs fajta megadva</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <Info icon={<Ruler className="size-3.5" />} label={p.row_spacing_m && p.vine_spacing_m ? `${n(p.row_spacing_m)} × ${n(p.vine_spacing_m)} m` : p.training_system ?? '—'} />
                      <Info icon={<Sprout className="size-3.5" />} label={p.vine_count ? `${n(p.vine_count, 0)} tőke` : '—'} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-line flex justify-between text-xs text-muted">
                      <span>{st?.sprays_this_season ?? 0} kezelés idén</span>
                      <span>utolsó: {d(st?.last_spray_date, 'MMM d.')}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
      <ParcelModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

const Info = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="flex items-center gap-1.5 text-muted truncate">{icon}<span className="truncate text-fg">{label}</span></span>
)

function VineRows() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 40" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${-20 + i * 16} 40 Q ${-8 + i * 16} 20 ${4 + i * 16} 0`} stroke="white" strokeWidth="1.2" fill="none" strokeDasharray="1.5 2" />
      ))}
    </svg>
  )
}

export function ParcelModal({ value, onClose }: { value: Partial<Parcel> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Parcel>>({})
  const [prev, setPrev] = useState<typeof value>(null)
  if (value !== prev) {
    setPrev(value)
    setF(value ?? {})
  }
  const catalog = (useVarieties().data ?? []).map((v) => v.name)
  const save = useSave((b: Partial<Parcel>) => (b.id ? api(`/parcels/${b.id}`, { method: 'PUT', json: b }) : api('/parcels', { method: 'POST', json: b })), [['parcels']])
  const set = (k: keyof Parcel) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))
  const autoCount = f.area_ha && f.row_spacing_m && f.vine_spacing_m ? Math.round((f.area_ha * 10000) / (f.row_spacing_m * f.vine_spacing_m)) : null
  const pls = f.plantings ?? []
  const setPl = (i: number, k: keyof Planting, val: string) =>
    setF((x) => ({ ...x, plantings: pls.map((p, j) => (j === i ? { ...p, [k]: ['vine_count', 'planted_year'].includes(k) ? (val === '' ? null : Number(val)) : val || null } : p)) }))
  const counted = pls.reduce((a, p) => a + (p.vine_count ?? 0), 0)
  const body = () => {
    const plantings = pls.filter((p) => p.variety?.trim())
    // egyfajtás ültetvénynél a hiányzó tőkeszámot a sor- és tőtávból számoljuk
    if (plantings.length === 1 && plantings[0].vine_count == null && autoCount) plantings[0] = { ...plantings[0], vine_count: autoCount }
    return { ...f, plantings }
  }

  return (
    <Modal
      open={!!value}
      onClose={onClose}
      title={f.id ? 'Ültetvény szerkesztése' : 'Új ültetvény'}
      wide
      footer={
        <>
          {save.error && <span className="mr-auto text-sm text-red-600 self-center">{save.error.message}</span>}
          <Button variant="secondary" onClick={onClose}>Mégse</Button>
          <Button loading={save.isPending} onClick={() => save.mutate(body(), { onSuccess: onClose })}>Mentés</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Megnevezés *"><Input value={f.name ?? ''} onChange={set('name')} placeholder="pl. Öreg-hegy" autoFocus /></Field>
        <Field label="Terület (ha) *"><Input type="number" step="0.0001" value={f.area_ha ?? ''} onChange={set('area_ha')} /></Field>
        <Field label="Helyrajzi szám"><Input value={f.hrsz ?? ''} onChange={set('hrsz')} placeholder="0123/4" /></Field>
        <Field label="Település / dűlő"><Input value={f.location ?? ''} onChange={set('location')} /></Field>
        <Field label="Művelésmód">
          <Input list="training" value={f.training_system ?? ''} onChange={set('training_system')} />
          <datalist id="training">{TRAINING.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Sortáv (m)"><Input type="number" step="0.1" value={f.row_spacing_m ?? ''} onChange={set('row_spacing_m')} /></Field>
        <Field label="Tőtáv (m)"><Input type="number" step="0.1" value={f.vine_spacing_m ?? ''} onChange={set('vine_spacing_m')} /></Field>
        <Field label="Szín">
          <div className="flex gap-2 h-10 items-center">
            {PARCEL_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setF((x) => ({ ...x, color: c }))} className={cx('size-7 rounded-full transition', f.color === c && 'ring-2 ring-offset-2 ring-vine-500 ring-offset-[var(--surface)]')} style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </Field>
        <Field label="Megjegyzés" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div>
            <h4 className="font-semibold">Fajták az ültetvényen</h4>
            <p className="text-xs text-muted">Sorok, tőkeszám, alany és telepítési év fajtánként — vegyes telepítés, pótlás, hobbikert is.</p>
          </div>
          <span className="text-xs text-muted whitespace-nowrap">
            {counted ? `${n(counted, 0)} tőke` : ''}{autoCount ? ` · számított: ~${n(autoCount, 0)}` : ''}
          </span>
        </div>
        <datalist id="varieties">{[...new Set([...catalog, ...VARIETIES])].map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="rootstocks">{ROOTSTOCKS.map((v) => <option key={v} value={v} />)}</datalist>
        <div className="flex flex-col gap-3">
          {pls.map((p, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-2/50 p-3 grid gap-2 grid-cols-2 sm:grid-cols-[2fr_1.3fr_0.8fr_1.2fr_0.8fr_auto] items-end">
              <Field label="Fajta" className="col-span-2 sm:col-span-1"><Input list="varieties" value={p.variety} onChange={(e) => setPl(i, 'variety', e.target.value)} placeholder="pl. Olaszrizling" /></Field>
              <Field label="Sorok / hely"><Input value={p.rows ?? ''} onChange={(e) => setPl(i, 'rows', e.target.value)} placeholder="1–12. sor" /></Field>
              <Field label="Tőke"><Input type="number" value={p.vine_count ?? ''} onChange={(e) => setPl(i, 'vine_count', e.target.value)} /></Field>
              <Field label="Alany"><Input list="rootstocks" value={p.rootstock ?? ''} onChange={(e) => setPl(i, 'rootstock', e.target.value)} /></Field>
              <Field label="Telepítés"><Input type="number" value={p.planted_year ?? ''} onChange={(e) => setPl(i, 'planted_year', e.target.value)} placeholder="év" /></Field>
              <Button variant="ghost" className="justify-self-end" icon={<Trash2 className="size-4" />} aria-label="Fajta törlése" onClick={() => setF((x) => ({ ...x, plantings: pls.filter((_, j) => j !== i) }))} />
            </div>
          ))}
          <Button variant="secondary" className="self-start" icon={<Plus className="size-4" />} onClick={() => setF((x) => ({ ...x, plantings: [...pls, blank()] }))}>Fajta hozzáadása</Button>
        </div>
      </div>
    </Modal>
  )
}
