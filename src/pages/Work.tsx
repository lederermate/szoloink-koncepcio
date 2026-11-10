import { Hammer, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api, useParcels, useSave, useWork } from '../lib/api'
import { WORK_TYPES } from '../lib/constants'
import { d, huf, n, today } from '../lib/format'
import { Badge, Button, Card, ColorDot, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui'
import type { WorkEntry } from '../../shared/types'

export default function Work() {
  const { data: work, isLoading } = useWork()
  const { data: parcels = [] } = useParcels()
  const [edit, setEdit] = useState<Partial<WorkEntry> | null>(null)
  const del = useSave((id: number) => api(`/work/${id}`, { method: 'DELETE' }), [['work']])
  const pa = (id: number) => parcels.find((p) => p.id === id)
  const year = String(new Date().getFullYear())
  const season = (work ?? []).filter((w) => w.date.startsWith(year))

  return (
    <>
      <PageHeader
        title="Munkanapló"
        subtitle={`${year}: ${n(season.reduce((a, w) => a + (w.hours ?? 0) * (w.workers ?? 1), 0), 0)} munkaóra · ${huf(season.reduce((a, w) => a + (w.cost_huf ?? 0), 0))}`}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit({ date: today(), type: 'metszés', workers: 1, parcel_id: parcels[0]?.id })}>Új munka</Button>}
      />
      {isLoading ? <Spinner /> : !work?.length ? (
        <Card><Empty icon={<Hammer />} title="Nincs még munka rögzítve" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {work.map((w) => (
              <li key={w.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 cursor-pointer" onClick={() => setEdit(w)}>
                <div className="w-20 shrink-0 text-sm font-medium">{d(w.date, 'MMM d.')}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><Badge tone="amber" className="capitalize">{w.type}</Badge><span className="flex items-center gap-1.5 text-sm truncate"><ColorDot color={pa(w.parcel_id)?.color ?? '#999'} />{pa(w.parcel_id)?.name}</span></div>
                  {w.notes && <div className="text-xs text-muted mt-1 truncate">{w.notes}</div>}
                </div>
                <div className="text-right text-sm">
                  <div>{w.hours ? `${n(w.hours)} ó × ${w.workers ?? 1} fő` : '—'}</div>
                  <div className="text-xs text-muted">{w.cost_huf ? huf(w.cost_huf) : ''}</div>
                </div>
                <Button variant="ghost" size="sm" aria-label="Törlés" onClick={(e) => { e.stopPropagation(); if (confirm('Törli a bejegyzést?')) del.mutate(w.id) }}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <WorkModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

function WorkModal({ value, onClose }: { value: Partial<WorkEntry> | null; onClose: () => void }) {
  const { data: parcels = [] } = useParcels()
  const [f, setF] = useState<Partial<WorkEntry>>({})
  const [prev, setPrev] = useState<typeof value>(null)
  if (value !== prev) { setPrev(value); setF(value ?? {}) }
  const save = useSave((b: Partial<WorkEntry>) => (b.id ? api(`/work/${b.id}`, { method: 'PUT', json: b }) : api('/work', { method: 'POST', json: b })), [['work']])
  const num = (v: string) => (v === '' ? null : Number(v))
  return (
    <Modal open={!!value} onClose={onClose} title={f.id ? 'Munka szerkesztése' : 'Új munka'}
      footer={<>{save.error && <span className="mr-auto self-center text-sm text-red-600">{save.error.message}</span>}<Button variant="secondary" onClick={onClose}>Mégse</Button><Button loading={save.isPending} onClick={() => save.mutate(f, { onSuccess: onClose })}>Mentés</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Dátum"><Input type="date" value={f.date ?? ''} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Munka típusa"><Select value={f.type ?? ''} onChange={(e) => setF({ ...f, type: e.target.value as WorkEntry['type'] })}>{WORK_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Ültetvény" className="col-span-2"><Select value={f.parcel_id ?? ''} onChange={(e) => setF({ ...f, parcel_id: Number(e.target.value) })}>{parcels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Óra / fő"><Input type="number" step="0.5" value={f.hours ?? ''} onChange={(e) => setF({ ...f, hours: num(e.target.value) })} /></Field>
        <Field label="Létszám"><Input type="number" value={f.workers ?? ''} onChange={(e) => setF({ ...f, workers: num(e.target.value) })} /></Field>
        <Field label="Költség (Ft)" className="col-span-2"><Input type="number" value={f.cost_huf ?? ''} onChange={(e) => setF({ ...f, cost_huf: num(e.target.value) })} /></Field>
        <Field label="Megjegyzés" className="col-span-2"><Textarea value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value || null })} /></Field>
      </div>
    </Modal>
  )
}
