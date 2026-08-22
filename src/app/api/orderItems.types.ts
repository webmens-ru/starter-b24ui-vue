export type OrderItemAllowedAction =
  | 'order_item.edit_configuration'
  | 'order_item.change_quantity'
  | 'order_item.change_terms'
  | 'order_item.change_deadline'
  | 'order_item.calculate'
  | 'order_item.delete'
  | 'order_item.copy'
  | 'order_item.transition'
  | 'order_item.reorder'

export interface OrderItemStatus {
  id: number
  code: string | null
  name: string | null
  color: string | null
}

export interface OrderItemContext {
  orderId: number
  orderItemId: number
  modelId: string
}

export interface OrderItemSummary {
  id: number
  orderId: number
  productType: string
  modelId: string
  quantity: number
  sortOrder: number
  status: OrderItemStatus
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
  allowedActions: OrderItemAllowedAction[]
  availableTransitions: string[]
}

export interface OrderTotals {
  priceRetail: number | null
  priceDealer: number | null
}

export interface OrderItemListResponse {
  items: OrderItemSummary[]
  orderTotals: OrderTotals
  orderWorkflow: {
    statusCode: string
    availableTransitions: string[]
    canCreateItem: boolean
  }
}

export interface OrderItemCollectionMutationResponse {
  items: OrderItemSummary[]
  orderTotals: OrderTotals
}

export interface OrderItemMutationResponse {
  item: OrderItemSummary
  orderTotals: OrderTotals
}

export interface CreateOrderItemPayload {
  orderId: number
  productType: string
  modelId: string
  model: string
}

export interface UpdateOrderItemPayload {
  orderId: number
  orderItemId: number
  lockVersion: number
  quantity?: number
  adjustmentType?: Exclude<OrderItemSummary['adjustmentType'], null>
  adjustmentValue?: number
  adjustmentUnit?: Exclude<OrderItemSummary['adjustmentUnit'], null>
  plannedCompletionAt?: string | null
}

export interface CopyOrderItemPayload {
  orderId: number
  orderItemId: number
  lockVersion: number
}

export interface ReorderOrderItemsPayload {
  orderId: number
  itemIds: number[]
}

export interface DeleteOrderItemPayload {
  orderId: number
  orderItemId: number
  lockVersion: number
}

export interface TransitionOrderItemPayload {
  orderId: number
  orderItemId: number
  toStatus: string
  lockVersion: number
}

export interface CalculateOrderItemPayload {
  orderId: number
  orderItemId: number
  modelId: string
  lockVersion: number
}

export interface OrderItemCalculationResponse {
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
