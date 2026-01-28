import api from './index'

export type DealCache = Record<string, unknown>

export async function fetchDealCacheById(id?: number | string): Promise<DealCache | null> {
  if (id === undefined || id === null || id === '') return null

  try {
    const response = await api.get('/api/deal/get-cache-by-id', { params: { id } })
    return (response?.data ?? null) as DealCache | null
  } catch (error) {
    console.warn('[fetch deal cache error]', error)
    return null
  }
}
