import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = { get: vi.fn(), post: vi.fn() }
vi.mock('.', () => ({ default: api }))

const productRow = {
  id: 11,
  orderId: 42,
  productType: 'material',
  modelId: null,
  parentProductRowId: 7,
  materialItemId: 11,
  rowKind: 'material' as const,
  relationRole: 'lock_component' as const,
  name: 'Замок',
  article: 'LOCK-1',
  unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
  quantity: 1,
  sortOrder: 20,
  status: { id: 1, code: 'draft', name: 'Черновик', color: '#777' },
  baseRetailUnitPrice: 125,
  baseDealerUnitPrice: 125,
  finalRetailUnitPrice: 125,
  finalDealerUnitPrice: 125,
  retailTotalPrice: 125,
  dealerTotalPrice: 125,
  adjustmentType: 'none' as const,
  adjustmentValue: 0,
  adjustmentUnit: 'percent' as const,
  plannedCompletionAt: null,
  lastCalculatedAt: 1,
  isActual: true,
  calculationError: null,
  lockVersion: 1,
  allowedActions: [],
  availableTransitions: [],
}

describe('wicket accessory composition API', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    vi.resetModules()
  })

  it('loads the canonical composition from the exact endpoint', async () => {
    const response = {
      lockVersion: 3,
      lockComponents: [productRow],
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
    const response = {
      lockVersion: 4,
      lockComponents: [productRow],
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: 125, priceDealer: 125 },
    }
    api.post.mockResolvedValueOnce({ data: { data: response } })
    const { saveWicketAccessoryComposition } = await import('./wicket')

    await expect(saveWicketAccessoryComposition(payload)).resolves.toEqual(response)
    expect(api.post).toHaveBeenCalledWith('/api/wicket/accessory-composition', payload)
  })

  it('serializes concurrent composition saves and advances the version for the next save', async () => {
    let resolveFirst!: (value: unknown) => void
    const firstResponse = new Promise(resolve => { resolveFirst = resolve })
    api.post
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({ data: { data: { lockVersion: 5 } } })
    const { saveWicketAccessoryComposition } = await import('./wicket')
    const payload = {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
    }

    const first = saveWicketAccessoryComposition(payload)
    const second = saveWicketAccessoryComposition(payload)
    await Promise.resolve()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/wicket/accessory-composition', payload)

    resolveFirst({ data: { data: { lockVersion: 4 } } })
    await expect(first).resolves.toEqual({ lockVersion: 4 })
    await expect(second).resolves.toEqual({ lockVersion: 5 })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/accessory-composition', {
      ...payload,
      lockVersion: 4,
    })

    api.post.mockResolvedValueOnce({ data: { data: { lockVersion: 6 } } })
    await saveWicketAccessoryComposition(payload)
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/wicket/accessory-composition', {
      ...payload,
      lockVersion: 5,
    })
  })
})
