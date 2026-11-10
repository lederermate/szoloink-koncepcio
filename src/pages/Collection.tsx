// „Szőlőim” — a szoloink.hu bejelentkezett felhasználójának fajtagyűjteménye, modernizálva:
// az ültetvényekben lévő fajták automatikusan bekerülnek, a többi kézzel vehető fel (megjegyzéssel).
import { Grape, ListChecks, MapPin, Plus, Sprout, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, useSave } from '../lib/api'
import { useMyVarieties, type MyVariety } from '../lib/garden'
import { ME } from '../lib/mock'
import { n } from '../lib/format'
import { GrapeArt, RipeningBar } from '../components/Grape'
import { VarietyPicker } from '../components/GardenActions'
import { Badge, Button, Card, Empty, Input, PageHeader, Segmented, Spinner } from '../components/ui'

type Filter = 'all' | 'parcel' | 'manual'
type Sort = 'name' | 'ripening'

export default function Collection() {
  const { data, ids } = useMyVarieties()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [pick, setPick] = useState(false)
  const add = useSave((id: number) => api(`/collection/${id}`, { method: 'PUT', json: { note: null } }), [['collection']])
  if (!data) return <Spinner />

  const rows = data
    .filter((m) => filter === 'all' || (filter === 'parcel' ? m.plantings.length > 0 : m.plantings.length === 0))
    .sort((a, b) => (sort === 'ripening' ? (a.variety?.ripening_from ?? 999) - (b.variety?.ripening_from ?? 999) : 0))
  const inParcels = data.filter((m) => m.plantings.length).length

  return (
    <>
      <PageHeader
        title="Szőlőim"
        subtitle={`${data.length} fajta · ebből ${inParcels} ültetvényben, ${data.length - inParcels} csak a gyűjteményben`}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setPick(true)}>Fajta hozzáadása</Button>}
      />

      <Card className="mb-6 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: ME.color }}>{ME.initials}</span>
          <p className="text-sm text-muted">
            A gazdaprofilodon így jelenik meg: <b className="text-fg">„Szőlők ({data.filter((m) => m.variety).length} féle)”</b>. Az ültetvényeidben lévő fajták automatikusan
            ide kerülnek — a vesszőről nevelt, iskolázott vagy lugason lévő tőkéidet itt veheted fel kézzel.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link to={`/gazda/${ME.id}`}><Button variant="secondary" size="sm" icon={<UserRound className="size-4" />}>Profilom</Button></Link>
          <Link to="/listaim"><Button variant="secondary" size="sm" icon={<ListChecks className="size-4" />}>Listáim</Button></Link>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'all', label: `Mind (${data.length})` },
          { value: 'parcel', label: `Ültetvényben (${inParcels})` },
          { value: 'manual', label: `Csak gyűjtemény (${data.length - inParcels})` },
        ]} />
        <Segmented<Sort> value={sort} onChange={setSort} options={[{ value: 'name', label: 'Név' }, { value: 'ripening', label: 'Érés' }]} />
      </div>

      {rows.length === 0 ? (
        <Card><Empty icon={<Grape />} title="Nincs ilyen fajta" text="Vegyél fel fajtát a katalógusból, vagy rögzíts ültetvényt." action={<Button onClick={() => setPick(true)}>Fajta hozzáadása</Button>} /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((m) => <Row key={m.key} m={m} />)}
        </div>
      )}
      <VarietyPicker open={pick} onClose={() => setPick(false)} exclude={ids} onPick={(v) => add.mutate(v.id)} title="Fajta hozzáadása a Szőlőimhez" />
    </>
  )
}

function Row({ m }: { m: MyVariety }) {
  const v = m.variety
  const [note, setNote] = useState<string | null>(null)
  const save = useSave((b: { note: string | null }) => api(`/collection/${v!.id}`, { method: 'PUT', json: b }), [['collection']])
  const del = useSave(() => api(`/collection/${v!.id}`, { method: 'DELETE' }), [['collection']])
  return (
    <Card className="p-3 flex gap-3">
      {v ? (
        <Link to={`/szolo/${v.id}`} className="shrink-0"><GrapeArt v={v} className="size-20 rounded-xl" /></Link>
      ) : (
        <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><Grape className="size-7" /></div>
      )}
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {v ? <Link to={`/szolo/${v.id}`} className="font-semibold hover:text-vine-700 dark:hover:text-vine-300">{m.name}</Link> : <span className="font-semibold">{m.name}</span>}
            {!v && <div className="text-xs text-amber-700 dark:text-amber-300">Nincs a katalógusban — javasold felvételre!</div>}
          </div>
          {m.manual && (
            <Button variant="ghost" size="sm" className="px-2 -mr-1" aria-label="Eltávolítás" loading={del.isPending}
              onClick={() => confirm(`${m.name} eltávolítása a Szőlőim közül?`) && del.mutate(undefined)}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {m.plantings.map(({ parcel, planting }) => (
            <Link key={parcel.id} to={`/ultetvenyek/${parcel.id}`}>
              <Badge tone="brand" className="hover:ring-vine-400">
                <MapPin className="size-3" />{parcel.name}{planting.vine_count ? ` · ${n(planting.vine_count, 0)} tő` : ''}
              </Badge>
            </Link>
          ))}
          {!m.plantings.length && <Badge><Sprout className="size-3" />gyűjtemény</Badge>}
        </div>
        {m.manual && (
          note == null ? (
            <button className="text-left text-xs text-muted hover:text-fg" onClick={() => setNote(m.manual!.note ?? '')}>
              {m.manual.note || '+ megjegyzés (honnan, hány tő, hol áll…)'}
            </button>
          ) : (
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); save.mutate({ note: note || null }, { onSuccess: () => setNote(null) }) }}>
              <Input autoFocus className="h-8 text-xs" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" type="submit" loading={save.isPending}>OK</Button>
            </form>
          )
        )}
        {v && <div className="mt-auto pt-1"><RipeningBar v={v} compact /></div>}
      </div>
    </Card>
  )
}
