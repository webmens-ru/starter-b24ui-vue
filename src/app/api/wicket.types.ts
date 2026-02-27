export interface SelectItem {
  id: string | number
  name: string
}

export interface FilterOptionItem {
  id: string
  name: string
}

export interface FilterOptions {
  [key: string]: FilterOptionItem[]
}

export interface SidingFilters {
  companies: string[]
  materials: string[]
  form: string[]
  typeOfCoating: string[]
  colors: string[]
}

export interface SidingRow {
  id: string | number
  company: string
  material: string
  form: string
  typeOfCoating: string
  color: string
  price_m2?: number
  deliveryTime?: string
  inStock?: string
}

export interface RecalculateResponse {
  price_dealer: string | number
  price_retail: string | number
}
