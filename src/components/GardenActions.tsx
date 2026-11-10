// „Szőlőimhez” és „Listára” gombok — a fajta adatlapról és a kártyákról.
import { Check, Globe, ListPlus, Lock, Plus, Search, Sprout, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, useLists, useSave } from '../lib/api'
import { useMyVarieties } from '../lib/garden'
import { matchScore, ripeningLabel, useVarieties } from '../lib/varieties'
import { GrapeArt } from './Grape'
import { Button, Input, Modal, cx } from './ui'
import type { GrapeList, Variety } from '../../shared/types'

const inv = [['collection'], ['lists']]

export function CollectionToggle({ v, size }: { v: Variety; size?: 'sm' }) {
  const { data } = useMyVarieties()
  const m = data?.find((x) => x.variety?.id === v.id)
  const save = useSave((on: boolean) => api(`/collection/${v.id}`, { method: on ? 'PUT' : 'DELETE', json: on ? { note: null } : undefined }), inv)
  if (m?.plantings.length && !m.manual)
    return (
      <Link to={`/ultetvenyek/${m.plantings[0].parcel.id}`} title={`Ültetvényben: ${m.plantings.map((p) => p.parcel.name).join(', ')}`}>
        <Button size={size} variant="secondary" icon={<Sprout className="size-4" />}>Ültetvényemben</Button>
      </Link>
    )
  const on = !!m
  return (
    <Button size={size} variant={on ? 'secondary' : 'primary'} loading={save.isPending} icon={on ? <Check className="size-4" /> : <Star className="size-4" />} onClick={() => save.mutate(!on)}>
      {on ? 'Szőlőim között' : 'Szőlőimhez'}
    </Button>
  )
}

export function AddToList({ v, size }: { v: Variety; size?: 'sm' }) {
  const [open, setOpen] = useState(false)
  const { data: lists = [] } = useLists()
  const n = lists.filter((l) => l.items.some((i) => i.variety_id === v.id)).length
  return (
    <>
      <Button size={size} variant="secondary" icon={<ListPlus className="size-4" />} onClick={() => setOpen(true)}>
        Listára{n ? ` (${n})` : ''}
      </Button>
      <ListPicker v={v} open={open} onClose={() => setOpen(false)} lists={lists} />
    </>
  )
}

function ListPicker({ v, open, onClose, lists }: { v: Variety; open: boolean; onClose: () => void; lists: GrapeList[] }) {
  const [name, setName] = useState('')
  const toggle = useSave(({ id, on }: { id: number; on: boolean }) => api(`/lists/${id}/items/${v.id}`, { method: on ? 'PUT' : 'DELETE', json: on ? { note: null } : undefined }), inv)
  const create = useSave((n: string) => api('/lists', { method: 'POST', json: { name: n, public: false, items: [{ variety_id: v.id, note: null }] } }), inv)
  return (
    <Modal open={open} onClose={onClose} title={`${v.name} hozzáadása listához`} footer={<Button onClick={onClose}>Kész</Button>}>
      <ul className="flex flex-col gap-1 -mx-2">
        {lists.map((l) => {
          const on = l.items.some((i) => i.variety_id === v.id)
          return (
            <li key={l.id}>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
                onClick={() => toggle.mutate({ id: l.id, on: !on })}
              >
                <span className={cx('grid size-5 place-items-center rounded-md border', on ? 'border-vine-600 bg-vine-600 text-white' : 'border-line')}>{on && <Check className="size-3.5" />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{l.name}</span>
                  <span className="block text-xs text-muted">{l.items.length} fajta</span>
                </span>
                {l.public ? <Globe className="size-4 text-muted" aria-label="nyilvános" /> : <Lock className="size-4 text-muted" aria-label="privát" />}
              </button>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-4 flex gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) create.mutate(name.trim(), { onSuccess: () => setName('') })
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Új lista neve, pl. Kívánságlista" />
        <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} loading={create.isPending}>Létrehoz</Button>
      </form>
    </Modal>
  )
}

/** Fajta kiválasztása a katalógusból (elírástűrő kereséssel). */
export function VarietyPicker({ open, onClose, onPick, exclude, title = 'Fajta hozzáadása' }: {
  open: boolean; onClose: () => void; onPick: (v: Variety) => void; exclude: Set<number>; title?: string
}) {
  const { data: varieties = [] } = useVarieties()
  const [q, setQ] = useState('')
  const hits = varieties
    .map((v) => ({ v, s: matchScore(v, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.v.popularity - a.v.popularity)
    .slice(0, 10)
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <Input autoFocus className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fajta neve (elírástűrő)…" />
      </div>
      <ul className="flex flex-col gap-1 -mx-2">
        {hits.map(({ v }) => {
          const has = exclude.has(v.id)
          return (
            <li key={v.id}>
              <button disabled={has} onClick={() => onPick(v)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2 disabled:opacity-60">
                <GrapeArt v={v} className="size-10 rounded-lg shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{v.name}</span>
                  <span className="block text-xs text-muted truncate">{[v.berry_color, v.ripening_from != null && ripeningLabel(v)].filter(Boolean).join(' · ')}</span>
                </span>
                {has ? <Check className="size-4 text-vine-600" /> : <Plus className="size-4 text-muted" />}
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
