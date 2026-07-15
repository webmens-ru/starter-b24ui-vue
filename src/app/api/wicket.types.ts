export interface SelectItem {
  id: string | number
  name: string
}

/** Элемент списка цветов щита (dir_paints). isStandard: 1 — стандартная, 0 — не стандартная. */
export interface ColorShieldItem extends SelectItem {
  isStandard?: 0 | 1
  /** Категория краски (dir_paints.paintCategory), хранится по-русски */
  paintCategory?: 'Эмаль' | 'Молотковая' | 'Маслянная' | string | null
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
  colorId?: string | number | null
  company: string
  material: string
  thickness: string | number
  typeOfCoating: string
  color: string
  colorHex?: string | null
  colorImage?: string | null
  /** camelCase, как в API и в БД dir_filling_profnastil */
  priceM2?: string | number
  weightM2?: string | number
}

export interface ProfnastilTableResponse {
  table: ProfnastilRow[]
  pagination?: SidingPagination
}

export interface ZhalyuziFilters {
  companies:  string[]
  materials:  string[]
  thickness:  string[]
  typeOfCoating: string[]
  colors:     string[]
}

export interface ZhalyuziRow {
  id: string | number
  company: string
  material: string
  thickness: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_zhalyuzi (цена за единицу) */
  price?: string | number
  weight?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface ZhalyuziTableResponse {
  table: ZhalyuziRow[]
  pagination?: SidingPagination
}

export interface SpFilters {
  companies:     string[]
  materials:     string[]
  thickness:     string[]
  width:         string[]
  typeOfCoating: string[]
  colors:        string[]
}

export interface SpRow {
  id: string | number
  company: string
  material: string
  thickness: string | number
  width: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_sp (цена за м²) */
  priceM2?: string | number
  weightM2?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface SpTableResponse {
  table: SpRow[]
  pagination?: SidingPagination
}

export interface SheetFilters {
  companies:     string[]
  materials:     string[]
  thickness:     string[]
  width:         string[]
  typeOfCoating: string[]
  colors:        string[]
}

export interface SheetRow {
  id: string | number
  company: string
  material: string
  thickness: string | number
  width: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_sheet (цена за м²) */
  priceM2?: string | number
  weightM2?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface SheetTableResponse {
  table: SheetRow[]
  pagination?: SidingPagination
}

export interface FenceFilters {
  companies:     string[]
  materials:     string[]
  widthFence:    string[]
  typeOfCoating: string[]
  colors:        string[]
}

export interface FenceRow {
  id: string | number
  company: string
  material: string
  widthFence: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_fence (цена за единицу) */
  price?: string | number
  weight?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface FenceTableResponse {
  table: FenceRow[]
  pagination?: SidingPagination
}

export interface LamelFilters {
  companies:     string[]
  materials:     string[]
  width:         string[]
  typeOfCoating: string[]
  colors:        string[]
}

export interface LamelRow {
  id: string | number
  company: string
  material: string
  width: string | number
  typeOfCoating: string
  color: string
  /** camelCase, как в API и в БД dir_filling_lamel (цена за единицу) */
  price?: string | number
  weight?: string | number
  deliveryTime?: string
  inStock?: string
}

export interface LamelTableResponse {
  table: LamelRow[]
  pagination?: SidingPagination
}

export interface RecalculateResponse {
  priceDealer: string | number
  priceRetail: string | number
}

/** GET /api/order/saved-price */
export interface OrderSavedPriceResponse {
  hasSavedPrice: boolean
  isActual: boolean
  priceRetail?: string
  priceDealer?: string
  lastCalculatedAt?: number
}

export interface CompanyScopedPayload {
  companyId: number
}

/** Ответ get-data: данные расчёта + этапы навигации (для режима редактирования). */
export interface WicketGetDataResponse {
  visitedPages: string[]
  activePage: string
  /** ID краски (dir_paints); для type1 — единственное хранимое поле выбора краски рамы. */
  colorShieldId?: number | null
  [key: string]: unknown
}
