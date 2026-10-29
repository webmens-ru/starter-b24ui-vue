import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = { get: vi.fn(), post: vi.fn() }
vi.mock('.', () => ({ default: api }))

describe('pipe option response boundary', () => {
  it.each([
    ['getAssortmentStolb', 'assortmentPipe', 'get-available-assortment-stolb'],
    ['getAssortmentJumper', 'assortmentJumper', 'get-available-assortment-jumper'],
  ] as const)('validates numeric metadata for %s', async (method, key, route) => {
    const wicket = await import('./wicket')
    api.get.mockResolvedValue({ data: { data: { [key]: [
      { id: 707, name: '60/40/2', profile: { sizeA: '60', sizeB: 40 }, profileProblem: null },
    ] } } })
    const response = await wicket[method]('1')
    expect(api.get).toHaveBeenLastCalledWith(`/api/wicket/type1/${route}`)
    expect(Object.values(response)[0][0]).toMatchObject({ profile: null, profileProblem: { code: 'invalid' }, disabled: true })
  })
})

describe('material directory relation requests', () => {
  it.each(['siding', 'profnastil', 'coatings'] as const)('normalizes filling profile metadata on %s without dropping material rows', async route => {
    const wicket = await import('./wicket')
    const raw = [
      { id: 725, name: 'Одинаковая подпись', drawingProfile: { kind: 'mp10' }, drawingProfileProblem: null },
      { id: 819, name: 'Одинаковая подпись', drawingProfile: { kind: 'unknown' }, drawingProfileProblem: null },
    ]
    api.post.mockResolvedValue({ data: { data: route === 'coatings'
      ? { profiles: [], coatings: raw, manufacturers: [], colors: [] }
      : { table: raw, pagination: { page: 1, pageSize: 100, totalCount: 2, pageCount: 1 } } } })
    const rows = route === 'siding'
      ? (await wicket.getSidingTable('1', { materials: [], form: [], typeOfCoating: [] })).table
      : route === 'profnastil' ? (await wicket.getProfnastilTable('1', { materials: [], typeOfCoating: [] })).table
        : (await wicket.getType2ProfnastilFormOptions(31)).coatings
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: 725, drawingProfile: { kind: 'mp10' }, drawingProfileProblem: null })
    expect(rows[1]).toMatchObject({ id: 819, drawingProfile: null, drawingProfileProblem: { code: 'invalid' } })
    expect(raw[1].drawingProfile).toEqual({ kind: 'unknown' })
  })

  it('sends numeric foreign keys separately from labels', async () => {
    const wicket = await import('./wicket')
    api.post.mockResolvedValue({ data: { data: { table: [], pagination: { page: 1, pageSize: 100, totalCount: 0, pageCount: 1 } } } })
    await wicket.getSidingTable('2', { materials: ['Текстовый поиск'], form: ['901'], typeOfCoating: ['707'] })
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/type2/get-filling-siding', { materials: ['Текстовый поиск'], sidingFormIds: [901], typeOfCoatingIds: [707], page: 1 })
    await wicket.getProfnastilTable('2', { materials: ['602'], typeOfCoating: ['707'] })
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/type2/get-filling-profnastil', { profileTypeIds: [602], typeOfCoatingIds: [707], page: 1 })
  })

  it('rejects display names rather than converting them into numeric identifiers', async () => {
    const wicket = await import('./wicket')
    await expect(wicket.getProfnastilTable('2', { materials: ['Профиль'], typeOfCoating: [] })).rejects.toThrow('ID')
  })

  it('sends coating references for fence and zhalyuzi without sending labels', async () => {
    const wicket = await import('./wicket')
    api.post.mockResolvedValue({ data: { data: { table: [] } } })
    await wicket.getFenceTable('3', { companies: [], materials: [], widthFence: [], colors: [], typeOfCoating: ['707'] })
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/type3/get-filling-fence', {
      companies: [], materials: [], widthFence: [], colors: [], typeOfCoatingIds: [707], page: 1,
    })
    await wicket.getZhalyuziTable('6', { companies: [], materials: [], thickness: [], colors: [], typeOfCoating: ['808'] })
    expect(api.post).toHaveBeenLastCalledWith('/api/wicket/type6/get-filling-zhalyuzi', {
      companies: [], materials: [], thickness: [], colors: [], typeOfCoatingIds: [808], page: 1,
    })
  })

  it('rejects coating labels at the fence and zhalyuzi request boundary', async () => {
    const wicket = await import('./wicket')
    await expect(wicket.getFenceTable('3', { companies: [], materials: [], widthFence: [], colors: [], typeOfCoating: ['Название'] })).rejects.toThrow('ID')
    await expect(wicket.getZhalyuziTable('6', { companies: [], materials: [], thickness: [], colors: [], typeOfCoating: ['Название'] })).rejects.toThrow('ID')
  })
})

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

  it('loads filling appearance options for the selected material group', async () => {
    const response = {
      manufacturers: [{ id: 3, name: 'Металл Профиль' }],
      colors: [{ id: 8, name: 'RAL 8017', hex: '#442F29', image: null }],
    }
    api.post.mockResolvedValueOnce({ data: { data: response } })
    const { getFillingAppearanceOptions } = await import('./wicket')

    await expect(getFillingAppearanceOptions(1, 'siding')).resolves.toEqual(response)
    expect(api.post).toHaveBeenCalledWith(
      '/api/wicket/type1/get-filling-appearance-options',
      { materialGroupCode: 'siding' },
    )
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

  it('loads universal handles through the explicit material catalog contract', async () => {
    const response = { items: [{ materialItemId: 107, marking: 'Handle', canUseFrameColor: true, colors: [] }] }
    api.get.mockResolvedValueOnce({ data: { data: response } })
    const { getAdditionalPens } = await import('./wicket')
    expect(await getAdditionalPens(2, 'welding')).toEqual(response)
    expect(api.get).toHaveBeenLastCalledWith('/api/dict/additional-pen/get-material-list', { params: { modelId: 2, mountingType: 'welding' } })
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

it('loads shared cover-strip definitions from the real GET endpoint', async () => {
  const { getCoverStrips } = await import('./wicket')
  const item = { materialItemId: 10, name: 'Renamed', article: '', price: 5, attributes: {}, orderParameters: [{ attributeId: 9, code: 'color', dataType: 'color', name: 'Renamed attribute', required: true, values: [{ id: 7, label: 'Renamed color' }] }] }
  api.get.mockResolvedValue({ data: { data: { items: [item] } } })
  expect(await getCoverStrips()).toEqual({ items: [item] })
  expect(api.get).toHaveBeenLastCalledWith('/api/dict/cover-strip/get-list')
})
