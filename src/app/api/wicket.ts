import api from '.'
import {
  mockFetchWicketPage,
  mockSaveWicketData,
  mockRecalculate,
  mockGetFilterOptions,
  mockGetSidingTable,
  mockGetProfnastilTable,
  mockGetAssortmentStolb,
  mockGetPolozhenieJumper,
  mockGetAssortmentJumper,
  mockGetColorShield,
  mockGetAddressSuggestions,
  mockFinalCalculate,
  mockDeleteCalculation,
  mockLoadWicketData,
  mockCreateOrder,
} from './mockWicket'
import type {
  SelectItem,
  ColorShieldItem,
  FilterOptionItem,
  FilterOptions,
  SidingFilters,
  SidingRow,
  SidingPagination,
  SidingTableResponse,
  ProfnastilFilters,
  ProfnastilRow,
  ProfnastilTableResponse,
  RecalculateResponse,
} from './wicket.types'

export type {
  SelectItem,
  ColorShieldItem,
  FilterOptionItem,
  FilterOptions,
  SidingFilters,
  SidingRow,
  SidingPagination,
  SidingTableResponse,
  ProfnastilFilters,
  ProfnastilRow,
  ProfnastilTableResponse,
  RecalculateResponse,
}

const isMock = import.meta.env.VITE_MOCK === 'true'

/** Создаёт новый заказ и возвращает order_id. Вызывать один раз при открытии новой формы. */
export async function createOrder(): Promise<{
  order_id: number
  companyId: number | null
  managerId: number
}> {
  if (isMock) return mockCreateOrder()
  const { data } = await api.post('/api/order/create')
  return data.data
}

/** Создаёт запись расчёта в БД при первом открытии новой формы. */
export async function createWicketMainMenu(payload: {
  order_id: number
  model_id: string | number
  model: string
  productType?: string
}): Promise<void> {
  if (isMock) return
  const body = {
    ...payload,
    modelId: payload.model_id,
    productType: payload.productType ?? 'Калитка',
  }
  await api.post(`/api/wicket/type${payload.model_id}/main-menu`, body)
}

/** Загружает данные расчёта для редактирования (при открытии из Bitrix24 с placementOptions.id). */
export async function loadWicketData(
  modelId: string | number,
  orderId: number,
): Promise<Record<string, unknown>> {
  if (isMock) return mockLoadWicketData(orderId)
  const params: Record<string, string | number> = { order_id: orderId }
  // Для type2 и выше обязателен model_id в query
  if (String(modelId) !== '1') params.model_id = modelId
  const { data } = await api.get(`/api/wicket/type${modelId}/get-data`, { params })
  return data.data
}

export async function getFilterOptions(url: string, type?: string): Promise<FilterOptions> {
  if (isMock) return mockGetFilterOptions(url, type)
  const { data } = await api.post(url, type ? { type } : undefined)
  return data.data
}

export async function getSidingTable(
  modelId: string | number,
  filters: SidingFilters,
  page = 1,
): Promise<SidingTableResponse> {
  if (isMock) return mockGetSidingTable(filters, page)
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-siding`, { ...filters, page })
  return data.data
}

export async function getProfnastilTable(
  modelId: string | number,
  filters: ProfnastilFilters,
  page = 1,
): Promise<Required<ProfnastilTableResponse>> {
  if (isMock) return mockGetProfnastilTable(filters, page)
  const { data } = await api.post(`/api/wicket/type${modelId}/get-filling-profnastil`, { ...filters, page })
  const result: ProfnastilTableResponse = data.data ?? data
  const table = result.table ?? []
  const pagination = result.pagination ?? {
    page:       1,
    pageSize:   table.length,
    totalCount: table.length,
    pageCount:  1,
  }
  return { table, pagination }
}

export async function fetchWicketPage(modelId: number | string, url: string): Promise<string> {
  if (isMock) return mockFetchWicketPage(modelId, url)
  const { data } = await api.post(`/api/wicket/type${modelId}/${url}`)
  return data
}

export async function saveWicketData(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return mockSaveWicketData(payload)
  // order_id обязателен во всех эндпоинтах
  const body = { ...payload, order_id: payload.order_id ?? payload.orderId }
  await api.post(`/api/wicket/type${payload.model_id}/data`, body)
}

export async function getAssortmentStolb(
  modelId: string | number
): Promise<{ arr_assortment_pipe: SelectItem[] }> {
  if (isMock) return mockGetAssortmentStolb()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-available-assortment-stolb`)
  return data.data
}

export async function getPolozhenieJumper(
  modelId: string | number,
  openingOptionId: number
): Promise<{ arr_available_polozheniye_jumper: SelectItem[] }> {
  if (isMock) return mockGetPolozhenieJumper()
  const { data } = await api.post(`/api/wicket/type${modelId}/get-available-polozheniye-jumper`, {
    opening_option_id: openingOptionId,
  })
  return data.data
}

export async function getAssortmentJumper(
  modelId: string | number
): Promise<{ arr_assortment_jumper: SelectItem[] }> {
  if (isMock) return mockGetAssortmentJumper()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-available-assortment-jumper`)
  return data.data
}

export async function getColorShield(
  modelId: string | number
): Promise<{ arr_color_shield: ColorShieldItem[] }> {
  if (isMock) return mockGetColorShield()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-color-shield`)
  return data.data
}

export async function getAddressSuggestions(
  query: string
): Promise<{ suggestions: { value: string }[] }> {
  if (isMock) return mockGetAddressSuggestions(query)
  const { data } = await api.post('/address/suggest', { query })
  return data
}

/** Переименовать расчёт (обновить calculation_name). */
export async function saveOrderData(payload: {
  order_id: number
  calculation_name: string
}): Promise<void> {
  if (isMock) return
  await api.post('/api/order/data', payload)
}

export async function saveClientInfo(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return
  await api.post('/client/data', payload)
}

export async function finalCalculate(payload: {
  order_id: number
  model_id: string | number
  product_type?: string
  model?: string
}): Promise<{ price_dealer: string; price_retail: string }> {
  if (isMock) return mockFinalCalculate()
  const { data } = await api.post('/api/wicket/calculation/index', {
    model_id:  payload.model_id,
    order_id:  payload.order_id,
  })
  return data.data
}

export async function deleteCalculation(payload: {
  order_id: number
  model_id: string | number
}): Promise<void> {
  if (isMock) return mockDeleteCalculation()
  await api.post(`/api/wicket/type${payload.model_id}/delete`, payload)
}

export async function recalculate(payload: {
  order_id: number
  model_id: string | number
  product_type?: string
  model?: string
}): Promise<RecalculateResponse> {
  if (isMock) return mockRecalculate(payload)
  const { data } = await api.post('/api/wicket/calculation/index', {
    model_id:  payload.model_id,
    order_id:  payload.order_id,
  })
  return data.data
}
