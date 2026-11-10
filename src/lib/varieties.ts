import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Variety } from '../../shared/types'

export const useVarieties = () => useQuery({ queryKey: ['varieties'], queryFn: () => api<Variety[]>('/varieties'), staleTime: 60_000 })

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'jo', ж: 'zs', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 'sz', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'cs', ш: 's', щ: 'scs', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'ju', я: 'ja',
}

/** Kisbetű, ékezet nélkül, cirill → magyaros átírás, csak betűk/számok. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => CYR[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/**
 * Elírástűrő névkeresés (a szoloink.hu „Elírástűrő” gyorskeresésének megfelelője):
 * pontos egyezés > szókezdet > részszó > kis szerkesztési távolság. 0 = nincs találat.
 */
export function matchScore(v: Variety, query: string): number {
  const q = fold(query)
  if (!q) return 1
  const names = [v.name, ...(v.other_names?.split(',') ?? [])].map(fold).filter(Boolean)
  let best = 0
  for (const n of names) {
    if (n === q) best = Math.max(best, 100)
    else if (n.startsWith(q)) best = Math.max(best, 80)
    else if (n.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 70)
    else if (n.includes(q)) best = Math.max(best, 60)
    else {
      const tol = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3
      const words = [n, ...n.split(' ')]
      const d = Math.min(...words.map((w) => lev(q, w.slice(0, Math.max(q.length, w.length)), tol)), ...words.map((w) => lev(q, w.slice(0, q.length), tol)))
      if (d <= tol) best = Math.max(best, 50 - d * 10)
    }
  }
  return best
}

// Érési idő → naptári dátum: átlagos rügyfakadás április 15. körül (Kárpát-medence, tájékoztató jellegű)
const BUDBREAK = new Date(2026, 3, 15)
export const RIPE_START = new Date(2026, 6, 1) // július 1.
export const RIPE_END = new Date(2026, 10, 1) // november 1.
export const dayToDate = (days: number) => new Date(BUDBREAK.getTime() + days * 86_400_000)
export const ripeningPos = (days: number) =>
  Math.min(1, Math.max(0, (dayToDate(days).getTime() - RIPE_START.getTime()) / (RIPE_END.getTime() - RIPE_START.getTime())))
export const ripeningLabel = (v: Pick<Variety, 'ripening_from' | 'ripening_to'>) => {
  if (v.ripening_from == null) return null
  const f = (d: Date) => d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
  const a = dayToDate(v.ripening_from)
  const b = dayToDate(v.ripening_to ?? v.ripening_from)
  return `${f(a)} – ${f(b)}`
}
export function ripeningClass(days: number | null) {
  if (days == null) return null
  return days < 110 ? 'nagyon korai' : days < 125 ? 'korai' : days < 145 ? 'középérésű' : days < 160 ? 'középkései' : 'kései'
}

export const BERRY: Record<string, { fill: string; light: string; label: string }> = {
  fehér: { fill: '#c9d36b', light: '#eef3b4', label: 'fehér / sárga' },
  rózsaszín: { fill: '#e07a96', light: '#f7c6d3', label: 'rózsaszín' },
  piros: { fill: '#b8323f', light: '#ec8a92', label: 'piros' },
  kék: { fill: '#3b2a5c', light: '#8d78b8', label: 'kék / fekete' },
}
