import api from '.'
import {
  mockFetchWicketPage,
  mockSaveWicketData,
  mockRecalculate,
  mockGetFilterOptions,
  mockGetSidingTable,
  mockGetAssortmentStolb,
  mockGetPolozhenieJumper,
  mockGetAssortmentJumper,
  mockGetColorShield,
} from './mockWicket'
import type {
  SelectItem,
  FilterOptionItem,
  FilterOptions,
  SidingFilters,
  SidingRow,
  RecalculateResponse,
} from './wicket.types'

export type {
  SelectItem,
  FilterOptionItem,
  FilterOptions,
  SidingFilters,
  SidingRow,
  RecalculateResponse,
}

const isMock = import.meta.env.VITE_MOCK === 'true'

export async function getFilterOptions(url: string): Promise<FilterOptions> {
  if (isMock) return mockGetFilterOptions(url)
  const { data } = await api.post(url)
  return data
}

export async function getSidingTable(
  modelId: string | number,
  filters: SidingFilters
): Promise<{ table: SidingRow[] }> {
  if (isMock) return mockGetSidingTable(filters)
  const { data } = await api.post(`/wicket/type${modelId}/get-filling-siding`, filters)
  return data
}

export async function fetchWicketPage(modelId: number | string, url: string): Promise<string> {
  if (isMock) return mockFetchWicketPage(modelId, url)
  const { data } = await api.post(`/wicket/type${modelId}/${url}`)
  return data
}

export async function saveWicketData(payload: Record<string, unknown>): Promise<void> {
  if (isMock) return mockSaveWicketData(payload)
  await api.post(`/wicket/type${payload.model_id}/data`, payload)
}

export async function getAssortmentStolb(
  modelId: string | number
): Promise<{ arr_assortment_pipe: SelectItem[] }> {
  if (isMock) return mockGetAssortmentStolb()
  const { data } = await api.get(`/wicket/type${modelId}/get-available-assortment-stolb`)
  return data
}

export async function getPolozhenieJumper(
  modelId: string | number,
  openingOptionId: number
): Promise<{ arr_available_polozheniye_jumper: SelectItem[] }> {
  if (isMock) return mockGetPolozhenieJumper()
  const { data } = await api.post(`/wicket/type${modelId}/get-available-polozheniye-jumper`, {
    opening_option_id: openingOptionId,
  })
  return data
}

export async function getAssortmentJumper(
  modelId: string | number
): Promise<{ arr_assortment_jumper: SelectItem[] }> {
  if (isMock) return mockGetAssortmentJumper()
  const { data } = await api.post(`/wicket/type${modelId}/get-available-assortment-jumper`)
  return data
}

export async function getColorShield(
  modelId: string | number
): Promise<{ arr_color_shield: SelectItem[] }> {
  if (isMock) return mockGetColorShield()
  const { data } = await api.get(`/wicket/type${modelId}/get-color-shield`)
  return data
}

export async function recalculate(payload: {
  calculation_number: string | number
  product_type: string
  model: string
  model_id: string | number
}): Promise<RecalculateResponse> {
  if (isMock) return mockRecalculate(payload)
  const { data } = await api.post('/wicket/calculation', payload)
  return data
}
