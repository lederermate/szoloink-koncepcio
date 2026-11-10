import { Plus, Printer, SprayCan } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useParcels, useProducts, useSprays } from '../lib/api'
import { appHref } from '../lib/env'
import { d, n } from '../lib/format'
import { Badge, Button, Card, ColorDot, Empty, PageHeader, Select, Spinner } from '../components/ui'

export default function Sprays() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [parcel, setParcel] = useState<number | ''>('')
  const [product, setProduct] = useState<number | ''>('')
  const { data: sprays, isLoading } = useSprays(year, parcel || undefined)
  const { data: parcels = [] } = useParcels()
  const { data: products = [] } = useProducts()
  const nav = useNavigate()
  const list = useMemo(() => (sprays ?? []).filter((s) => !product || s.items.some((i) => i.product_id === product)), [sprays, product])
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)
  const pr = (id: number) => products.find((p) => p.id === id)
  const pa = (id: number) => parcels.find((p) => p.id === id)

  return (
    <>
      <PageHeader
        title="Permetezési napló"
        subtitle="Növényvédő szeres kezelések nyilvántartása"
        actions={
          <>
            <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.open(appHref(`/permetezes/nyomtatas?year=${year}${parcel ? `&parcel=${parcel}` : ''}`), '_blank')}>
              Nyomtatás / PDF
            </Button>
            <Link to="/permetezes/uj"><Button icon={<Plus className="size-4" />}>Új permetezés</Button></Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={parcel} onChange={(e) => setParcel(e.target.value ? Number(e.target.value) : '')} className="w-auto min-w-44">
          <option value="">Minden ültetvény</option>
          {parcels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={product} onChange={(e) => setProduct(e.target.value ? Number(e.target.value) : '')} className="w-auto min-w-44">
          <option value="">Minden szer</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !list.length ? (
        <Card><Empty icon={<SprayCan />} title="Nincs permetezés a szűrésnek megfelelően" action={<Link to="/permetezes/uj"><Button>Új permetezés</Button></Link>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Asztali táblázat */}
          <table className="hidden md:table w-full text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr className="text-left">
                <th className="px-5 py-3 font-medium">Dátum</th>
                <th className="px-3 py-3 font-medium">Ültetvény</th>
                <th className="px-3 py-3 font-medium">Szer · károsító</th>
                <th className="px-3 py-3 font-medium text-right">Dózis</th>
                <th className="px-3 py-3 font-medium text-right">Felhasznált</th>
                <th className="px-5 py-3 font-medium">Fenológia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((s) => (
                <tr key={s.id} onClick={() => nav(`/permetezes/${s.id}`)} className="cursor-pointer hover:bg-surface-2 align-top">
                  <td className="px-5 py-3 whitespace-nowrap font-medium">{d(s.date)}<div className="text-xs text-muted font-normal">{s.start_time ?? ''}</div></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      {s.parcels.map((p) => (
                        <span key={p.parcel_id} className="flex items-center gap-1.5 whitespace-nowrap"><ColorDot color={pa(p.parcel_id)?.color ?? '#999'} />{pa(p.parcel_id)?.name} <span className="text-muted text-xs">{n(p.treated_area_ha)} ha</span></span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {s.items.map((i, k) => (
                      <div key={k} className="flex items-center gap-1.5 py-0.5">
                        <span className="font-medium">{pr(i.product_id)?.name}</span>
                        {pr(i.product_id)?.source === 'demo' && <Badge tone="amber">demó</Badge>}
                        <span className="text-muted">· {i.pest}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{s.items.map((i, k) => <div key={k} className="py-0.5">{n(i.dose)} {i.dose_unit}</div>)}</td>
                  <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{s.items.map((i, k) => <div key={k} className="py-0.5">{n(i.total_amount)} {pr(i.product_id)?.unit}</div>)}</td>
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{s.phenology?.split(' – ')[0] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobil kártyák */}
          <ul className="md:hidden divide-y divide-line">
            {list.map((s) => (
              <li key={s.id}>
                <Link to={`/permetezes/${s.id}`} className="block px-4 py-3 active:bg-surface-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{d(s.date)}</span>
                    <span className="text-muted text-xs">{s.phenology?.split(' – ')[0]}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.items.map((i, k) => <Badge key={k} tone="green">{pr(i.product_id)?.name} · {n(i.dose)} {i.dose_unit}</Badge>)}
                  </div>
                  <div className="mt-1.5 text-xs text-muted">{s.parcels.map((p) => pa(p.parcel_id)?.name).join(', ')}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
