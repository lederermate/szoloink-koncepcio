import { Link } from 'react-router-dom'
import { TAGS } from '../../shared/tags'
import { BERRY, ripeningClass } from '../lib/varieties'
import { GrapeArt, RipeningBar } from './Grape'
import { Badge, cx } from './ui'
import type { Variety } from '../../shared/types'

export function VarietyCard({ v, mine }: { v: Variety; mine?: boolean }) {
  const use = v.tags.find((t) => ['csemege', 'bor', 'kettos'].includes(t))
  return (
    <Link to={`/szolo/${v.id}`} className="group">
      <div className="flex h-full gap-3 rounded-2xl border border-line bg-surface p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-vine-900/5">
        <GrapeArt v={v} className="size-20 sm:size-24 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight truncate group-hover:text-vine-700 dark:group-hover:text-vine-300">{v.name}</h3>
              <p className="text-xs text-muted truncate">{v.other_names || ' '}</p>
            </div>
            {mine && <Badge tone="brand">kertemben</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {use && <Badge>{TAGS[use]?.name}</Badge>}
            <Badge><span className="size-2 rounded-full" style={{ background: BERRY[v.berry_color]?.fill }} />{v.berry_color}</Badge>
            {v.tags.includes('rezisztens') && <Badge tone="green">rezisztens</Badge>}
            {v.tags.includes('magvatlan') && <Badge tone="grape">magvatlan</Badge>}
          </div>
          <div className={cx('mt-auto pt-2')}>
            <RipeningBar v={v} compact />
          </div>
        </div>
      </div>
      <span className="sr-only">{ripeningClass(v.ripening_from)}</span>
    </Link>
  )
}
