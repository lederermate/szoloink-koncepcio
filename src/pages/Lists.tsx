// „Listáim” — saját fajtalisták (csere, kívánságlista, beszerzés…). Nyilvánosra állítva linkkel megoszthatók.
import { ArrowLeft, Check, Copy, Globe, ListChecks, Lock, MessageSquare, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, useList, useLists, useSave } from '../lib/api'
import { appHref } from '../lib/env'
import { useMyVarieties } from '../lib/garden'
import { ME } from '../lib/mock'
import { BERRY, ripeningLabel, useVarieties } from '../lib/varieties'
import { GrapeArt } from '../components/Grape'
import { VarietyPicker } from '../components/GardenActions'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Spinner, Textarea, cx } from '../components/ui'
import type { GrapeList, Variety } from '../../shared/types'

const shareUrl = (id: number) => new URL(appHref(`/lista/${id}`), location.href).href

export function Lists() {
  const { data: lists, isLoading } = useLists()
  const { data: varieties = [] } = useVarieties()
  const [create, setCreate] = useState(false)
  const vById = (id: number) => varieties.find((v) => v.id === id)

  return (
    <>
      <PageHeader
        title="Listáim"
        subtitle="Cserére szánt vesszők, kívánságlista, újonnan beszerzett fajták — csak te látod őket, amíg nyilvánosra nem állítod és meg nem osztod a linket."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setCreate(true)}>Új lista</Button>}
      />
      {isLoading ? <Spinner /> : !lists?.length ? (
        <Card><Empty icon={<ListChecks />} title="Még nincs listád" action={<Button onClick={() => setCreate(true)}>Új lista</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => (
            <Link key={l.id} to={`/listaim/${l.id}`} className="group">
              <Card className="h-full p-4 flex flex-col gap-3 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug group-hover:text-vine-700 dark:group-hover:text-vine-300">{l.name}</h3>
                  {l.public ? <Badge tone="green"><Globe className="size-3" />nyilvános</Badge> : <Badge><Lock className="size-3" />privát</Badge>}
                </div>
                {l.description && <p className="text-sm text-muted line-clamp-2">{l.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex -space-x-2">
                    {l.items.slice(0, 5).map((i) => {
                      const v = vById(i.variety_id)
                      return v && <GrapeArt key={i.variety_id} v={v} className="size-9 rounded-full ring-2 ring-[var(--surface)]" />
                    })}
                  </div>
                  <span className="text-sm text-muted">{l.items.length} fajta</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <ListModal open={create} onClose={() => setCreate(false)} />
    </>
  )
}

function ListModal({ open, onClose, list }: { open: boolean; onClose: () => void; list?: GrapeList }) {
  const nav = useNavigate()
  const [f, setF] = useState({ name: list?.name ?? '', description: list?.description ?? '', public: list?.public ?? false })
  const [prev, setPrev] = useState(open)
  if (open !== prev) {
    setPrev(open)
    if (open) setF({ name: list?.name ?? '', description: list?.description ?? '', public: list?.public ?? false })
  }
  const save = useSave((b: typeof f) => api<GrapeList>(list ? `/lists/${list.id}` : '/lists', { method: list ? 'PUT' : 'POST', json: b }), [['lists']])
  return (
    <Modal open={open} onClose={onClose} title={list ? 'Lista szerkesztése' : 'Új lista'}
      footer={<>
        {save.error && <span className="mr-auto self-center text-sm text-red-600">{save.error.message}</span>}
        <Button variant="secondary" onClick={onClose}>Mégse</Button>
        <Button loading={save.isPending} onClick={() => save.mutate(f, { onSuccess: (r) => { onClose(); if (!list) nav(`/listaim/${r.id}`) } })}>Mentés</Button>
      </>}>
      <div className="grid gap-4">
        <Field label="Név *"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="pl. Cserélhető vesszők" /></Field>
        <Field label="Leírás"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Mit, mikor, milyen feltételekkel…" /></Field>
        <PublicSwitch value={f.public} onChange={(v) => setF({ ...f, public: v })} />
      </div>
    </Modal>
  )
}

function PublicSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', value ? 'bg-vine-600' : 'bg-[var(--border)]')}>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span className="text-sm">
        <span className="font-medium">Nyilvános lista</span>
        <span className="block text-muted text-xs">A linkkel bárki megnézheti (bejelentkezés nélkül is). Privát listát csak te látsz.</span>
      </span>
    </label>
  )
}

export function ListDetail() {
  const id = Number(useParams().id)
  const nav = useNavigate()
  const { data: list, isLoading, error } = useList(id)
  const { data: varieties = [] } = useVarieties()
  const [pick, setPick] = useState(false)
  const [edit, setEdit] = useState(false)
  const [copied, setCopied] = useState(false)
  const inv = [['lists']]
  const setItem = useSave(({ vid, note }: { vid: number; note: string | null }) => api(`/lists/${id}/items/${vid}`, { method: 'PUT', json: { note } }), inv)
  const delItem = useSave((vid: number) => api(`/lists/${id}/items/${vid}`, { method: 'DELETE' }), inv)
  const setPublic = useSave((pub: boolean) => api(`/lists/${id}`, { method: 'PUT', json: { public: pub } }), inv)
  const del = useSave(() => api(`/lists/${id}`, { method: 'DELETE' }), inv)
  if (isLoading) return <Spinner />
  if (!list || error) return <Empty icon={<ListChecks />} title="A lista nem található" action={<Link to="/listaim">Vissza a listákhoz</Link>} />
  const vById = (vid: number) => varieties.find((v) => v.id === vid)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(id))
    } catch {
      prompt('A lista linkje:', shareUrl(id))
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Link to="/listaim" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4"><ArrowLeft className="size-4" /> Listáim</Link>
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
            {list.description && <p className="text-muted mt-1">{list.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setEdit(true)}>Szerkesztés</Button>
            <Button variant="ghost" icon={<Trash2 className="size-4" />} aria-label="Lista törlése"
              onClick={() => confirm(`Törli a(z) „${list.name}” listát?`) && del.mutate(undefined, { onSuccess: () => nav('/listaim') })} />
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-line flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1"><PublicSwitch value={list.public} onChange={(v) => setPublic.mutate(v)} /></div>
          {list.public && (
            <div className="flex gap-2 items-center min-w-0">
              <Input readOnly value={shareUrl(id)} className="h-9 text-xs lg:w-80" onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="secondary" icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={copy}>{copied ? 'Másolva' : 'Link másolása'}</Button>
              <Link to={`/lista/${id}`}><Button size="sm" variant="ghost">Előnézet</Button></Link>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{list.items.length} fajta</h2>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setPick(true)}>Fajta hozzáadása</Button>
      </div>
      {list.items.length === 0 ? (
        <Card><Empty icon={<ListChecks />} title="Üres lista" text="Adj hozzá fajtákat a katalógusból — vagy bármelyik fajta adatlapján a „Listára” gombbal." /></Card>
      ) : (
        <Card className="divide-y divide-line">
          {list.items.map((it) => {
            const v = vById(it.variety_id)
            return v ? <ItemRow key={it.variety_id} v={v} note={it.note} onNote={(note) => setItem.mutate({ vid: v.id, note })} onRemove={() => delItem.mutate(v.id)} /> : null
          })}
        </Card>
      )}
      <VarietyPicker open={pick} onClose={() => setPick(false)} exclude={new Set(list.items.map((i) => i.variety_id))} onPick={(v) => setItem.mutate({ vid: v.id, note: null })} title={`Hozzáadás: ${list.name}`} />
      <ListModal open={edit} onClose={() => setEdit(false)} list={list} />
    </>
  )
}

function ItemRow({ v, note, onNote, onRemove }: { v: Variety; note: string | null; onNote: (n: string | null) => void; onRemove: () => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/szolo/${v.id}`} className="shrink-0"><GrapeArt v={v} className="size-12 rounded-xl" /></Link>
      <div className="min-w-0 flex-1">
        <Link to={`/szolo/${v.id}`} className="font-medium hover:text-vine-700 dark:hover:text-vine-300">{v.name}</Link>
        {draft == null ? (
          <button className="block text-left text-xs text-muted hover:text-fg truncate max-w-full" onClick={() => setDraft(note ?? '')}>{note || '+ megjegyzés (pl. „5 vessző”)'}</button>
        ) : (
          <form className="mt-1 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); onNote(draft || null); setDraft(null) }}>
            <Input autoFocus className="h-8 text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button size="sm" type="submit">OK</Button>
          </form>
        )}
      </div>
      <span className="hidden sm:block text-xs text-muted whitespace-nowrap">{v.ripening_from != null ? ripeningLabel(v) : ''}</span>
      <Button variant="ghost" size="sm" className="px-2" aria-label="Eltávolítás" onClick={onRemove}><Trash2 className="size-4" /></Button>
    </div>
  )
}

/** Nyilvános nézet — ezt látja, aki megkapja a linket. */
export function PublicList() {
  const id = Number(useParams().id)
  const { data: list, isLoading } = useList(id)
  const { data: varieties = [] } = useVarieties()
  const { ids: mine } = useMyVarieties()
  if (isLoading) return <Spinner />
  if (!list || !list.public)
    return <Card><Empty icon={<Lock />} title="Ez a lista nem nyilvános" text="A tulajdonosa privátra állította, vagy törölte." action={<Link to="/szolok">Fajták böngészése</Link>} /></Card>
  return (
    <>
      <Card className="mb-6 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: ME.color }}>{ME.initials}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted">{ME.name} listája · {ME.city}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          {list.description && <p className="text-muted mt-1">{list.description}</p>}
        </div>
        <Link to={`/uzenetek?to=${ME.id}`}><Button variant="secondary" icon={<MessageSquare className="size-4" />}>Üzenet a gazdának</Button></Link>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.items.map((it) => {
          const v = varieties.find((x) => x.id === it.variety_id)
          if (!v) return null
          return (
            <Link key={v.id} to={`/szolo/${v.id}`} className="group">
              <Card className="p-3 flex gap-3 items-center transition group-hover:shadow-lg">
                <GrapeArt v={v} className="size-16 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate group-hover:text-vine-700 dark:group-hover:text-vine-300">{v.name}</div>
                  {it.note && <div className="text-sm">{it.note}</div>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge><span className="size-2 rounded-full" style={{ background: BERRY[v.berry_color]?.fill }} />{v.berry_color}</Badge>
                    {mine.has(v.id) && <Badge tone="brand"><Star className="size-3" />nekem is megvan</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
      <p className="mt-6 text-xs text-muted">Koncepció: a valós rendszerben a nyilvános lista bejelentkezés nélkül is megnyitható, és a fajtáidat összeveti a listával („nekem is megvan”).</p>
    </>
  )
}
