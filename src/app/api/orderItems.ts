import api from '.'
import type {
  CopyOrderItemPayload,
  CreateOrderItemPayload,
  DeleteOrderItemPayload,
  OrderItemListResponse,
  OrderItemMutationResponse,
  ReorderOrderItemsPayload,
  TransitionOrderItemPayload,
  UpdateOrderItemPayload,
} from './orderItems.types'

export type {
  CopyOrderItemPayload,
  CreateOrderItemPayload,
  DeleteOrderItemPayload,
  OrderItemAllowedAction,
  OrderItemContext,
  OrderItemListResponse,
  OrderItemMutationResponse,
  OrderItemStatus,
  OrderItemSummary,
  OrderTotals,
  ReorderOrderItemsPayload,
  TransitionOrderItemPayload,
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

export async function reorderOrderItems(payload: ReorderOrderItemsPayload): Promise<OrderItemListResponse> {
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
