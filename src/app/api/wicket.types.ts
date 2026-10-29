import type { OrderTotals, ProductRowContext, ProductRowSummary } from './productRows.types'
import type { FillingDrawingMetadata } from './fillingDrawingProfiles'
import type { ParticipantRole, ParticipantRoleField } from '../participantRoles'
import type { FillingMaterialGroup, FillingSide } from '../fillingMaterialGroups'
import type { FillingSideCount } from '../fillingSideCounts'
import type { FillingOrientation } from '../fillingOrientations'
import type { FrameSubtypeCode } from '../frameSubtypes'
import type { GrilleSide } from '../grilleSides'

export interface GrilleSideProperties { grilleSideCode?: GrilleSide | null }
export interface GrilleSideProblem { code: 'missing' | 'invalid'; message: string }

export interface FrameSubtypeProperties { frameSubtypeCode?: FrameSubtypeCode | null }
export interface FrameSubtypeProblem { code: 'missing' | 'invalid'; message: string }

export interface FillingOrientationProperties { fillingOrientationCode?: FillingOrientation | null }
export interface FillingOrientationProblem { code: 'missing' | 'invalid'; message: string }

export interface FillingSideCountProperties { fillingSideCount?: FillingSideCount | null }
export interface FillingSideCountProblem { code: 'missing' | 'invalid'; message: string }

export interface FillingGroupProperties {
  materialFacadeGroupCode?: FillingMaterialGroup | null
  materialYardGroupCode?: FillingMaterialGroup | null
}
export type FillingGroupProblems = Partial<Record<FillingSide, { code: string; message: string } | null>>

export type ParticipantRoleProperties = Partial<Record<`${ParticipantRoleField}Code`, ParticipantRole | null>>
export type ParticipantRoleProblems = Partial<Record<ParticipantRoleField, { code: string; message: string } | null>>

export type { ProductRowContext } from './productRows.types'

export interface OpeningOrientation {
  opensOutward: boolean
  hingeSide: 'left' | 'right'
}

export interface OpeningOrientationProblem {
  code: 'invalid' | 'missing' | 'inactive'
  message: string
}

export interface OpeningOption extends OpeningOrientation {
  id: number
  name: string
  pathPhoto: string | null
}

export interface OpeningOptionsResponse {
  options: OpeningOption[]
  problems: Array<{ id: number; message: string }>
}

export interface WicketSavePayload extends ProductRowContext, ParticipantRoleProperties, FillingGroupProperties, FillingSideCountProperties, FillingOrientationProperties, FrameSubtypeProperties, GrilleSideProperties {
  coverStrips?: CoverStripSelection[]

  paintId?: number | null
  paintColorId?: number | null
  /** Compatibility input only; outgoing requests remove this alias. */
  colorShieldId?: number | null
  providesPrimer?: string | null
  /** Null for a customer-provided set; providesLockCode preserves its presence. */
  additionalPenMaterialItemId?: number | null
  additionalPenStreetMaterialItemId?: number | null
  additionalPenYardMaterialItemId?: number | null
  additionalPenSidesConfigured?: number
  additionalPenStreetId?: number | null
  additionalPenStreetColorId?: number | null
  additionalPenYardId?: number | null
  additionalPenYardColorId?: number | null
  additionalPenStreetMarking?: string
  additionalPenYardMarking?: string
  additionalPenStreetColorName?: string
  additionalPenYardColorName?: string
  lockSetId?: number | null
  providesLock?: string | null
  lockInstaller?: string | null
  calculationName?: never
  clientName?: never
  clientLastName?: never
  clientSurname?: never
  clientPhone?: never
  clientEmail?: never
  clientAddress?: never
  clientComment?: never
  countryCode?: never
  [key: string]: unknown
}

