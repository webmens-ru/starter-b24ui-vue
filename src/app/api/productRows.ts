import api from '.'
import type {
  CopyProductRowPayload,
  CalculateProductRowPayload,
  CreateProductRowPayload,
  CreateMaterialProductRowPayload,
  CreateInstallationProductRowPayload,
  DeleteProductRowPayload,
  ProductRowListResponse,
  ProductRowCalculationResponse,
  ProductRowCollectionMutationResponse,
  ProductRowMutationResponse,
  ReorderProductRowsPayload,
  TransitionProductRowPayload,
  TransitionOrderPayload,
  TransitionOrderResponse,
  UpdateProductRowPayload,
} from './productRows.types'

export type {
  CopyProductRowPayload,
  CalculateProductRowPayload,
  CreateProductRowPayload,
  CreateMaterialProductRowPayload,
  CreateInstallationProductRowPayload,
  DeleteProductRowPayload,
  ProductRowAllowedAction,
  ProductRowContext,
  ProductRowInstallationRole,
  ProductRowCalculationResponse,
  ProductRowCollectionMutationResponse,
  ProductRowListResponse,
  ProductRowMutationResponse,
  ProductRowStatus,
  ProductRowSummary,
  OrderTotals,
  ReorderProductRowsPayload,
  TransitionProductRowPayload,
  TransitionOrderPayload,
  TransitionOrderResponse,
  UpdateProductRowPayload,
} from './productRows.types'

export async function listProductRows(orderId: number): Promise<ProductRowListResponse> {
  const { data } = await api.get('/api/product-row/index', { params: { orderId } })
  return data.data
}

export async function createProductRow(payload: CreateProductRowPayload): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/create', payload)
  return data.data
}

export async function createMaterialProductRow(
  payload: CreateMaterialProductRowPayload,
): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/create-material', payload)
  return data.data
}

export async function createInstallationProductRow(
  payload: CreateInstallationProductRowPayload,
): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/create-installation', payload)
  return data.data
}

export async function updateProductRow(payload: UpdateProductRowPayload): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/update', payload)
  return data.data
}

export async function copyProductRow(payload: CopyProductRowPayload): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/copy', payload)
  return data.data
}

export async function reorderProductRows(payload: ReorderProductRowsPayload): Promise<ProductRowCollectionMutationResponse> {
  const { data } = await api.post('/api/product-row/reorder', payload)
  return data.data
}

export async function deleteProductRow(payload: DeleteProductRowPayload): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/delete', payload)
  return data.data
}

export async function transitionProductRow(payload: TransitionProductRowPayload): Promise<ProductRowMutationResponse> {
  const { data } = await api.post('/api/product-row/transition', payload)
  return data.data
}

export async function calculateProductRow(payload: CalculateProductRowPayload): Promise<ProductRowCalculationResponse> {
  const { data } = await api.post('/api/order/calculate', payload)
  return data.data
}

export async function transitionOrder(payload: TransitionOrderPayload): Promise<TransitionOrderResponse> {
  const { data } = await api.post('/api/order/transition', payload)
  return data.data
}
