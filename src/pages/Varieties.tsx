import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TAG_CATEGORIES } from '../../shared/tags'
import { api, useSave } from '../lib/api'
import { BERRY, useVarieties } from '../lib/varieties'
import { GrapeArt, RipeningBar } from '../components/Grape'
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, cx } from '../components/ui'
import type { Variety } from '../../shared/types'

const letterOf = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '')[0]?.toUpperCase() ?? '#'

export default function Varieties() {
  const { data, isLoading } = useVarieties()
  const [edit, setEdit] = useState<Partial<Variety> | null>(null)
  if (isLoading || !data) return <Spinner />
  const groups = new Map<string, Variety[]>()
  for (const v of [...data].sort((a, b) => a.name.localeCompare(b.name, 'hu'))) {
    const l = letterOf(v.name)
    groups.set(l, [...(groups.get(l) ?? []), v])
  }
  const letters = [...groups.keys()]

  return (
    <>
      <PageHeader title="Szőlőfajták A–Z" subtitle={`${data.length} fajta ábécérendben`} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit({ berry_color: 'fehér', tags: [], links: [] })}>Új szőlő</Button>} />
      <div className="sticky top-14 lg:top-16 z-20 -mx-4 sm:mx-0 mb-5 overflow-x-auto bg-app/90 backdrop-blur px-4 sm:px-0 py-2">
        <div className="flex gap-1">
          {letters.map((l) => (
            <a key={l} href={`#betu-${l}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-medium text-muted hover:bg-vine-100 hover:text-vine-800 dark:hover:bg-vine-900/50 dark:hover:text-vine-100">{l}</a>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        {letters.map((l) => (
          <section key={l} id={`betu-${l}`} className="scroll-mt-32">
            <h2 className="text-sm font-semibold text-muted mb-2">{l} betűvel kezdődő fajták</h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {groups.get(l)!.map((v) => (
                  <li key={v.id}>
                    <Link to={`/szolo/${v.id}`} className="grid grid-cols-[48px_1fr] sm:grid-cols-[48px_1fr_280px] items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                      <GrapeArt v={v} className="size-12 rounded-lg" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.name}</div>
                        <div className="text-xs text-muted truncate">{v.other_names || '—'}</div>
                      </div>
                      <div className="hidden sm:block"><RipeningBar v={v} compact /></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
      <VarietyModal value={edit} onClose={() => setEdit(null)} />
    </>
  )
}

export function VarietyModal({ value, onClose }: { value: Partial<Variety> | null; onClose: () => void }) {
  const [f, setF] = useState<Partial<Variety>>({})
  const [prev, setPrev] = useState<typeof value>(null)
  if (value !== prev) {
    setPrev(value)
    setF(value ?? {})
  }
  const save = useSave((b: Partial<Variety>) => (b.id ? api(`/varieties/${b.id}`, { method: 'PUT', json: b }) : api('/varieties', { method: 'POST', json: b })), [['varieties']])
  const tags = f.tags ?? []
  const num = (s: string) => (s === '' ? null : Number(s))
  return (
    <Modal open={!!value} onClose={onClose} title={f.id ? 'Szőlő szerkesztése' : 'Új szőlő'} wide
      footer={<>{save.error && <span className="mr-auto self-center text-sm text-red-600">{save.error.message}</span>}<Button variant="secondary" onClick={onClose}>Mégse</Button><Button loading={save.isPending} onClick={() => save.mutate(f, { onSuccess: onClose })}>Mentés</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Név *"><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="További nevek (vesszővel)"><Input value={f.other_names ?? ''} onChange={(e) => setF({ ...f, other_names: e.target.value || null })} placeholder="pl. orosz név, szinonimák" /></Field>
        <Field label="Bogyószín">
          <Select value={f.berry_color ?? 'fehér'} onChange={(e) => setF({ ...f, berry_color: e.target.value as Variety['berry_color'] })}>
            {Object.entries(BERRY).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Érési idő (nap, rügyfakadástól)">
          <div className="flex items-center gap-2">
            <Input type="number" value={f.ripening_from ?? ''} onChange={(e) => setF({ ...f, ripening_from: num(e.target.value) })} placeholder="tól" />
            <span className="text-muted">–</span>
            <Input type="number" value={f.ripening_to ?? ''} onChange={(e) => setF({ ...f, ripening_to: num(e.target.value) })} placeholder="ig" />
          </div>
        </Field>
        <div className="sm:col-span-2"><RipeningBar v={{ ripening_from: f.ripening_from ?? null, ripening_to: f.ripening_to ?? null }} /></div>
        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-muted mb-2">Címkék</div>
          <div className="flex flex-col gap-2">
            {TAG_CATEGORIES.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-28 text-xs text-muted">{c.name}</span>
                {c.tags.map((t) => (
                  <button key={t.id} type="button" onClick={() => setF({ ...f, tags: tags.includes(t.id) ? tags.filter((x) => x !== t.id) : [...tags, t.id] })}
                    className={cx('rounded-full border px-2.5 h-7 text-xs', tags.includes(t.id) ? 'border-vine-600 bg-vine-600 text-white' : 'border-line hover:bg-surface-2')}>
                    {t.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Field label="Leírás" className="sm:col-span-2"><Textarea rows={5} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value || null })} /></Field>
      </div>
    </Modal>
  )
}
