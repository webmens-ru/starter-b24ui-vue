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
  mockGetNetWidths,
  mockGetNetsByWidth,
  mockGetLocks,
  mockGetPensByLock,
  mockGetAdditionalPens,
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

/** Создаёт новый заказ и возвращает orderId. Вызывать один раз при открытии новой формы. */
export async function createOrder(): Promise<{
  orderId: number
  companyId: number | null
  managerId: number
}> {
  if (isMock) return mockCreateOrder()
  const { data } = await api.post('/api/order/create')
  return data.data
}

/** Создаёт запись расчёта в БД при первом открытии новой формы. */
export async function createWicketMainMenu(payload: {
  orderId: number
  modelId: string | number
  model: string
  productType?: string
}): Promise<void> {
  if (isMock) return
  await api.post(`/api/wicket/type${payload.modelId}/main-menu`, {
    orderId: payload.orderId,
    modelId: String(payload.modelId),
    model: payload.model,
    productType: payload.productType ?? 'Калитка',
  })
}

/** Загружает данные расчёта для редактирования (при открытии из Bitrix24 с placementOptions.id). */
export async function loadWicketData(
  modelId: string | number,
  orderId: number,
): Promise<Record<string, unknown>> {
  if (isMock) return mockLoadWicketData(orderId)
  const params: Record<string, string | number> = { orderId }
  if (String(modelId) !== '1') params.modelId = modelId
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
  const body = { ...payload, orderId: payload.orderId ?? payload.orderId }
  await api.post(`/api/wicket/type${payload.modelId}/data`, body)
}

export async function getAssortmentStolb(
  modelId: string | number
): Promise<{ assortmentPipe: SelectItem[] }> {
  if (isMock) return mockGetAssortmentStolb()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-available-assortment-stolb`)
  return data.data
}

export async function getPolozhenieJumper(
  modelId: string | number,
  openingOptionId: number
): Promise<{ availablePolozheniyeJumper: SelectItem[] }> {
  if (isMock) return mockGetPolozhenieJumper()
  const { data } = await api.post(`/api/wicket/type${modelId}/get-available-polozheniye-jumper`, {
    openingOptionId,
  })
  return data.data
}

export async function getAssortmentJumper(
  modelId: string | number
): Promise<{ assortmentJumper: SelectItem[] }> {
  if (isMock) return mockGetAssortmentJumper()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-available-assortment-jumper`)
  return data.data
}

export async function getColorShield(
  modelId: string | number
): Promise<{ colorShield: ColorShieldItem[] }> {
  if (isMock) return mockGetColorShield()
  const { data } = await api.get(`/api/wicket/type${modelId}/get-color-shield`)
  return data.data
}

/** Список доступной ширины сетки (sizeA из справочника dir_net). */
export async function getNetWidths(): Promise<{ netWidths: { id: string; name: string }[] }> {
  if (isMock) return mockGetNetWidths()
  const { data } = await api.get('/api/dict/net/get-available-widths')
  return data.data
}

/** Сетки по ширине (sizeA) — для выбора карточкой. */
export async function getNetsByWidth(sizeA: number | string): Promise<{
  items: Array<{ id: number; model: string; imageUrl: string | null; sizeA: number; sizeB: number; thickness: number; price: number }>
}> {
  if (isMock) return mockGetNetsByWidth(sizeA)
  const { data } = await api.get('/api/dict/net/get-by-width', { params: { sizeA } })
  return data.data
}

/** Список замков с картинками — для выбора карточкой. */
export async function getLocks(): Promise<{
  items: Array<{ id: number; marking: string; imageUrls: string[] }>
}> {
  if (isMock) return mockGetLocks()
  const { data } = await api.get('/api/dict/lock/get-list')
  return data.data
}

/** Ручки, совместимые с выбранным комплектом замка (dir_pen_lock). */
export async function getPensByLock(lockSetId: number): Promise<{
  items: Array<{ id: number; marking: string; colors: string[]; imageUrls?: string[] }>
}> {
  if (isMock) return mockGetPensByLock(lockSetId)
  const { data } = await api.get('/api/dict/pen/get-by-lock', { params: { lockSetId } })
  return data.data
}

/** Список дополнительных ручек (скоб) из dir_additional_pen. */
export async function getAdditionalPens(): Promise<{
  items: Array<{ id: number; marking: string; colors: string[]; imageUrls?: string[] }>
}> {
  if (isMock) return mockGetAdditionalPens()
  const { data } = await api.get('/api/dict/additional-pen/get-list')
  return data.data
}

export async function getAddressSuggestions(
  query: string
): Promise<{ suggestions: { value: string }[] }> {
  if (isMock) return mockGetAddressSuggestions(query)
  const { data } = await api.post('/address/suggest', { query })
  return data
}

/** Переименовать расчёт (обновить calculationName). */
export async function saveOrderData(payload: {
  orderId: number
  calculationName: string
}): Promise<void> {
  if (isMock) return
  await api.post('/api/order/data', payload)
}

export async function saveClientInfo(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return
  await api.post('/client/data', payload)
}

export async function finalCalculate(payload: {
  orderId: number
  modelId: string | number
  productType?: string
  model?: string
}): Promise<{ priceDealer: string; priceRetail: string }> {
  if (isMock) return mockFinalCalculate()
  const { data } = await api.post('/api/wicket/calculation/index', {
    modelId: payload.modelId,
    orderId: payload.orderId,
  })
  return data.data
}

export async function deleteCalculation(payload: {
  orderId: number
  modelId: string | number
}): Promise<void> {
  if (isMock) return mockDeleteCalculation()
  await api.post(`/api/wicket/type${payload.modelId}/delete`, payload)
}

export async function recalculate(payload: {
  orderId: number
  modelId: string | number
  productType?: string
  model?: string
}): Promise<RecalculateResponse> {
  if (isMock) return mockRecalculate(payload)
  const { data } = await api.post('/api/wicket/calculation/index', {
    modelId: payload.modelId,
    orderId: payload.orderId,
  })
  return data.data
}
