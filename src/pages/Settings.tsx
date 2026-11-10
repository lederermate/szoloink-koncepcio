import { Download, Save } from 'lucide-react'
import { useState } from 'react'
import { api, useNebihStatus, useSave, useSettings } from '../lib/api'
import { Button, Card, CardHeader, Field, Input, PageHeader, Spinner } from '../components/ui'

const FIELDS: [string, string, string?][] = [
  ['farm_name', 'Gazdálkodó / pincészet neve'],
  ['farm_id', 'Regisztrációs szám (pl. MVH / SZBK)'],
  ['operator_name', 'Alapértelmezett kezelést végző'],
  ['operator_license', 'Növényvédelmi képesítés / engedély száma'],
  ['machine', 'Alapértelmezett permetező gép'],
  ['water_l_per_ha', 'Alapértelmezett lémennyiség (l/ha)', 'number'],
]

export default function Settings() {
  const { data } = useSettings()
  const { data: nebih } = useNebihStatus()
  const [f, setF] = useState<Record<string, string> | null>(null)
  const save = useSave((b: Record<string, string>) => api('/settings', { method: 'PUT', json: b }), [['settings']])
  if (!data) return <Spinner />
  const v = f ?? data

  return (
    <>
      <PageHeader title="Beállítások" />
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader title="Gazdaság és alapértékek" subtitle="Az új permetezési bejegyzések ezekkel töltődnek ki" />
          <div className="grid gap-4 px-5 pb-5">
            {FIELDS.map(([k, label, type]) => (
              <Field key={k} label={label}><Input type={type ?? 'text'} value={v[k] ?? ''} onChange={(e) => setF({ ...v, [k]: e.target.value })} /></Field>
            ))}
            <div className="flex items-center gap-3">
              <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={() => save.mutate(v, { onSuccess: () => setF(null) })}>Mentés</Button>
              {save.isSuccess && !f && <span className="text-sm text-vine-700 dark:text-vine-300">Elmentve</span>}
            </div>
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Adatmentés" subtitle="Teljes adatbázis letöltése JSON formátumban" />
            <div className="px-5 pb-5">
              <a href="/api/backup"><Button variant="secondary" icon={<Download className="size-4" />}>Mentés letöltése</Button></a>
            </div>
          </Card>
          <Card>
            <CardHeader title="NÉBIH integráció" />
            <dl className="px-5 pb-5 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Forrás</dt><dd className="text-right break-all">{nebih?.base_url}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Állapot</dt><dd>{nebih?.reachable ? 'elérhető' : `nem elérhető (${nebih?.error ?? '—'})`}</dd></div>
              <p className="text-xs text-muted mt-2">Az alap URL a szerveren a <code>NEBIH_BASE_URL</code> környezeti változóval módosítható. A tömeges frissítés parancssorból is futtatható: <code>npm run nebih:sync -- resync</code>.</p>
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
