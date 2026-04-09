export interface SelectItem {
  id: string | number
  name: string
}

/** Элемент списка цветов щита (dir_paints). isStandard: 1 — стандартная, 0 — не стандартная. */
export interface ColorShieldItem extends SelectItem {
  isStandard?: 0 | 1
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
  priceM2?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface SidingPagination {
  page: number
  pageSize: number
  totalCount: number
  pageCount: number
}

export interface SidingTableResponse {
  table: SidingRow[]
  pagination: SidingPagination
}

export interface ProfnastilFilters {
  companies:  string[]
  materials:  string[]
  thickness:  string[]
  colors:     string[]
}

export interface ProfnastilRow {
  id: string | number
  company: string
  material: string
  thickness: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_profnastil */
  priceM2?: string | number
  weightM2?: string | number
}

export interface ProfnastilTableResponse {
  table: ProfnastilRow[]
  pagination?: SidingPagination
}

export interface RecalculateResponse {
  priceDealer: string | number
  priceRetail: string | number
}

/** Ответ get-data: данные расчёта + этапы навигации (для режима редактирования). */
export interface WicketGetDataResponse {
  visitedPages: string[]
  activePage: string
  [key: string]: unknown
}
