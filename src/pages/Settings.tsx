import { Download, Save, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ME } from '../lib/mock'
import { useState } from 'react'
import { api, useNebihStatus, useSave, useSettings } from '../lib/api'
import { DEMO } from '../lib/env'
import { Button, Card, CardHeader, Field, Input, PageHeader, Spinner, Textarea } from '../components/ui'

async function downloadBackup() {
  const data = await api<unknown>('/backup')
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `szoloink-mentes-${new Date().toISOString().slice(0, 10)}.json` })
  a.click()
  URL.revokeObjectURL(url)
}

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
          <ProfileCard data={data} />
          <Card>
            <CardHeader title="Adatmentés" subtitle="Teljes adatbázis letöltése JSON formátumban" />
            <div className="px-5 pb-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={<Download className="size-4" />} onClick={downloadBackup}>Mentés letöltése</Button>
                {DEMO && <Button variant="ghost" onClick={() => confirm('Visszaállítja a demó kezdeti adatait? A saját módosítások elvesznek.') && import('../demo/backend').then((m) => m.resetDemo())}>Demó adatok visszaállítása</Button>}
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="NÉBIH integráció" />
            <dl className="px-5 pb-5 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Forrás</dt><dd className="text-right break-all">{nebih?.base_url}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Állapot</dt><dd>{nebih?.reachable ? 'elérhető' : `nem elérhető (${nebih?.error ?? '—'})`}</dd></div>
              <p className="text-xs text-muted mt-2">Az alap URL a szerveren a <code>NEBIH_BASE_URL</code> környezeti változóval módosítható. A tömeges frissítés parancssorból is futtatható: <code>npm run nebih -- resync</code>.</p>
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}

const TOGGLES: [string, string, string][] = [
  ['profile_listed', 'Megjelenek a gazdák listájában', 'A Gazdák oldalon és a térképen (település szintű pontossággal).'],
  ['profile_messaging', 'Fogadok üzeneteket', 'Kikapcsolva a profilodon nem jelenik meg az „Üzenet küldése” gomb.'],
  ['notify_messages', 'E-mail értesítés új üzenetről', ''],
  ['notify_forum', 'E-mail értesítés fórumválaszról', 'Ha a követett témákba új hozzászólás érkezik.'],
  ['notify_digest', 'Heti összefoglaló', 'Új fajták, cikkek és a permetezési napló esedékes teendői.'],
]

/** Profil és értesítések — a szoloink.hu „Beállítás” oldalának megfelelője (itt a gazdaprofil és a Gazdák oldal ebből töltődik). */
function ProfileCard({ data }: { data: Record<string, string> }) {
  const [f, setF] = useState<Record<string, string> | null>(null)
  const v = f ?? data
  const save = useSave((b: Record<string, string>) => api('/settings', { method: 'PUT', json: b }), [['settings']])
  const set = (k: string, val: string) => setF({ ...v, [k]: val })
  return (
    <Card>
      <CardHeader title="Profil és értesítések" subtitle="Ez látszik a gazdaprofilodon" icon={<UserRound className="size-5" />}
        action={<Link to={`/gazda/${ME.id}`} className="text-xs font-medium text-vine-700 dark:text-vine-300">Profilom megtekintése →</Link>} />
      <div className="grid gap-4 px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Megjelenített név"><Input value={v.profile_name ?? ''} onChange={(e) => set('profile_name', e.target.value)} /></Field>
          <Field label="Település / kerület" hint="Utcát, házszámot nem tárolunk."><Input value={v.profile_city ?? ''} onChange={(e) => set('profile_city', e.target.value)} /></Field>
        </div>
        <Field label="Bemutatkozás"><Textarea value={v.profile_about ?? ''} onChange={(e) => set('profile_about', e.target.value)} /></Field>
        <Field label="Elérhetőség" hint="Nyilvános — pl. „Üzenetben” vagy telefonszám."><Input value={v.profile_contact ?? ''} onChange={(e) => set('profile_contact', e.target.value)} /></Field>
        <div className="flex flex-col gap-3">
          {TOGGLES.map(([k, label, hint]) => (
            <label key={k} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-vine-600)]" checked={v[k] === '1'} onChange={(e) => set(k, e.target.checked ? '1' : '0')} />
              <span className="text-sm">
                <span className="font-medium">{label}</span>
                {hint && <span className="block text-xs text-muted">{hint}</span>}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={() => save.mutate(v, { onSuccess: () => setF(null) })}>Profil mentése</Button>
          {save.isSuccess && !f && <span className="text-sm text-vine-700 dark:text-vine-300">Elmentve</span>}
        </div>
      </div>
    </Card>
  )
}
