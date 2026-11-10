import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'

const nf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 })
export const n = (v: number | null | undefined, digits?: number) =>
  v == null ? '—' : digits != null ? new Intl.NumberFormat('hu-HU', { maximumFractionDigits: digits }).format(v) : nf.format(v)
export const huf = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(v)
export const d = (s: string | null | undefined, f = 'yyyy. MMM d.') => (s ? format(parseISO(s), f, { locale: hu }) : '—')
export const dLong = (s: string | null | undefined) => d(s, 'yyyy. MMMM d., EEEE')
export const today = () => format(new Date(), 'yyyy-MM-dd')
export const daysUntil = (s: string | null | undefined) => (s ? differenceInCalendarDays(parseISO(s), new Date()) : null)
export const monthShort = (m: number) => format(new Date(2000, m - 1, 1), 'LLL', { locale: hu })
export const round = (x: number, k = 3) => Math.round(x * 10 ** k) / 10 ** k
