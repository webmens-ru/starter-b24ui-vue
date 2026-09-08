import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = { get: vi.fn(), post: vi.fn() }
vi.mock('.', () => ({ default: api }))

describe('wicket accessory composition API', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    vi.resetModules()
  })

  it('loads the canonical composition from the exact endpoint', async () => {
    const response = {
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: null, priceDealer: null },
    }
    api.get.mockResolvedValueOnce({ data: { data: response } })
    const { getWicketAccessoryComposition } = await import('./wicket')

    await expect(getWicketAccessoryComposition({ orderId: 42, productRowId: 7 })).resolves.toEqual(response)
    expect(api.get).toHaveBeenCalledWith('/api/wicket/accessory-composition', {
      params: { orderId: 42, productRowId: 7 },
    })
  })

  it('saves the complete composition with its lock version', async () => {
    const payload = {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
      lockComponents: [{
        role: 'lock_component' as const,
        materialItemId: 11,
        providedByManufacturer: true,
        installedByManufacturer: false,
      }],
      skud: [],
      doorClosers: [],
      bumpers: [],
    }
    const response = { ...payload, lockVersion: 4, orderTotals: { priceRetail: 125, priceDealer: 125 } }
    api.post.mockResolvedValueOnce({ data: { data: response } })
    const { saveWicketAccessoryComposition } = await import('./wicket')

    await expect(saveWicketAccessoryComposition(payload)).resolves.toEqual(response)
    expect(api.post).toHaveBeenCalledWith('/api/wicket/accessory-composition', payload)
  })
})
