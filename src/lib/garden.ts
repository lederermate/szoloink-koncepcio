// „Szőlőim” = a kézzel felvett fajták + az ültetvényekben lévő fajtablokkok összesítése.
import { useMemo } from 'react'
import { useCollection, useParcels } from './api'
import { fold, useVarieties } from './varieties'
import type { CollectionItem, Parcel, Planting, Variety } from '../../shared/types'

export interface MyVariety {
  key: string
  name: string
  variety?: Variety // katalógusbeli fajta (ha van)
  manual?: CollectionItem // kézzel felvéve
  plantings: { parcel: Parcel; planting: Planting }[]
  vines: number | null
}

export const findVariety = (varieties: Variety[], name: string | null | undefined) => {
  const f = fold(name ?? '')
  return f ? varieties.find((v) => fold(v.name) === f || (v.other_names ?? '').split(',').some((o) => fold(o) === f)) : undefined
}

export function useMyVarieties() {
  const { data: varieties } = useVarieties()
  const { data: parcels } = useParcels()
  const { data: collection } = useCollection()
  const data = useMemo(() => {
    if (!varieties || !parcels || !collection) return undefined
    const map = new Map<string, MyVariety>()
    const entry = (name: string, v?: Variety) => {
      const key = v ? `v${v.id}` : `n${fold(name)}`
      if (!map.has(key)) map.set(key, { key, name: v?.name ?? name, variety: v, plantings: [], vines: null })
      return map.get(key)!
    }
    for (const c of collection) {
      const v = varieties.find((x) => x.id === c.variety_id)
      if (v) entry(v.name, v).manual = c
    }
    for (const parcel of parcels)
      for (const planting of parcel.plantings) {
        const e = entry(planting.variety, findVariety(varieties, planting.variety))
        e.plantings.push({ parcel, planting })
        if (planting.vine_count != null) e.vines = (e.vines ?? 0) + planting.vine_count
      }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'hu'))
  }, [varieties, parcels, collection])
  const ids = useMemo(() => new Set((data ?? []).flatMap((m) => (m.variety ? [m.variety.id] : []))), [data])
  return { data, ids }
}
