import { addDays, format, parseISO } from 'date-fns'
import { ArrowLeft, Check, FlaskConical, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api, useParcels, useProducts, useSave, useSettings, useSpray } from '../lib/api'
import { DOSE_UNITS, PESTS, PHENOLOGY } from '../lib/constants'
import { d, n, round, today } from '../lib/format'
import { Badge, Button, Card, CardHeader, ColorDot, Field, Input, Select, Spinner, Textarea, Warnings, cx } from '../components/ui'
import type { ComplianceWarning, Product, ProductUse, Spray, SprayItem } from '../../shared/types'

type Draft = Omit<Spray, 'id'>
const GRAPE = /sz[őoö]l[őoö]/i
const grapeUses = (p?: Product) => (p?.uses ?? []).filter((u) => GRAPE.test(u.culture))
const matchUse = (p: Product | undefined, pest: string): ProductUse | undefined =>
  grapeUses(p).find((u) => u.pest.toLowerCase() === pest.toLowerCase()) ??
  grapeUses(p).find((u) => pest && (u.pest.toLowerCase().includes(pest.toLowerCase()) || pest.toLowerCase().includes(u.pest.toLowerCase())))

/** Felhasznált szermennyiség (l vagy kg) a dózisból, területből és lémennyiségből. */
export function totalAmount(dose: number, unit: string, areaHa: number, waterLHa: number | null) {
  const water = (waterLHa ?? 0) * areaHa
  switch (unit) {
    case 'ml/ha':
    case 'g/ha':
      return (dose * areaHa) / 1000
    case '%':
      return (dose / 100) * water
    case 'l/hl':
    case 'kg/hl':
      return (dose * water) / 100
    default:
      return dose * areaHa
  }
}

const emptyItem = (): SprayItem => ({ product_id: 0, pest: '', dose: 0, dose_unit: 'l/ha', total_amount: 0 })