export interface WicketRootMutationResponse {
  lockVersion: number
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
export type WicketAccessoryInstallationRole = `${WicketAccessoryRole}_installation`

export interface WicketAccessorySelectionPayload<Role extends WicketAccessoryRole = WicketAccessoryRole> {
  role: Role
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
  lockComponents: WicketAccessorySelectionPayload<'lock_component'>[]
  skud: WicketAccessorySelectionPayload<'skud'>[]
  doorClosers: WicketAccessorySelectionPayload<'door_closer'>[]
  bumpers: WicketAccessorySelectionPayload<'bumper'>[]
}

type WicketAccessoryProductRowBase = Omit<
  ProductRowSummary,
  | 'productType'
  | 'modelId'
  | 'parentProductRowId'
  | 'materialItemId'
  | 'rowKind'
  | 'relationRole'
  | 'name'
  | 'article'
  | 'unit'
> & {
  modelId: null
  parentProductRowId: number
  materialItemId: number
  name: string
  article: string
  unit: NonNullable<ProductRowSummary['unit']>
}

export type WicketAccessoryProductRow<Role extends WicketAccessoryRole> =
  | (WicketAccessoryProductRowBase & {
    productType: 'material'
    rowKind: 'material'
    relationRole: Role
  })
  | (WicketAccessoryProductRowBase & {
    productType: 'service'
    rowKind: 'service'
    relationRole: `${Role}_installation`
  })

export interface WicketAccessoryCompositionResponse {
  lockVersion: number
  lockComponents: WicketAccessoryProductRow<'lock_component'>[]
  skud: WicketAccessoryProductRow<'skud'>[]
  doorClosers: WicketAccessoryProductRow<'door_closer'>[]
  bumpers: WicketAccessoryProductRow<'bumper'>[]
  orderTotals: OrderTotals
}

export interface SelectItem {
  id: string | number
  name: string
}

export interface PaintColorItem { id: number; name: string; hex: string | null; image: string | null }
export interface PaintCategoryItem { id: number; name: string; isFixedColor: boolean; requiresColorNote: boolean; isCustomerSupplied: boolean }
export interface PaintItem {
  id: number
  name: string
  paintCategoryId: number
  paintCategoryName: string
  isFixedColor: boolean
  requiresColorNote: boolean
  isCustomerSupplied: boolean
  paintTypeId: number | null
  paintTypeName: string | null
  consumptionRate: number | null
  primers: Array<{ id: number; name: string }>
  colors: PaintColorItem[]
}
/** Historical catalog response, retained only at the API compatibility boundary. */
export interface PaintCategory {
  id: number
  name: string
  isFixedColor: boolean
  requiresColorNote: boolean
  isCustomerSupplied: boolean
  requiresPaintType: boolean
  allowsAnyPrimer: boolean
  quantityCalculationMode: 'consumption' | 'ceilKg'
  costCoefficient: number
}

/** Элемент списка красок. Связь с поведением задаёт paintCategoryId. */
export interface ColorShieldItem extends SelectItem {
  isStandard?: 0 | 1
  paintCategoryName?: string
  paintCategoryId?: number
  isFixedColor?: boolean
  requiresColorNote?: boolean
  isCustomerSupplied?: boolean
  primers?: Array<{ id: number; name: string }>
  colors?: PaintColorItem[]
  paintTypeId: number | null
  paintTypeName: string | null
  consumptionRate: number | null
  hex?: string | null
}

export interface FilterOptionItem {
  id: string
  name: string
}

export interface FilterOptions {
  [key: string]: FilterOptionItem[]
}

export interface FillingAppearanceOptions {
  manufacturers: Array<{ id: number; name: string }>
  colors: Array<{ id: number; name: string; hex: string | null; image: string | null }>
}

export interface SidingFilters {
  materials: string[]
  form: string[]
  typeOfCoating: string[]
}

export interface SidingRow extends FillingDrawingMetadata {
  id: string | number
  sidingFormId?: number
  typeOfCoatingId?: number
  material: string
  form: string
  typeOfCoating: string
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
  typeOfCoating: string[]
}

export interface ProfnastilRow extends FillingDrawingMetadata {
  id: string | number
  profileTypeId?: number
  typeOfCoatingId?: number
  name: string
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

export interface ProfnastilCoatingOption extends ProfnastilFormOption, FillingDrawingMetadata {
  id: number
  colorInputMode: 'list' | 'combobox' | 'none'
  isDoubleSided: boolean
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
  typeOfCoatingId?: number | null
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
  typeOfCoatingId?: number | null
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
  gapMm: number
  label: string
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
export interface WicketGetDataResponse extends ParticipantRoleProperties, FillingGroupProperties, FillingSideCountProperties, FillingOrientationProperties, FrameSubtypeProperties, GrilleSideProperties {
  grilleSideProblem?: GrilleSideProblem | null
  frameSubtypeProblem?: FrameSubtypeProblem | null
  fillingOrientationProblem?: FillingOrientationProblem | null
  fillingSideCountProblem?: FillingSideCountProblem | null
  fillingGroupProblems?: FillingGroupProblems
  participantRoleProblems?: ParticipantRoleProblems
  openingOrientation?: OpeningOrientation | null
  openingOrientationProblem?: OpeningOrientationProblem | null
  visitedPages: string[]
  activePage: string
  /** Null for a customer-provided set; providesLockCode preserves its presence. */
  additionalPenMaterialItemId?: number | null
  additionalPenStreetMaterialItemId?: number | null
  additionalPenYardMaterialItemId?: number | null
  additionalPenSidesConfigured?: number
  additionalPenStreetId?: number | null
  additionalPenStreetColorId?: number | null
  additionalPenYardId?: number | null
  additionalPenYardColorId?: number | null
  additionalPenStreetMarking?: string
  additionalPenYardMarking?: string
  additionalPenStreetColorName?: string
  additionalPenYardColorName?: string
  lockSetId?: number | null
  providesLock?: string | null
  lockInstaller?: string | null
  paintName?: string
  colorShieldName?: string
  colorShieldHex?: string | null
  paintSelectionUnavailable?: boolean
  paintSelection?: { isFixedColor: boolean; requiresColorNote: boolean; isPaintAvailable: boolean } | null
  /** Canonical paint/color FKs; colorShieldId is a legacy paint alias. */
  providesPaintCode?: 'manufacturer' | 'customer'
  providesPrimerCode?: 'manufacturer' | 'customer'
  doesPaintingFrameCode?: 'manufacturer' | 'customer'
  paintId?: number | null
  paintColorId?: number | null
  colorShieldId?: number | null
  colorShieldNote?: string
  primerId?: number | null
  providesPrimer?: string | null
  [key: string]: unknown
}

export interface CoverStripSelection {
  materialItemId: number
  parameters: { attributeId: number; colorId: number }[]
}
export interface CoverStripCatalogItem {
  materialItemId: number
  name: string
  article: string
  price: number
  attributes: Record<string, string | number | boolean | null>
  orderParameters: { attributeId: number; code: string; name: string; dataType: string; required: boolean; values: { id: number; label: string }[] }[]
}

export interface CoverStripSummary {
  blockCode: 'coverStrips'
  blockName: string
  params: { paramCode: string; name: string; value: string; materialItemId: number; pieceIndex: number; parameters: Record<string, unknown>[] }[]
}
export interface WicketConfigurationResponse extends Record<string, unknown> {
  coverStrips?: CoverStripSelection[]
  coverStripSummary?: CoverStripSummary | null
}
