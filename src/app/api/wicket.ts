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
} from './mockWicket'
import type {
  SelectItem,
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
  await api.post(`/api/wicket/type${payload.model_id}/data`, payload)
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
): Promise<{ arr_color_shield: SelectItem[] }> {
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

export async function saveCalculationNumber(payload: {
  calculation_number: string | number
  calculation_name: string
}): Promise<void> {
  if (isMock) return
  await api.post('/api/calculation-number/data', payload)
}

export async function saveClientInfo(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return
  await api.post('/client/data', payload)
}

export async function finalCalculate(payload: {
  calculation_number: string | number
  model_id: string | number
  product_type?: string
  model?: string
}): Promise<{ price_dealer: string; price_retail: string }> {
  if (isMock) return mockFinalCalculate()
  const { data } = await api.post('/api/wicket/calculation/index', {
    model_id:           payload.model_id,
    calculation_number: payload.calculation_number,
  })
  return data.data
}

export async function deleteCalculation(payload: {
  calculation_number: string | number
  model_id: string | number
}): Promise<void> {
  if (isMock) return mockDeleteCalculation()
  await api.post(`/api/wicket/type${payload.model_id}/delete`, payload)
}

export async function recalculate(payload: {
  calculation_number: string | number
  model_id: string | number
  product_type?: string
  model?: string
}): Promise<RecalculateResponse> {
  if (isMock) return mockRecalculate(payload)
  const { data } = await api.post('/api/wicket/calculation/index', {
    model_id:           payload.model_id,
    calculation_number: payload.calculation_number,
  })
  return data.data
}
