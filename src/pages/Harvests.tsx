import { Grape, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api, useHarvests, useParcelStatus, useParcels, useSave } from '../lib/api'
import { d, n, today } from '../lib/format'
import { Badge, Button, Card, ColorDot, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Stat, Textarea } from '../components/ui'
import type { Harvest } from '../../shared/types'

export default function Harvests() {
  const { data: harvests, isLoading } = useHarvests()
  const { data: parcels = [] } = useParcels()
  const [edit, setEdit] = useState<Partial<Harvest> | null>(null)
  const del = useSave((id: number) => api(`/harvests/${id}`, { method: 'DELETE' }), [['harvests']])
  const year = String(new Date().getFullYear())
  const season = (harvests ?? []).filter((h) => h.date.startsWith(year))
  const kg = season.reduce((a, h) => a + h.quantity_kg, 0)
  const avgMust = kg ? season.reduce((a, h) => a + (h.must_degree ?? 0) * h.quantity_kg, 0) / kg : null
  const area = parcels.filter((p) => season.some((h) => h.parcel_id === p.id)).reduce((a, p) => a + p.area_ha, 0)
  const pa = (id: number) => parcels.find((p) => p.id === id)

  return (
    <>
      <PageHeader title="Szüret" subtitle="Termésmennyiség és mustfok nyilvántartás" actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit({ date: today(), parcel_id: parcels[0]?.id })}>Új szüret</Button>} />
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label={`Termés ${year}`} value={n(kg / 1000, 1)} unit="t" icon={<Grape />} tone="grape" />
        <Stat label="Átlag termésátlag" value={area ? n(kg / area / 1000, 1) : '—'} unit="t/ha" icon={<Grape />} />
        <Stat label="Súlyozott mustfok" value={avgMust ? n(avgMust, 1) : '—'} unit="MM°" icon={<Grape />} tone="amber" />
      </div>
      {isLoading ? <Spinner /> : !harvests?.length ? (
        <Card><Empty icon={<Grape />} title="Nincs még szüret rögzítve" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {harvests.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 cursor-pointer" onClick={() => setEdit(h)}>
                <div className="w-24 shrink-0 text-sm font-medium">{d(h.date)}</div>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><ColorDot color={pa(h.parcel_id)?.color ?? '#999'} />{pa(h.parcel_id)?.name}</span>
                  <span className="text-xs text-muted">{pa(h.parcel_id)?.variety}{h.buyer ? ` · ${h.buyer}` : ''}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{n(h.quantity_kg, 0)} kg</div>
                  {h.must_degree && <Badge tone="grape">{n(h.must_degree, 1)} MM°</Badge>}
                </div>
                <Button variant="ghost" size="sm" aria-label="Törlés" onClick={(e) => { e.stopPropagation(); if (confirm('Törli a bejegyzést?')) del.mutate(h.id) }}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <HarvestModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

function HarvestModal({ value, onClose }: { value: Partial<Harvest> | null; onClose: () => void }) {
  const { data: parcels = [] } = useParcels()
  const { data: status = [] } = useParcelStatus()
  const [f, setF] = useState<Partial<Harvest>>({})
  const [prev, setPrev] = useState<typeof value>(null)
  if (value !== prev) { setPrev(value); setF(value ?? {}) }
  const save = useSave((b: Partial<Harvest>) => (b.id ? api(`/harvests/${b.id}`, { method: 'PUT', json: b }) : api('/harvests', { method: 'POST', json: b })), [['harvests']])
  const num = (v: string) => (v === '' ? null : Number(v))
  const allowed = status.find((s) => s.parcel_id === f.parcel_id)?.harvest_allowed_from
  const blocked = !!(allowed && f.date && f.date < allowed)
  return (
    <Modal open={!!value} onClose={onClose} title={f.id ? 'Szüret szerkesztése' : 'Új szüret'}
      footer={<>{save.error && <span className="mr-auto self-center text-sm text-red-600">{save.error.message}</span>}<Button variant="secondary" onClick={onClose}>Mégse</Button><Button loading={save.isPending} onClick={() => save.mutate(f, { onSuccess: onClose })}>Mentés</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ültetvény" className="col-span-2"><Select value={f.parcel_id ?? ''} onChange={(e) => setF({ ...f, parcel_id: Number(e.target.value) })}>{parcels.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.variety}</option>)}</Select></Field>
        <Field label="Dátum"><Input type="date" value={f.date ?? ''} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Mennyiség (kg)"><Input type="number" value={f.quantity_kg ?? ''} onChange={(e) => setF({ ...f, quantity_kg: Number(e.target.value) })} /></Field>
        {blocked && <p className="col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">Figyelem: az élelmezés-egészségügyi várakozási idő csak {d(allowed)}-án jár le ezen az ültetvényen!</p>}
        <Field label="Mustfok (MM°)"><Input type="number" step="0.1" value={f.must_degree ?? ''} onChange={(e) => setF({ ...f, must_degree: num(e.target.value) })} /></Field>
        <Field label="Felvásárló / feldolgozás"><Input value={f.buyer ?? ''} onChange={(e) => setF({ ...f, buyer: e.target.value || null })} /></Field>
        <Field label="Megjegyzés" className="col-span-2"><Textarea value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value || null })} /></Field>
      </div>
    </Modal>
  )
}
