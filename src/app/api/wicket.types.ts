import type { OrderTotals, ProductRowContext, ProductRowSummary } from './productRows.types'

export type { ProductRowContext } from './productRows.types'

export interface WicketSavePayload extends ProductRowContext {
  [key: string]: unknown
}

export interface WicketMainMenuPayload extends ProductRowContext {
  model: string
  productType?: string
}

export interface WicketCalculationPayload {
  orderId: number
  productRowId: number
  modelId: string | number
  companyId?: number | null
  productType?: string
  model?: string
}

export type WicketAccessoryRole = 'lock_component' | 'skud' | 'door_closer' | 'bumper'

export interface WicketAccessorySelectionPayload {
  role: WicketAccessoryRole
  materialItemId: number
  providedByManufacturer: boolean
  installedByManufacturer: boolean
}

export interface WicketAccessoryCompositionContext {
  orderId: number
  productRowId: number
}

export interface WicketAccessoryCompositionPayload extends WicketAccessoryCompositionContext {
  lockVersion: number
  lockComponents: WicketAccessorySelectionPayload[]
  skud: WicketAccessorySelectionPayload[]
  doorClosers: WicketAccessorySelectionPayload[]
  bumpers: WicketAccessorySelectionPayload[]
}

export interface WicketAccessoryCompositionResponse {
  lockVersion: number
  lockComponents: ProductRowSummary[]
  skud: ProductRowSummary[]
  doorClosers: ProductRowSummary[]
  bumpers: ProductRowSummary[]
  orderTotals: OrderTotals
}

export interface SelectItem {
  id: string | number
  name: string
}

/** Элемент списка цветов щита (dir_paints). isStandard: 1 — стандартная, 0 — не стандартная. */
export interface ColorShieldItem extends SelectItem {
  isStandard?: 0 | 1
  paintTypeId: number
  paintTypeName: string
  consumptionRate: number
  /** HEX-цвет для визуализации (из dir_color.hex через dir_paints.color) */
  hex?: string | null
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
  colorHex?: string | null
  colorImage?: string | null
  coatingHex?: string | null
  coatingImage?: string | null
  reliefImage?: string | null
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
  materials:  string[]
  thickness:  string[]
}

export interface ProfnastilRow {
  id: string | number
  material: string
  thickness: string | number
  typeOfCoating: string
  coatingHex?: string | null
  coatingImage?: string | null
  reliefImage?: string | null
  /** camelCase, как в API и в БД dir_filling_profnastil */
  priceM2?: string | number
  weightM2?: string | number
}

export interface ProfnastilTableResponse {
  table: ProfnastilRow[]
  pagination?: SidingPagination
}

export interface ProfnastilFormOption {
  id: string | number
  name: string
}

export interface ProfnastilCoatingOption extends ProfnastilFormOption {
  id: string
  profnastilId: number
  thickness: string | number
  coatingHex: string | null
  coatingImage: string | null
  reliefImage: string | null
}

export interface ProfnastilColorOption extends ProfnastilFormOption {
  id: number
  hex: string | null
  image: string | null
}

export interface ProfnastilFormOptions {
  profiles: ProfnastilFormOption[]
  coatings: ProfnastilCoatingOption[]
  manufacturers: ProfnastilFormOption[]
  colors: ProfnastilColorOption[]
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

export interface FenceGapOption {
  id: number
  name: number
  quantity: number
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
  companyId?: number
}

/** Ответ get-data: данные расчёта + этапы навигации (для режима редактирования). */
export interface WicketGetDataResponse {
  visitedPages: string[]
  activePage: string
  /** ID краски (dir_paints); для type1 — единственное хранимое поле выбора краски рамы. */
  colorShieldId?: number | null
  [key: string]: unknown
}
