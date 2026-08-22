import api from '.'
import type {
  CopyOrderItemPayload,
  CalculateOrderItemPayload,
  CreateOrderItemPayload,
  DeleteOrderItemPayload,
  OrderItemListResponse,
  OrderItemCalculationResponse,
  OrderItemCollectionMutationResponse,
  OrderItemMutationResponse,
  ReorderOrderItemsPayload,
  TransitionOrderItemPayload,
  TransitionOrderPayload,
  TransitionOrderResponse,
  UpdateOrderItemPayload,
} from './orderItems.types'

export type {
  CopyOrderItemPayload,
  CalculateOrderItemPayload,
  CreateOrderItemPayload,
  DeleteOrderItemPayload,
  OrderItemAllowedAction,
  OrderItemContext,
  OrderItemCalculationResponse,
  OrderItemCollectionMutationResponse,
  OrderItemListResponse,
  OrderItemMutationResponse,
  OrderItemStatus,
  OrderItemSummary,
  OrderTotals,
  ReorderOrderItemsPayload,
  TransitionOrderItemPayload,
  TransitionOrderPayload,
  TransitionOrderResponse,
  UpdateOrderItemPayload,
} from './orderItems.types'

export async function listOrderItems(orderId: number): Promise<OrderItemListResponse> {
  const { data } = await api.get('/api/order-item/index', { params: { orderId } })
  return data.data
}

export async function createOrderItem(payload: CreateOrderItemPayload): Promise<OrderItemMutationResponse> {
  const { data } = await api.post('/api/order-item/create', payload)
  return data.data
}

export async function updateOrderItem(payload: UpdateOrderItemPayload): Promise<OrderItemMutationResponse> {
  const { data } = await api.post('/api/order-item/update', payload)
  return data.data
}

export async function copyOrderItem(payload: CopyOrderItemPayload): Promise<OrderItemMutationResponse> {
  const { data } = await api.post('/api/order-item/copy', payload)
  return data.data
}

export async function reorderOrderItems(payload: ReorderOrderItemsPayload): Promise<OrderItemCollectionMutationResponse> {
  const { data } = await api.post('/api/order-item/reorder', payload)
  return data.data
}

export async function deleteOrderItem(payload: DeleteOrderItemPayload): Promise<OrderItemMutationResponse> {
  const { data } = await api.post('/api/order-item/delete', payload)
  return data.data
}

export async function transitionOrderItem(payload: TransitionOrderItemPayload): Promise<OrderItemMutationResponse> {
  const { data } = await api.post('/api/order-item/transition', payload)
  return data.data
}

export async function calculateOrderItem(payload: CalculateOrderItemPayload): Promise<OrderItemCalculationResponse> {
  const { data } = await api.post('/api/order/calculate', payload)
  return data.data
}

export async function transitionOrder(payload: TransitionOrderPayload): Promise<TransitionOrderResponse> {
  const { data } = await api.post('/api/order/transition', payload)
  return data.data
}
