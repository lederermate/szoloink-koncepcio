import { addDays, format, parseISO } from 'date-fns'
import { Printer } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useParcels, useProducts, useSettings, useSprays } from '../lib/api'
import { n } from '../lib/format'
import { Button, Spinner } from '../components/ui'

const GRAPE = /sz[őoö]l[őoö]/i

export default function SprayPrint() {
  const [sp] = useSearchParams()
  const year = Number(sp.get('year') ?? new Date().getFullYear())
  const parcelId = sp.get('parcel') ? Number(sp.get('parcel')) : undefined
  const { data: sprays } = useSprays(year, parcelId)
  const { data: parcels = [] } = useParcels()
  const { data: products = [] } = useProducts()
  const { data: settings = {} } = useSettings()
  if (!sprays) return <Spinner />

  const rows = [...sprays].reverse().flatMap((s, si) =>
    s.parcels.flatMap((pp) =>
      s.items.map((it) => {
        const parcel = parcels.find((p) => p.id === pp.parcel_id)
        const prod = products.find((p) => p.id === it.product_id)
        const uses = (prod?.uses ?? []).filter((u) => GRAPE.test(u.culture))
        const u = uses.find((x) => x.pest.toLowerCase() === it.pest.toLowerCase()) ?? uses[0]
        const share = s.parcels.length > 1 ? pp.treated_area_ha / s.parcels.reduce((a, x) => a + x.treated_area_ha, 0) : 1
        return { s, si, pp, it, parcel, prod, u, amount: it.total_amount * share }
      }),
    ),
  )

  return (
    <div className="min-h-full bg-white text-black dark:bg-white dark:text-black">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b bg-white px-6 py-3">
        <span className="text-sm text-gray-600">Fekvő A4-es tájolás javasolt. PDF-hez válassza a „Mentés PDF-ként” lehetőséget.</span>
        <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>Nyomtatás</Button>
      </div>
      <div className="print-area p-6 text-[11px]">
        <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
        <div className="flex justify-between items-end mb-3">
          <div>
            <h1 className="text-lg font-bold">Permetezési napló — {year}</h1>
            <p>Gazdálkodó: {settings.farm_name ?? '………………………'} {settings.farm_id ? `· Reg. szám: ${settings.farm_id}` : ''}</p>
          </div>
          <p className="text-right">Kultúra: szőlő<br />Nyomtatva: {format(new Date(), 'yyyy.MM.dd.')}</p>
        </div>
        <table className="w-full border-collapse [&_td]:border [&_th]:border [&_td]:border-gray-400 [&_th]:border-gray-400 [&_td]:px-1.5 [&_td]:py-1 [&_th]:px-1.5 [&_th]:py-1 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-left align-top">
          <thead>
            <tr>
              <th>#</th><th>Dátum, időpont</th><th>Ültetvény (hrsz.)</th><th>Fajta</th><th>Kezelt ter. (ha)</th><th>Fenológia</th>
              <th>Károsító</th><th>Készítmény</th><th>Engedélyszám</th><th>Dózis</th><th>Felhasznált mennyiség</th><th>Lé (l/ha)</th>
              <th>ÉVI (nap) / szüretelhető</th><th>MVI (nap)</th><th>Kezelést végző, képesítés</th><th>Aláírás</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="break-inside-avoid">
                <td>{r.si + 1}.</td>
                <td className="whitespace-nowrap">{format(parseISO(r.s.date), 'yyyy.MM.dd.')} {r.s.start_time ?? ''}{r.s.end_time ? `–${r.s.end_time}` : ''}</td>
                <td>{r.parcel?.name}{r.parcel?.hrsz ? ` (${r.parcel.hrsz})` : ''}</td>
                <td>{r.parcel?.variety}</td>
                <td className="text-right">{n(r.pp.treated_area_ha)}</td>
                <td>{r.s.phenology?.split(' – ')[0]}</td>
                <td>{r.it.pest}</td>
                <td>{r.prod?.name}{r.prod?.source === 'demo' ? ' [DEMÓ]' : ''}</td>
                <td>{r.prod?.permit_number}</td>
                <td className="whitespace-nowrap">{n(r.it.dose)} {r.it.dose_unit}</td>
                <td className="whitespace-nowrap text-right">{n(r.amount, 3)} {r.prod?.unit}</td>
                <td className="text-right">{n(r.s.water_l_per_ha, 0)}</td>
                <td className="whitespace-nowrap">{r.u?.phi_days ?? '—'}{r.u?.phi_days ? ` / ${format(addDays(parseISO(r.s.date), r.u.phi_days), 'MM.dd.')}` : ''}</td>
                <td>{r.u?.rei_days ?? '—'}</td>
                <td>{r.s.operator_name}{r.s.operator_license ? `, ${r.s.operator_license}` : ''}</td>
                <td className="w-20" />
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={16} className="text-center py-6 text-gray-500">Nincs bejegyzés.</td></tr>}
          </tbody>
        </table>
        <p className="mt-3 text-[10px] text-gray-500">
          A nyomtatvány a Szőlőnapló alkalmazásból készült. A hatályos jogszabályi formai követelményeknek való megfelelést a felhasználó ellenőrzi.
        </p>
      </div>
    </div>
  )
}
