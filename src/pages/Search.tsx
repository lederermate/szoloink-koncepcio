import { ChevronDown, Search as SearchIcon, SlidersHorizontal, Tag, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TAG_CATEGORIES, TAGS } from '../../shared/tags'
import { useParcels } from '../lib/api'
import { BERRY, fold, matchScore, useVarieties } from '../lib/varieties'
import { VarietyCard } from '../components/VarietyCard'
import { Badge, Card, Empty, Input, PageHeader, Segmented, Select, Spinner, cx } from '../components/ui'

type Sort = 'pop' | 'name' | 'ripe'
type Mode = 'tags' | 'text'
const RIPE = [
  { id: 'korai', label: 'Korai (< 125 nap)', test: (d: number) => d < 125 },
  { id: 'kozep', label: 'Középérésű (125–150)', test: (d: number) => d >= 125 && d < 150 },
  { id: 'kesei', label: 'Kései (150+)', test: (d: number) => d >= 150 },
]

export default function Search() {
  const { data: varieties, isLoading } = useVarieties()
  const { data: parcels = [] } = useParcels()
  const [sp, setSp] = useSearchParams()
  const [mode, setMode] = useState<Mode>('tags')
  const [sort, setSort] = useState<Sort>('pop')
  const [openCat, setOpenCat] = useState<string | null>(TAG_CATEGORIES[0].id)
  const [colors, setColors] = useState<string[]>([])
  const [ripe, setRipe] = useState<string | null>(null)
  const q = sp.get('q') ?? ''
  const tags = sp.get('cimke')?.split(',').filter(Boolean) ?? []
  const text = sp.get('szoveg') ?? ''
  const mine = new Set(parcels.map((p) => fold(p.variety ?? '')))

  const update = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    setSp(n, { replace: true })
  }
  const toggleTag = (id: string) => update('cimke', (tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id]).join(','))

  const results = useMemo(() => {
    if (!varieties) return []
    const rows = varieties
      .map((v) => ({ v, score: mode === 'tags' ? matchScore(v, q) : 1 }))
      .filter(({ v, score }) => score > 0)
      .filter(({ v }) => tags.every((t) => v.tags.includes(t)))
      .filter(({ v }) => !colors.length || colors.includes(v.berry_color))
      .filter(({ v }) => !ripe || (v.ripening_from != null && RIPE.find((r) => r.id === ripe)!.test(v.ripening_from)))
      .filter(({ v }) => mode !== 'text' || !text || fold(`${v.description ?? ''} ${v.name}`).includes(fold(text)))
    return rows.sort((a, b) =>
      q && mode === 'tags' && b.score !== a.score ? b.score - a.score
        : sort === 'name' ? a.v.name.localeCompare(b.v.name, 'hu')
        : sort === 'ripe' ? (a.v.ripening_from ?? 999) - (b.v.ripening_from ?? 999)
        : b.v.popularity - a.v.popularity,
    )
  }, [varieties, q, tags, colors, ripe, sort, mode, text])

  const activeFilters = tags.length + colors.length + (ripe ? 1 : 0)

  return (
    <>
      <PageHeader title="Szőlő keresése" subtitle={varieties ? `${varieties.length} fajta a katalógusban` : undefined}
        actions={<Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'tags', label: 'Név és címkék' }, { value: 'text', label: 'Keresés leírásban' }]} />} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* Szűrők */}
        <Card className="p-4 lg:sticky lg:top-20">
          {mode === 'tags' ? (
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Szőlő neve (elírástűrő)…" className="pl-9" />
            </div>
          ) : (
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <Input value={text} onChange={(e) => update('szoveg', e.target.value)} placeholder="Szó a leírásban (pl. lugas, fagytűrés)…" className="pl-9" />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5"><SlidersHorizontal className="size-3.5" /> Szűrők</span>
            {activeFilters > 0 && <button className="text-xs text-vine-700 dark:text-vine-300 font-medium" onClick={() => { setColors([]); setRipe(null); update('cimke', '') }}>Törlés ({activeFilters})</button>}
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Bogyószín</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(BERRY).map(([k, c]) => (
                <button key={k} onClick={() => setColors(colors.includes(k) ? colors.filter((x) => x !== k) : [...colors, k])}
                  className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-xs transition', colors.includes(k) ? 'border-vine-500 bg-vine-50 text-vine-800 dark:bg-vine-900/50 dark:text-vine-100' : 'border-line hover:bg-surface-2')}>
                  <span className="size-2.5 rounded-full" style={{ background: c.fill }} /> {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Érési idő</div>
            <div className="flex flex-wrap gap-1.5">
              {RIPE.map((r) => (
                <button key={r.id} onClick={() => setRipe(ripe === r.id ? null : r.id)}
                  className={cx('rounded-full border px-2.5 h-7 text-xs transition', ripe === r.id ? 'border-vine-500 bg-vine-50 text-vine-800 dark:bg-vine-900/50 dark:text-vine-100' : 'border-line hover:bg-surface-2')}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm font-medium mb-1 flex items-center gap-1.5"><Tag className="size-3.5" /> Címkék</div>
          <div className="divide-y divide-line">
            {TAG_CATEGORIES.map((c) => {
              const n = c.tags.filter((t) => tags.includes(t.id)).length
              return (
                <div key={c.id}>
                  <button className="flex w-full items-center justify-between py-2 text-sm text-muted hover:text-fg" onClick={() => setOpenCat(openCat === c.id ? null : c.id)}>
                    <span>{c.name} {n > 0 && <Badge tone="brand" className="ml-1">{n}</Badge>}</span>
                    <ChevronDown className={cx('size-4 transition', openCat === c.id && 'rotate-180')} />
                  </button>
                  {openCat === c.id && (
                    <div className="flex flex-wrap gap-1.5 pb-3">
                      {c.tags.map((t) => (
                        <button key={t.id} onClick={() => toggleTag(t.id)}
                          className={cx('rounded-full border px-2.5 h-7 text-xs transition', tags.includes(t.id) ? 'border-vine-600 bg-vine-600 text-white' : 'border-line hover:bg-surface-2')}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Találatok */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium">{results.length} találat</span>
              {tags.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className="inline-flex items-center gap-1 rounded-full bg-vine-600 text-white px-2 h-6 text-xs">
                  {TAGS[t]?.name} <X className="size-3" />
                </button>
              ))}
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto h-9">
              <option value="pop">Népszerű elöl</option>
              <option value="name">Név szerint</option>
              <option value="ripe">Érés szerint</option>
            </Select>
          </div>
          {isLoading ? <Spinner /> : !results.length ? (
            <Card><Empty icon={<SearchIcon />} title="Nincs találat" text="Próbáljon kevesebb címkét, vagy más írásmódot — a névkeresés elírástűrő." /></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map(({ v }) => <VarietyCard key={v.id} v={v} mine={mine.has(fold(v.name))} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