export default function SprayForm() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { data: existing, isLoading } = useSpray(id)
  const { data: parcels = [] } = useParcels()
  const { data: products = [] } = useProducts()
  const { data: settings } = useSettings()
  const [f, setF] = useState<Draft | null>(null)
  const [manualTotal, setManualTotal] = useState<Record<number, boolean>>({})
  const [warnings, setWarnings] = useState<ComplianceWarning[]>([])
  const [saveErr, setSaveErr] = useState<ApiError | null>(null)

  // Kezdőérték
  useEffect(() => {
    if (f) return
    if (id && existing) {
      const { id: _id, ...rest } = existing
      setF(rest)
      setManualTotal(Object.fromEntries(rest.items.map((_, i) => [i, true])))
    } else if (!id && settings && parcels.length) {
      const pre = Number(sp.get('parcel'))
      setF({
        date: today(), start_time: format(new Date(), 'HH:mm'), end_time: null,
        operator_name: settings.operator_name ?? null, operator_license: settings.operator_license ?? null,
        machine: settings.machine ?? null, water_l_per_ha: Number(settings.water_l_per_ha ?? 400),
        temperature_c: null, wind: null, phenology: null, notes: null,
        parcels: pre ? parcels.filter((p) => p.id === pre).map((p) => ({ parcel_id: p.id, treated_area_ha: p.area_ha })) : [],
        items: [emptyItem()],
      })
    }
  }, [id, existing, settings, parcels, f, sp])

  const area = useMemo(() => round(f?.parcels.reduce((a, p) => a + (p.treated_area_ha || 0), 0) ?? 0, 4), [f?.parcels])

  // Automatikus mennyiségszámítás
  useEffect(() => {
    if (!f) return
    const items = f.items.map((it, i) =>
      manualTotal[i] || !it.dose ? it : { ...it, total_amount: round(totalAmount(it.dose, it.dose_unit, area, f.water_l_per_ha), 3) },
    )
    if (items.some((it, i) => it.total_amount !== f.items[i].total_amount)) setF({ ...f, items })
  }, [area, f, manualTotal])

  // Élő ellenőrzés (késleltetve)
  useEffect(() => {
    if (!f) return
    const ready = { ...f, items: f.items.filter((i) => i.product_id && i.dose > 0) }
    if (!ready.items.length || !ready.parcels.length) return setWarnings([])
    const t = setTimeout(() => {
      api<ComplianceWarning[]>(`/sprays/validate${id ? `?exclude=${id}` : ''}`, { method: 'POST', json: ready })
        .then(setWarnings)
        .catch(() => {})
    }, 350)
    return () => clearTimeout(t)
  }, [f, id])

  const save = useSave(
    ({ force }: { force?: boolean }) =>
      api<{ spray: Spray }>(`/sprays${id ? `/${id}` : ''}${force ? '?force=1' : ''}`, {
        method: id ? 'PUT' : 'POST',
        json: f && { ...f, items: f.items.filter((i) => i.product_id) },
      }),
    [['sprays'], ['spray', id]],
  )
  const del = useSave(() => api(`/sprays/${id}`, { method: 'DELETE' }), [['sprays']])

  if ((id && isLoading) || !f) return <Spinner />
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF({ ...f, [k]: v })
  const setItem = (i: number, patch: Partial<SprayItem>) => set('items', f.items.map((it, k) => (k === i ? { ...it, ...patch } : it)))
  const toggleParcel = (pid: number, area_ha: number) =>
    set('parcels', f.parcels.some((p) => p.parcel_id === pid) ? f.parcels.filter((p) => p.parcel_id !== pid) : [...f.parcels, { parcel_id: pid, treated_area_ha: area_ha }])

  const chooseProduct = (i: number, pid: number) => {
    const p = products.find((x) => x.id === pid)
    const u = grapeUses(p)[0]
    setItem(i, { product_id: pid, pest: u?.pest ?? '', dose: u?.dose_max ?? 0, dose_unit: u?.dose_unit ?? 'l/ha' })
    setManualTotal((m) => ({ ...m, [i]: false }))
  }
  const choosePest = (i: number, pest: string) => {
    const p = products.find((x) => x.id === f.items[i].product_id)
    const u = matchUse(p, pest)
    setItem(i, u ? { pest, dose: u.dose_max ?? f.items[i].dose, dose_unit: u.dose_unit } : { pest })
  }

  // ÉVI / MVI összesítés
  const waits = f.items.map((it) => {
    const p = products.find((x) => x.id === it.product_id)
    const u = matchUse(p, it.pest)
    const uses = grapeUses(p)
    // illeszkedő felhasználásnál annak értéke; különben a legszigorúbb ismert érték (ismeretlen → nincs adat)
    const strictest = (k: 'phi_days' | 'rei_days') => {
      const vals = uses.map((x) => x[k]).filter((v): v is number => v != null)
      return vals.length ? Math.max(...vals) : null
    }
    const phi = u ? u.phi_days : strictest('phi_days')
    const rei = u ? u.rei_days : strictest('rei_days')
    return { phi, rei }
  })
  const maxPhi = Math.max(0, ...waits.map((w) => w.phi ?? 0))
  const maxRei = Math.max(0, ...waits.map((w) => w.rei ?? 0))
  const errors = warnings.filter((w) => w.level === 'error')
  const sortedProducts = [...products].sort((a, b) => Number(grapeUses(b).length > 0) - Number(grapeUses(a).length > 0) || a.name.localeCompare(b.name, 'hu'))

  const submit = (force = false) => {
    setSaveErr(null)
    save.mutate(
      { force },
      {
        onSuccess: () => nav('/permetezes'),
        onError: (e) => {
          if (e instanceof ApiError) {
            setSaveErr(e)
            if (e.warnings) setWarnings(e.warnings)
          }
        },
      },
    )
  }

  return (
    <>
      <Link to="/permetezes" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4">
        <ArrowLeft className="size-4" /> Permetezési napló
      </Link>
      <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight mb-6">{id ? 'Permetezés szerkesztése' : 'Új permetezés'}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Card>
            <CardHeader title="1. Időpont és körülmények" />
            <div className="grid gap-4 px-5 pb-5 grid-cols-2 sm:grid-cols-4">
              <Field label="Dátum *" className="col-span-2 sm:col-span-1"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Kezdés"><Input type="time" value={f.start_time ?? ''} onChange={(e) => set('start_time', e.target.value || null)} /></Field>
              <Field label="Befejezés"><Input type="time" value={f.end_time ?? ''} onChange={(e) => set('end_time', e.target.value || null)} /></Field>
              <Field label="Hőmérséklet (°C)" className="col-span-2 sm:col-span-1"><Input type="number" value={f.temperature_c ?? ''} onChange={(e) => set('temperature_c', e.target.value === '' ? null : Number(e.target.value))} /></Field>
              <Field label="Fenológiai stádium" className="col-span-2">
                <Select value={f.phenology ?? ''} onChange={(e) => set('phenology', e.target.value || null)}>
                  <option value="">—</option>
                  {[...PHENOLOGY, ...(f.phenology && !PHENOLOGY.includes(f.phenology) ? [f.phenology] : [])].map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Szél" className="col-span-2">
                <Select value={f.wind ?? ''} onChange={(e) => set('wind', e.target.value || null)}>
                  <option value="">—</option>
                  {['szélcsend', 'gyenge szellő', 'mérsékelt szél', 'erős szél'].map((w) => <option key={w}>{w}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="2. Kezelt terület" subtitle={`${f.parcels.length} ültetvény · ${n(area)} ha`} />
            <ul className="px-5 pb-5 grid gap-2 sm:grid-cols-2">
              {parcels.map((p) => {
                const sel = f.parcels.find((x) => x.parcel_id === p.id)
                return (
                  <li key={p.id} className={cx('flex items-center gap-3 rounded-xl border px-3 py-2 transition', sel ? 'border-vine-500 bg-vine-50 dark:bg-vine-950/40' : 'border-line')}>
                    <button type="button" onClick={() => toggleParcel(p.id, p.area_ha)} className="flex flex-1 items-center gap-2.5 min-w-0 text-left">
                      <span className={cx('grid size-5 shrink-0 place-items-center rounded-md border', sel ? 'bg-vine-600 border-vine-600 text-white' : 'border-line')}>{sel && <Check className="size-3.5" />}</span>
                      <ColorDot color={p.color} />
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </button>
                    {sel ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" step="0.01" className="h-8 w-20 text-right"
                          value={sel.treated_area_ha}
                          onChange={(e) => set('parcels', f.parcels.map((x) => (x.parcel_id === p.id ? { ...x, treated_area_ha: Number(e.target.value) } : x)))}
                        />
                        <span className="text-xs text-muted">ha</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{n(p.area_ha)} ha</span>
                    )}
                  </li>
                )
              })}
              {!parcels.length && <li className="text-sm text-muted">Előbb vegyen fel ültetvényt.</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="3. Felhasznált szerek"
              subtitle="A dózis és a várakozási idők az engedélyokiratból töltődnek"
              action={<Link to="/szerek" className="text-xs text-vine-700 dark:text-vine-300 font-medium inline-flex items-center gap-1"><FlaskConical className="size-3.5" />Szeradatbázis</Link>}
            />
            <div className="px-5 pb-5 flex flex-col gap-3">
              {f.items.map((it, i) => {
                const p = products.find((x) => x.id === it.product_id)
                const uses = grapeUses(p)
                const u = matchUse(p, it.pest)
                return (
                  <div key={i} className="rounded-2xl border border-line bg-surface-2/50 p-3 sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-12">
                      <Field label="Készítmény *" className="sm:col-span-6">
                        <Select value={it.product_id || ''} onChange={(e) => chooseProduct(i, Number(e.target.value))}>
                          <option value="">Válasszon…</option>
                          <optgroup label="Szőlőben engedélyezett">
                            {sortedProducts.filter((x) => grapeUses(x).length).map((x) => <option key={x.id} value={x.id}>{x.name}{x.source === 'demo' ? ' (demó)' : ''}</option>)}
                          </optgroup>
                          <optgroup label="Egyéb / nincs szőlő engedély">
                            {sortedProducts.filter((x) => !grapeUses(x).length).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </optgroup>
                        </Select>
                      </Field>
                      <Field label="Károsító *" className="sm:col-span-6">
                        <Input list={`pests-${i}`} value={it.pest} onChange={(e) => choosePest(i, e.target.value)} placeholder="pl. peronoszpóra" />
                        <datalist id={`pests-${i}`}>
                          {[...new Set([...uses.map((x) => x.pest), ...PESTS])].map((x) => <option key={x} value={x} />)}
                        </datalist>
                      </Field>
                      <Field label="Dózis *" className="sm:col-span-4" hint={u && (u.dose_min != null || u.dose_max != null) ? `Engedélyezett: ${u.dose_min != null && u.dose_min !== u.dose_max ? `${n(u.dose_min)}–` : ''}${n(u.dose_max)} ${u.dose_unit}` : undefined}>
                        <div className="flex gap-1.5">
                          <Input type="number" step="0.01" value={it.dose || ''} onChange={(e) => { setItem(i, { dose: Number(e.target.value) }); setManualTotal((m) => ({ ...m, [i]: false })) }} />
                          <Select className="w-28 shrink-0" value={it.dose_unit} onChange={(e) => setItem(i, { dose_unit: e.target.value })}>
                            {DOSE_UNITS.map((x) => <option key={x}>{x}</option>)}
                          </Select>
                        </div>
                      </Field>
                      <Field label={`Felhasznált mennyiség (${p?.unit ?? 'l/kg'})`} className="sm:col-span-4" hint={manualTotal[i] ? 'Kézzel megadva' : 'Számított'}>
                        <Input type="number" step="0.001" value={it.total_amount || ''} onChange={(e) => { setItem(i, { total_amount: Number(e.target.value) }); setManualTotal((m) => ({ ...m, [i]: true })) }} />
                      </Field>
                      <div className="sm:col-span-4 flex items-end justify-between gap-2">
                        <div className="flex flex-wrap gap-1 pb-2">
                          {waits[i].phi != null && <Badge tone="red">ÉVI {waits[i].phi} nap</Badge>}
                          {waits[i].rei != null && <Badge tone="amber">MVI {waits[i].rei} nap</Badge>}
                          {p?.category && <Badge>{p.category} kat.</Badge>}
                        </div>
                        {f.items.length > 1 && (
                          <Button variant="ghost" size="sm" aria-label="Tétel törlése" icon={<Trash2 className="size-4" />} onClick={() => set('items', f.items.filter((_, k) => k !== i))} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => set('items', [...f.items, emptyItem()])} className="self-start">
                Szer hozzáadása (tankkeverék)
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="4. Kijuttatás és kezelést végző" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Kezelést végző neve"><Input value={f.operator_name ?? ''} onChange={(e) => set('operator_name', e.target.value || null)} /></Field>
              <Field label="Növényvédelmi képesítés / engedély száma"><Input value={f.operator_license ?? ''} onChange={(e) => set('operator_license', e.target.value || null)} /></Field>
              <Field label="Gép / permetező"><Input value={f.machine ?? ''} onChange={(e) => set('machine', e.target.value || null)} /></Field>
              <Field label="Lémennyiség (l/ha)"><Input type="number" value={f.water_l_per_ha ?? ''} onChange={(e) => set('water_l_per_ha', e.target.value === '' ? null : Number(e.target.value))} /></Field>
              <Field label="Megjegyzés" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></Field>
            </div>
          </Card>
        </div>

        {/* Összesítő + ellenőrzés */}
        <div className="lg:sticky lg:top-6 flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="font-semibold tracking-tight mb-3">Összesítés</h3>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted">Kezelt terület</dt><dd className="text-right font-medium">{n(area)} ha</dd>
              <dt className="text-muted">Permetlé összesen</dt><dd className="text-right font-medium">{n((f.water_l_per_ha ?? 0) * area, 0)} l</dd>
              <dt className="text-muted">Szüretelhető</dt>
              <dd className="text-right font-medium">{maxPhi ? d(format(addDays(parseISO(f.date), maxPhi), 'yyyy-MM-dd')) : '—'}</dd>
              <dt className="text-muted">Belépés</dt>
              <dd className="text-right font-medium">{maxRei ? d(format(addDays(parseISO(f.date), maxRei), 'yyyy-MM-dd')) : 'azonnal'}</dd>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold tracking-tight mb-3 flex items-center gap-2">
              <ShieldCheck className="size-4 text-vine-600" /> Növényvédelmi ellenőrzés
            </h3>
            {warnings.length ? <Warnings items={warnings} /> : <p className="text-sm text-muted">Adja meg az ültetvényt és a szert — az ellenőrzés automatikusan lefut (engedély, dózis, kezelésszám, ÉVI, készlet).</p>}
          </Card>

          <div className="flex flex-col gap-2">
            {saveErr && <p className="text-sm text-red-600">{saveErr.message}</p>}
            {saveErr?.status === 422 ? (
              <Button variant="danger" loading={save.isPending} onClick={() => submit(true)}>Mentés a hibák ellenére</Button>
            ) : (
              <Button loading={save.isPending} onClick={() => submit()} disabled={!f.parcels.length || !f.items.some((x) => x.product_id)}>
                {errors.length ? `Mentés (${errors.length} hiba)` : 'Mentés a naplóba'}
              </Button>
            )}
            {id && (
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => confirm('Biztosan törli ezt a permetezést? A készletlevonás is visszavonódik.') && del.mutate(undefined, { onSuccess: () => nav('/permetezes') })}>
                Bejegyzés törlése
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
