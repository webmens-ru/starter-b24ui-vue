import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = { get: vi.fn(), post: vi.fn() }
vi.mock('.', () => ({ default: api }))

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

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

  it('loads lock sets scoped to the wicket model without their composition', async () => {
    const response = {
      items: [{ id: 7, marking: 'Set 7', imageUrls: [] }],
    }
    api.get.mockResolvedValueOnce({ data: { data: response } })
    const { getLocks } = await import('./wicket')

    await expect(getLocks(2)).resolves.toEqual(response)
    expect(api.get).toHaveBeenCalledWith('/api/dict/lock/get-list', { params: { modelId: 2 } })
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

  it('serializes concurrent complete composition saves without silently changing their expected versions', async () => {
    let resolveFirst!: (value: unknown) => void
    const firstResponse = new Promise(resolve => { resolveFirst = resolve })
    api.post
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({ data: { data: { lockVersion: 5 } } })
    api.get.mockResolvedValueOnce({ data: { data: { lockVersion: 3 } } })
    const { getWicketAccessoryComposition, saveWicketAccessoryComposition } = await import('./wicket')
    const payload = {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
    }

    await getWicketAccessoryComposition(payload)
    const first = saveWicketAccessoryComposition(payload)
    const second = saveWicketAccessoryComposition(payload)
    await Promise.resolve()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/wicket/accessory-composition', payload)

    resolveFirst({ data: { data: { lockVersion: 4 } } })
    await expect(first).resolves.toEqual({ lockVersion: 4 })
    await expect(second).resolves.toEqual({ lockVersion: 5 })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/accessory-composition', payload)

    api.post.mockResolvedValueOnce({ data: { data: { lockVersion: 6 } } })
    await saveWicketAccessoryComposition(payload)
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/wicket/accessory-composition', payload)
  })

  it('retries independently delayed reads and never upgrades the coherent desired-state version on save', async () => {
    const staleRoot = { orderId: 42, productRowId: 7, modelId: '1', lockVersion: 3, width: 900 }
    const currentRoot = { ...staleRoot, lockVersion: 4, width: 1000 }
    const currentComposition = {
      lockVersion: 4,
      lockComponents: [productRow],
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: 125, priceDealer: 125 },
    }
    const staleRootResponse = deferred<{ data: { data: typeof staleRoot } }>()
    const firstCompositionResponse = deferred<{ data: { data: typeof currentComposition } }>()
    const currentRootResponse = deferred<{ data: { data: typeof currentRoot } }>()
    const secondCompositionResponse = deferred<{ data: { data: typeof currentComposition } }>()
    api.get
      .mockReturnValueOnce(staleRootResponse.promise)
      .mockReturnValueOnce(firstCompositionResponse.promise)
      .mockReturnValueOnce(currentRootResponse.promise)
      .mockReturnValueOnce(secondCompositionResponse.promise)

    const {
      loadCoherentWicketState,
      loadWicketData,
      saveWicketAccessoryComposition,
    } = await import('./wicket')
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    const coherentLoad = loadCoherentWicketState(context)

    expect(api.get).toHaveBeenCalledTimes(2)
    firstCompositionResponse.resolve({ data: { data: currentComposition } })
    await Promise.resolve()
    expect(api.get).toHaveBeenCalledTimes(2)
    staleRootResponse.resolve({ data: { data: staleRoot } })
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(4))

    currentRootResponse.resolve({ data: { data: currentRoot } })
    await Promise.resolve()
    secondCompositionResponse.resolve({ data: { data: currentComposition } })

    await expect(coherentLoad).resolves.toEqual({
      wicketData: currentRoot,
      accessoryComposition: currentComposition,
    })
    expect(api.get).toHaveBeenCalledTimes(4)

    api.get.mockResolvedValueOnce({ data: { data: { ...currentRoot, lockVersion: 5 } } })
    await loadWicketData(context)

    const conflict = { response: { status: 409 } }
    api.post.mockRejectedValueOnce(conflict)
    const desiredState = {
      orderId: 42,
      productRowId: 7,
      lockVersion: currentComposition.lockVersion,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
    }
    await expect(saveWicketAccessoryComposition(desiredState)).rejects.toBe(conflict)
    expect(api.post).toHaveBeenCalledWith('/api/wicket/accessory-composition', desiredState)
  })

  it('keeps a 409 conflict latched until an authoritative load supplies a newer version', async () => {
    const conflict = { response: { status: 409 } }
    const payload = {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
    }
    api.get
      .mockResolvedValueOnce({ data: { data: { lockVersion: 3 } } })
      .mockResolvedValueOnce({ data: { data: { lockVersion: 4 } } })
    api.post
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({ data: { data: { lockVersion: 5 } } })
    const {
      getWicketAccessoryComposition,
      onWicketProductRowLockConflict,
      saveWicketAccessoryComposition,
    } = await import('./wicket')
    const listener = vi.fn()
    const unsubscribe = onWicketProductRowLockConflict(listener)

    await getWicketAccessoryComposition(payload)
    await expect(saveWicketAccessoryComposition(payload)).rejects.toBe(conflict)
    await expect(saveWicketAccessoryComposition(payload)).rejects.toThrow(
      'Конфликт версии позиции',
    )
    await expect(saveWicketAccessoryComposition({ ...payload, lockVersion: 99 })).rejects.toThrow(
      'Конфликт версии позиции',
    )
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)

    await getWicketAccessoryComposition(payload)
    await expect(saveWicketAccessoryComposition({ ...payload, lockVersion: 4 })).resolves.toEqual({ lockVersion: 5 })
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/accessory-composition', {
      ...payload,
      lockVersion: 4,
    })
    unsubscribe()
  })
})
