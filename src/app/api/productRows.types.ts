export type ProductRowAllowedAction =
  | 'product_row.edit_configuration'
  | 'product_row.change_quantity'
  | 'product_row.change_terms'
  | 'product_row.change_deadline'
  | 'product_row.calculate'
  | 'product_row.delete'
  | 'product_row.copy'
  | 'product_row.transition'
  | 'product_row.reorder'

export interface ProductRowStatus {
  id: number
  code: string | null
  name: string | null
  color: string | null
}

export interface ProductRowContext {
  orderId: number
  productRowId: number
  modelId: string
}

export interface ProductRowSummary {
  id: number
  orderId: number
  productType: string
  modelId: string | null
  parentProductRowId: number | null
  materialItemId: number | null
  rowKind: 'product' | 'material' | 'service'
  relationRole: string | null
  name: string
  article: string | null
  unit: { code: string, name: string, symbol: string } | null
  quantity: number
  sortOrder: number
  status: ProductRowStatus
  baseRetailUnitPrice: number | null
  baseDealerUnitPrice: number | null
  finalRetailUnitPrice: number | null
  finalDealerUnitPrice: number | null
  retailTotalPrice: number | null
  dealerTotalPrice: number | null
  adjustmentType: 'none' | 'discount' | 'markup' | null
  adjustmentValue: number | null
  adjustmentUnit: 'percent' | 'fixed' | null
  plannedCompletionAt: string | null
  lastCalculatedAt: number | null
  isActual: boolean
  calculationError: string | null
  lockVersion: number
  allowedActions: ProductRowAllowedAction[]
  availableTransitions: string[]
}

export interface OrderTotals {
  priceRetail: number | null
  priceDealer: number | null
}

export interface ProductRowListResponse {
  productRows: ProductRowSummary[]
  orderTotals: OrderTotals
  orderWorkflow: {
    statusCode: string
    availableTransitions: string[]
    canCreateProductRow: boolean
  }
}

export interface ProductRowCollectionMutationResponse {
  productRows: ProductRowSummary[]
  orderTotals: OrderTotals
}

export interface ProductRowMutationResponse {
  productRow: ProductRowSummary
  orderTotals: OrderTotals
}

export interface CreateProductRowPayload {
  orderId: number
  productType: string
  modelId: string
  model: string
}

export interface CreateMaterialProductRowPayload {
  orderId: number
  materialItemId: number
  quantity: number
}

export interface CreateInstallationProductRowPayload {
  orderId: number
  materialItemId: number
  relationRole: ProductRowInstallationRole
}

export interface CreateStandaloneProductRowsPayload {
  orderId: number
  materialItemId: number
  quantity: number
  providedByManufacturer: boolean
  installationRole: ProductRowInstallationRole | null
  idempotencyKey: string
}

export type ProductRowInstallationRole =
  | 'lock_component_installation'
  | 'skud_installation'
  | 'door_closer_installation'
  | 'bumper_installation'

export interface UpdateProductRowPayload {
  orderId: number
  productRowId: number
  lockVersion: number
  quantity?: number
  adjustmentType?: Exclude<ProductRowSummary['adjustmentType'], null>
  adjustmentValue?: number
  adjustmentUnit?: Exclude<ProductRowSummary['adjustmentUnit'], null>
  plannedCompletionAt?: string | null
}

export interface CopyProductRowPayload {
  orderId: number
  productRowId: number
  lockVersion: number
}

export interface ReorderProductRowsPayload {
  orderId: number
  productRows: Array<{
    productRowId: number
    lockVersion: number
  }>
}

export interface DeleteProductRowPayload {
  orderId: number
  productRowId: number
  lockVersion: number
}

export interface TransitionProductRowPayload {
  orderId: number
  productRowId: number
  toStatus: string
  lockVersion: number
}

export interface CalculateProductRowPayload {
  orderId: number
  productRowId: number
  modelId: string
  lockVersion: number
}

export interface ProductRowCalculationResponse {
  priceRetail: string
  priceDealer: string
  lockVersion: number
}

export interface TransitionOrderPayload {
  orderId: number
  toStatus: string
  comment?: string
}

export interface TransitionOrderResponse {
  statusId?: number
  statusCode: string
  statusName?: string | null
}
