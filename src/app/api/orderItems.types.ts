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
  adjustmentType: 'none' | 'discount' | 'markup'
  adjustmentValue: number
  adjustmentUnit: 'percent' | 'fixed'
  plannedCompletionAt: string | null
  lastCalculatedAt: number | null
  isActual: boolean
  calculationError: string | null
  lockVersion: number
  allowedActions: OrderItemAllowedAction[]
}

export interface OrderTotals {
  priceRetail: number | null
  priceDealer: number | null
}

export interface OrderItemListResponse {
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
  adjustmentType?: OrderItemSummary['adjustmentType']
  adjustmentValue?: number
  adjustmentUnit?: OrderItemSummary['adjustmentUnit']
  plannedCompletionAt?: string | null
}

export interface CopyOrderItemPayload {
  orderId: number
  orderItemId: number
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
