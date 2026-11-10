// Közös típusok a kliens és a szerver között.

export interface Parcel {
  id: number
  name: string
  hrsz: string | null // helyrajzi szám
  location: string | null
  area_ha: number
  variety: string | null
  rootstock: string | null
  planted_year: number | null
  row_spacing_m: number | null
  vine_spacing_m: number | null
  vine_count: number | null
  training_system: string | null
  color: string
  notes: string | null
}

export type WorkType =
  | 'metszés'
  | 'kötözés'
  | 'zöldmunka'
  | 'talajművelés'
  | 'tápanyag-utánpótlás'
  | 'kaszálás'
  | 'egyéb'

export interface WorkEntry {
  id: number
  parcel_id: number
  date: string
  type: WorkType
  hours: number | null
  workers: number | null
  cost_huf: number | null
  notes: string | null
}

export type ProductSource = 'nebih' | 'manual' | 'demo'

export interface ActiveSubstance {
  name: string
  concentration: string | null
}

export interface ProductUse {
  id?: number
  product_id?: number
  culture: string
  pest: string
  dose_min: number | null
  dose_max: number | null
  dose_unit: string // l/ha, kg/ha, %
  phi_days: number | null // élelmezés-egészségügyi várakozási idő (ÉVI)
  rei_days: number | null // munkaegészségügyi várakozási idő (MVI)
  max_treatments: number | null
  notes: string | null
}

export interface Product {
  id: number
  name: string
  permit_number: string | null
  holder: string | null // engedélyes
  formulation: string | null
  category: string | null // forgalmi kategória: I., II., III.
  active_substances: ActiveSubstance[]
  permit_valid_until: string | null
  use_until: string | null // felhasználási idő lejárata (visszavont / lejárt engedélynél)
  status: string | null
  source: ProductSource
  nebih_id: string | null
  nebih_url: string | null
  synced_at: string | null
  unit: string // készlet mértékegysége (l / kg)
  extra: ProductExtra
  stock: number
  uses: ProductUse[]
}

export interface SprayParcel {
  parcel_id: number
  treated_area_ha: number
}

export interface SprayItem {
  product_id: number
  pest: string
  dose: number
  dose_unit: string
  total_amount: number
}

export interface Spray {
  id: number
  date: string
  start_time: string | null
  end_time: string | null
  operator_name: string | null
  operator_license: string | null
  machine: string | null
  water_l_per_ha: number | null
  temperature_c: number | null
  wind: string | null
  phenology: string | null // fenológiai stádium (BBCH)
  notes: string | null
  parcels: SprayParcel[]
  items: SprayItem[]
}

export interface Harvest {
  id: number
  parcel_id: number
  date: string
  quantity_kg: number
  must_degree: number | null // mustfok (MM°)
  buyer: string | null
  notes: string | null
}

export type WarningLevel = 'error' | 'warning' | 'info'
export interface ComplianceWarning {
  level: WarningLevel
  message: string
  product_id?: number
  parcel_id?: number
}

export interface ParcelStatus {
  parcel_id: number
  last_spray_date: string | null
  harvest_allowed_from: string | null // ÉVI lejárta
  reentry_allowed_from: string | null // MVI lejárta
  sprays_this_season: number
}

export interface Dashboard {
  season: number
  total_area_ha: number
  parcel_count: number
  spray_count_season: number
  work_hours_season: number
  harvest_kg_season: number
  parcel_status: ParcelStatus[]
  recent_sprays: Spray[]
  low_stock: Pick<Product, 'id' | 'name' | 'stock' | 'unit'>[]
  monthly_sprays: { month: number; count: number }[]
}

export interface NebihStatus {
  base_url: string
  reachable: boolean
  http_status: number | null
  error: string | null
  checked_at: string
}

export interface NebihSearchHit {
  query: string // a keresés szövege — az adatlap ugyanazzal a kereséssel + sorindexszel kérhető le
  index: number
  name: string
  active_substances: string | null
  permit_type: string | null
  purpose: string | null
  valid_until: string | null
  expired: boolean
  eco: boolean
}

export interface NebihDocument {
  name: string
  url: string
}

/** A NÉBIH törzskönyv további adatai. */
export interface ProductExtra {
  permit_type?: string | null
  purpose?: string | null
  issued_at?: string | null
  sale_until?: string | null
  cultures?: string[]
  pests?: string[]
  phi_min?: number | null
  phi_max?: number | null
  aerial?: boolean | null
  drone?: boolean | null
  organic?: string | null
  bee_hazard?: string | null
  documents?: NebihDocument[]
}

export type BerryColor = 'fehér' | 'rózsaszín' | 'piros' | 'kék'

export interface Variety {
  id: number
  name: string
  other_names: string | null // vesszővel elválasztva (pl. orosz név, szinonimák)
  berry_color: BerryColor
  ripening_from: number | null // érési idő napban (rügyfakadástól)
  ripening_to: number | null
  tags: string[] // címke-azonosítók, ld. src/lib/tags.ts
  description: string | null
  links: { label: string; url: string }[]
  popularity: number
  updated_at: string
}
