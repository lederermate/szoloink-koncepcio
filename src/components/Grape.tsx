import { useId } from 'react'
import { BERRY, RIPE_END, RIPE_START, dayToDate, ripeningLabel, ripeningPos } from '../lib/varieties'
import { cx } from './ui'
import type { Variety } from '../../shared/types'

/** Generált fürt-illusztráció (a fotók helyén, amíg nincs feltöltött kép). */
export function GrapeArt({ v, className }: { v: Pick<Variety, 'id' | 'berry_color'>; className?: string }) {
  const gid = useId().replace(/:/g, '')
  const c = BERRY[v.berry_color] ?? BERRY['fehér']
  // determinisztikus „véletlen” fürtforma a fajta azonosítójából
  let seed = v.id * 9301 + 49297
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const rows = [4, 5, 5, 4, 4, 3, 2, 1]
  const berries: { x: number; y: number; r: number }[] = []
  rows.forEach((n, ri) => {
    for (let i = 0; i < n; i++) {
      const r = 6.2 + rnd() * 1.6
      berries.push({ x: 50 + (i - (n - 1) / 2) * 11.5 + (rnd() - 0.5) * 3, y: 30 + ri * 9.5 + (rnd() - 0.5) * 2, r })
    }
  })
  return (
    <div className={cx('relative overflow-hidden', className)} style={{ background: `radial-gradient(120% 90% at 30% 15%, ${c.light}55, transparent 60%), linear-gradient(160deg, var(--surface-2), var(--surface))` }}>
      <svg viewBox="0 0 100 110" className="absolute inset-0 m-auto h-[88%] w-[88%]" aria-hidden>
        <defs>
          <radialGradient id={`b${gid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="65%" stopColor={c.fill} />
            <stop offset="100%" stopColor={c.fill} stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <path d="M50 26 C 50 16, 54 10, 62 6" stroke="#7a5a3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M54 14 C 66 4, 84 8, 86 20 C 74 24, 62 22, 54 14 Z" fill="#6fa34a" opacity="0.9" />
        <path d="M58 14 C 68 12, 76 14, 82 19" stroke="#4e7d32" strokeWidth="0.8" fill="none" />
        {berries.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={b.r} fill={`url(#b${gid})`} />
            <ellipse cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.4} rx={b.r * 0.28} ry={b.r * 0.18} fill="white" opacity="0.45" />
          </g>
        ))}
      </svg>
    </div>
  )
}

const MONTHS = ['júl.', 'aug.', 'szept.', 'okt.']

/** Érési idő sáv július–október skálán (a szoloink.hu hónapsávjának modern változata). */
export function RipeningBar({ v, compact }: { v: Pick<Variety, 'ripening_from' | 'ripening_to'>; compact?: boolean }) {
  const has = v.ripening_from != null
  const a = has ? ripeningPos(v.ripening_from!) : 0
  const b = has ? ripeningPos(v.ripening_to ?? v.ripening_from!) : 0
  const today = (Date.now() - RIPE_START.getTime()) / (RIPE_END.getTime() - RIPE_START.getTime())
  return (
    <div className="w-full" title={has ? `Érés: ${ripeningLabel(v)} (${v.ripening_from}–${v.ripening_to ?? v.ripening_from} nap)` : 'Nincs érési adat'}>
      <div className={cx('relative w-full rounded-full bg-surface-2 ring-1 ring-inset ring-[var(--border)]', compact ? 'h-2' : 'h-3')}>
        {[0.25, 0.5, 0.75].map((x) => <span key={x} className="absolute inset-y-0 w-px bg-[var(--border)]" style={{ left: `${x * 100}%` }} />)}
        {has && (
          <span
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-vine-400 to-vine-600 shadow-sm"
            style={{ left: `${a * 100}%`, width: `${Math.max(2.5, (b - a) * 100)}%` }}
          />
        )}
        {!compact && today > 0 && today < 1 && <span className="absolute -inset-y-1 w-0.5 rounded bg-amber-500" style={{ left: `${today * 100}%` }} title="Ma" />}
      </div>
      <div className={cx('mt-1 grid grid-cols-4 text-muted', compact ? 'text-[10px]' : 'text-[11px]')}>
        {MONTHS.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  )
}

export function ripeDate(days: number) {
  return dayToDate(days)
}
