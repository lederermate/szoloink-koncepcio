import { DEMO } from './env'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type {
  CollectionItem,
  ComplianceWarning,
  GrapeList,
  Dashboard,
  Harvest,
  NebihSearchHit,
  NebihStatus,
  Parcel,
  ParcelStatus,
  Product,
  Spray,
  WorkEntry,
} from '../../shared/types'

export class ApiError extends Error {
  constructor(public status: number, message: string, public warnings?: ComplianceWarning[]) {
    super(message)
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  if (DEMO) {
    const { demoRequest } = await import('../demo/backend')
    const res = await demoRequest((rest.method ?? 'GET').toUpperCase(), path, json === undefined ? undefined : JSON.parse(JSON.stringify(json)))
    if (res.status >= 400) throw new ApiError(res.status, res.body?.error ?? `Hiba (${res.status})`, res.body?.warnings)
    return res.body as T
  }
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Hiba (${res.status})`, data?.warnings)
  return data as T
}

const year = () => new Date().getFullYear()

export const useDashboard = (y = year()) => useQuery({ queryKey: ['dashboard', y], queryFn: () => api<Dashboard>(`/dashboard?year=${y}`) })
export const useParcelStatus = (y = year()) => useQuery({ queryKey: ['parcel-status', y], queryFn: () => api<ParcelStatus[]>(`/parcel-status?year=${y}`) })
export const useParcels = () => useQuery({ queryKey: ['parcels'], queryFn: () => api<Parcel[]>('/parcels') })
export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') })
export const useSprays = (y?: number, parcel_id?: number) =>
  useQuery({
    queryKey: ['sprays', y ?? 'all', parcel_id ?? 'all'],
    queryFn: () => api<Spray[]>(`/sprays?${new URLSearchParams({ ...(y ? { year: String(y) } : {}), ...(parcel_id ? { parcel_id: String(parcel_id) } : {}) })}`),
  })
export const useSpray = (id?: number) => useQuery({ queryKey: ['spray', id], queryFn: () => api<Spray>(`/sprays/${id}`), enabled: !!id })
export const useWork = (parcel_id?: number) =>
  useQuery({ queryKey: ['work', parcel_id ?? 'all'], queryFn: () => api<WorkEntry[]>(`/work${parcel_id ? `?parcel_id=${parcel_id}` : ''}`) })
export const useHarvests = (parcel_id?: number) =>
  useQuery({ queryKey: ['harvests', parcel_id ?? 'all'], queryFn: () => api<Harvest[]>(`/harvests${parcel_id ? `?parcel_id=${parcel_id}` : ''}`) })
export const useCollection = () => useQuery({ queryKey: ['collection'], queryFn: () => api<CollectionItem[]>('/collection') })
export const useLists = () => useQuery({ queryKey: ['lists'], queryFn: () => api<GrapeList[]>('/lists') })
export const useList = (id: number) => useQuery({ queryKey: ['lists', id], queryFn: () => api<GrapeList>(`/lists/${id}`), retry: false })
export const useStock = () => useQuery({ queryKey: ['stock'], queryFn: () => api<any[]>('/stock') })
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api<Record<string, string>>('/settings') })
export const useNebihStatus = () =>
  useQuery({ queryKey: ['nebih-status'], queryFn: () => api<NebihStatus>('/nebih/status'), staleTime: 60_000 })
export const useNebihSearch = (q: string) =>
  useQuery({ queryKey: ['nebih-search', q], queryFn: () => api<{ hits: NebihSearchHit[]; has_more: boolean }>(`/nebih/search?q=${encodeURIComponent(q)}`), enabled: q.length >= 2, retry: false })

/** Általános mutáció, ami sikeresen lefutva minden releváns lekérdezést frissít. */
export function useSave<TBody, TRes = unknown>(fn: (body: TBody) => Promise<TRes>, invalidate: QueryKey[] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const k of [...invalidate, ['dashboard'], ['parcel-status'], ['products'], ['stock']]) qc.invalidateQueries({ queryKey: k })
    },
  })
}
