import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = {
  get: vi.fn(),
  post: vi.fn(),
}

vi.mock('.', () => ({ default: api }))

const item = {
  id: 7,
  orderId: 42,
  productType: 'wicket',
  modelId: '1',
  quantity: 1,
  sortOrder: 10,
  status: { id: 1, code: 'draft', name: 'Черновик', color: '#999999' },
  baseRetailUnitPrice: 1000,
  baseDealerUnitPrice: 800,
  finalRetailUnitPrice: 1000,
  finalDealerUnitPrice: 800,
  retailTotalPrice: 1000,
  dealerTotalPrice: 800,
  adjustmentType: 'none' as const,
  adjustmentValue: 0,
  adjustmentUnit: 'percent' as const,
  plannedCompletionAt: null,
  lastCalculatedAt: null,
  isActual: false,
  calculationError: null,
  lockVersion: 1,
  allowedActions: ['product_row.edit_configuration'] as const,
  availableTransitions: [] as string[],
}

describe('product row API', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    vi.resetModules()
  })

  it('requests an order item list in its order context', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { productRows: [item], orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { listProductRows } = await import('./productRows')

    await expect(listProductRows(42)).resolves.toEqual({
      productRows: [item],
      orderTotals: { priceRetail: 1000, priceDealer: 800 },
    })
    expect(api.get).toHaveBeenCalledWith('/api/product-row/index', { params: { orderId: 42 } })
  })

  it('synchronizes the wicket lock version across load, save, and recalculation', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    api.get.mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post
      .mockResolvedValueOnce({ data: { data: { lockVersion: 5 } } })
      .mockResolvedValueOnce({ data: { data: { priceRetail: '1000.00', priceDealer: '800.00', lockVersion: 6 } } })

    const { loadWicketData, recalculate, saveWicketData } = await import('./wicket')

    await loadWicketData(context)
    await saveWicketData({ ...context, widthProyema: 900 })
    await recalculate(context)

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/wicket/type1/data', {
      ...context,
      widthProyema: 900,
      lockVersion: 4,
    })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/order/calculate', {
      ...context,
      companyId: undefined,
      lockVersion: 5,
    })
  })

  it('serializes same-item mutations and uses the version advanced by the first response', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    let resolveSave!: (value: { data: { data: { lockVersion: number } } }) => void
    const saveResponse = new Promise<{ data: { data: { lockVersion: number } } }>(resolve => {
      resolveSave = resolve
    })
    api.get.mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post
      .mockReturnValueOnce(saveResponse)
      .mockResolvedValueOnce({ data: { data: { priceRetail: '1000.00', priceDealer: '800.00', lockVersion: 6 } } })

    const { loadWicketData, recalculate, saveWicketData } = await import('./wicket')

    await loadWicketData(context)
    const saving = saveWicketData({ ...context, widthProyema: 900 })
    const calculating = recalculate(context)

    await vi.waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    resolveSave({ data: { data: { lockVersion: 5 } } })
    await saving
    await calculating

    expect(api.post).toHaveBeenNthCalledWith(2, '/api/order/calculate', {
      ...context,
      companyId: undefined,
      lockVersion: 5,
    })
  })

  it('signals a 409 conflict once and does not retry or start another mutation', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    const conflict = { response: { status: 409 } }
    api.get.mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post.mockRejectedValueOnce(conflict)

    const {
      loadWicketData,
      onWicketProductRowLockConflict,
      recalculate,
      saveWicketData,
    } = await import('./wicket')
    const visibleConflict = vi.fn()
    const unsubscribe = onWicketProductRowLockConflict(visibleConflict)

    await loadWicketData(context)
    await expect(saveWicketData({ ...context, widthProyema: 900 })).rejects.toBe(conflict)
    await expect(recalculate(context)).rejects.toThrow('Конфликт версии позиции')

    expect(api.post).toHaveBeenCalledTimes(1)
    expect(visibleConflict).toHaveBeenCalledTimes(1)
    expect(visibleConflict).toHaveBeenCalledWith(context)
    unsubscribe()
  })

  it('signals a 409 conflict when deleting through the serialized wicket API', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    const conflict = { response: { status: 409 } }
    api.get.mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post.mockRejectedValueOnce(conflict)

    const { deleteCalculation, loadWicketData, onWicketProductRowLockConflict } = await import('./wicket')
    const visibleConflict = vi.fn()
    const unsubscribe = onWicketProductRowLockConflict(visibleConflict)

    await loadWicketData(context)
    await expect(deleteCalculation(context)).rejects.toBe(conflict)

    expect(api.post).toHaveBeenCalledWith('/api/wicket/type1/delete', { ...context, lockVersion: 4 })
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(visibleConflict).toHaveBeenCalledTimes(1)
    expect(visibleConflict).toHaveBeenCalledWith(context)
    unsubscribe()
  })

  it('rejects a wicket save for a never-loaded item before sending a request', async () => {
    const { saveWicketData } = await import('./wicket')

    await expect(saveWicketData({ orderId: 42, productRowId: 8, modelId: '1', widthProyema: 900 }))
      .rejects.toThrow('Версия позиции не загружена')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('rejects malformed mutation versions without replacing the remembered version', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    api.get.mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post
      .mockResolvedValueOnce({ data: { data: { lockVersion: null } } })
      .mockResolvedValueOnce({ data: { data: { lockVersion: 5 } } })

    const { loadWicketData, saveWicketData } = await import('./wicket')

    await loadWicketData(context)
    await expect(saveWicketData({ ...context, widthProyema: 900 }))
      .rejects.toThrow('Некорректная версия позиции')
    await saveWicketData({ ...context, widthProyema: 1000 })

    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/type1/data', {
      ...context,
      widthProyema: 1000,
      lockVersion: 4,
    })
  })

  it('rejects wicket saves without an item context before sending a request', async () => {
    const { saveWicketData } = await import('./wicket')

    await expect(saveWicketData({ orderId: 42, modelId: '1' } as never))
      .rejects.toThrow('Не указан корректный productRowId текущей позиции.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends item context for terminal price and delete operations', async () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }
    api.get
      .mockResolvedValueOnce({ data: { data: { hasSavedPrice: false, isActual: false } } })
      .mockResolvedValueOnce({ data: { data: { ...context, lockVersion: 4 } } })
    api.post
      .mockResolvedValueOnce({ data: { data: { priceDealer: '800.00', priceRetail: '1000.00', lockVersion: 5 } } })
      .mockResolvedValueOnce({ data: { data: { lockVersion: 6 } } })

    const { deleteCalculation, fetchSavedOrderPrice, finalCalculate, loadWicketData } = await import('./wicket')

    await fetchSavedOrderPrice(context)
    await loadWicketData(context)
    await finalCalculate(context)
    await deleteCalculation(context)

    expect(api.get).toHaveBeenCalledWith('/api/order/saved-price', { params: context })
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/order/calculate', { ...context, companyId: undefined, lockVersion: 4 })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/type1/delete', { ...context, lockVersion: 5 })
  })

  it('creates an item with the exact creation payload', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: null, priceDealer: null } } } })

    const { createProductRow } = await import('./productRows')

    await createProductRow({ orderId: 42, productType: 'wicket', modelId: '1', model: 'Калитка Тип 1' })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/create', {
      orderId: 42,
      productType: 'wicket',
      modelId: '1',
      model: 'Калитка Тип 1',
    })
  })

  it('updates an item with its optimistic lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { updateProductRow } = await import('./productRows')

    await updateProductRow({ orderId: 42, productRowId: 7, lockVersion: 3, quantity: 2 })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/update', {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
      quantity: 2,
    })
  })

  it('copies an item in its order context', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { copyProductRow } = await import('./productRows')

    await copyProductRow({ orderId: 42, productRowId: 7, lockVersion: 3 })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/copy', {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
    })
  })

  it('reorders every active item in its order context', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { productRows: [item], orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { reorderProductRows } = await import('./productRows')

    await reorderProductRows({
      orderId: 42,
      productRows: [
        { productRowId: 9, lockVersion: 2 },
        { productRowId: 7, lockVersion: 3 },
      ],
    })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/reorder', {
      orderId: 42,
      productRows: [
        { productRowId: 9, lockVersion: 2 },
        { productRowId: 7, lockVersion: 3 },
      ],
    })
  })

  it('deletes an item with its optimistic lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 0, priceDealer: 0 } } } })

    const { deleteProductRow } = await import('./productRows')

    await deleteProductRow({ orderId: 42, productRowId: 7, lockVersion: 3 })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/delete', {
      orderId: 42,
      productRowId: 7,
      lockVersion: 3,
    })
  })

  it('transitions an item with its target status and lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { transitionProductRow } = await import('./productRows')

    await transitionProductRow({ orderId: 42, productRowId: 7, toStatus: 'production', lockVersion: 3 })

    expect(api.post).toHaveBeenCalledWith('/api/product-row/transition', {
      orderId: 42,
      productRowId: 7,
      toStatus: 'production',
      lockVersion: 3,
    })
  })

  it('calculates an item and transitions its order with exact item context', async () => {
    api.post
      .mockResolvedValueOnce({ data: { data: { priceRetail: '1000.00', priceDealer: '800.00', lockVersion: 4 } } })
      .mockResolvedValueOnce({ data: { data: { statusCode: 'submitted_to_order' } } })

    const { calculateProductRow, transitionOrder } = await import('./productRows')

    await calculateProductRow({ orderId: 42, productRowId: 7, modelId: '1', lockVersion: 3 })
    await transitionOrder({ orderId: 42, toStatus: 'submitted_to_order' })

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/order/calculate', {
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockVersion: 3,
    })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/order/transition', {
      orderId: 42,
      toStatus: 'submitted_to_order',
    })
  })
})
