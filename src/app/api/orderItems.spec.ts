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
  allowedActions: ['order_item.edit_configuration'] as const,
}

describe('order item API', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('requests an order item list in its order context', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { items: [item], orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { listOrderItems } = await import('./orderItems')

    await expect(listOrderItems(42)).resolves.toEqual({
      items: [item],
      orderTotals: { priceRetail: 1000, priceDealer: 800 },
    })
    expect(api.get).toHaveBeenCalledWith('/api/order-item/index', { params: { orderId: 42 } })
  })

  it('sends order and item context when saving a wicket', async () => {
    api.post.mockResolvedValueOnce({ data: { data: null } })

    const { saveWicketData } = await import('./wicket')

    await saveWicketData({ orderId: 42, orderItemId: 7, modelId: '1', widthProyema: 900 })

    expect(api.post).toHaveBeenCalledWith('/api/wicket/type1/data', {
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
      widthProyema: 900,
    })
  })

  it('rejects wicket saves without an item context before sending a request', async () => {
    const { saveWicketData } = await import('./wicket')

    await expect(saveWicketData({ orderId: 42, modelId: '1' } as never))
      .rejects.toThrow('Не указан корректный orderItemId текущей позиции.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends item context for terminal price and delete operations', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { hasSavedPrice: false, isActual: false } } })
    api.post.mockResolvedValue({ data: { data: { priceDealer: '800.00', priceRetail: '1000.00' } } })
    const context = { orderId: 42, orderItemId: 7, modelId: '1' }

    const { deleteCalculation, fetchSavedOrderPrice, finalCalculate } = await import('./wicket')

    await fetchSavedOrderPrice(context)
    await finalCalculate(context)
    await deleteCalculation(context)

    expect(api.get).toHaveBeenCalledWith('/api/order/saved-price', { params: context })
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/order/calculate', context)
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/type1/delete', context)
  })

  it('creates an item with the exact creation payload', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: null, priceDealer: null } } } })

    const { createOrderItem } = await import('./orderItems')

    await createOrderItem({ orderId: 42, productType: 'wicket', modelId: '1', model: 'Калитка Тип 1' })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/create', {
      orderId: 42,
      productType: 'wicket',
      modelId: '1',
      model: 'Калитка Тип 1',
    })
  })

  it('updates an item with its optimistic lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { updateOrderItem } = await import('./orderItems')

    await updateOrderItem({ orderId: 42, orderItemId: 7, lockVersion: 3, quantity: 2 })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/update', {
      orderId: 42,
      orderItemId: 7,
      lockVersion: 3,
      quantity: 2,
    })
  })

  it('copies an item in its order context', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { copyOrderItem } = await import('./orderItems')

    await copyOrderItem({ orderId: 42, orderItemId: 7 })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/copy', { orderId: 42, orderItemId: 7 })
  })

  it('reorders every active item in its order context', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { items: [item], orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { reorderOrderItems } = await import('./orderItems')

    await reorderOrderItems({ orderId: 42, itemIds: [9, 7] })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/reorder', { orderId: 42, itemIds: [9, 7] })
  })

  it('deletes an item with its optimistic lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 0, priceDealer: 0 } } } })

    const { deleteOrderItem } = await import('./orderItems')

    await deleteOrderItem({ orderId: 42, orderItemId: 7, lockVersion: 3 })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/delete', {
      orderId: 42,
      orderItemId: 7,
      lockVersion: 3,
    })
  })

  it('transitions an item with its target status and lock version', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { item, orderTotals: { priceRetail: 1000, priceDealer: 800 } } } })

    const { transitionOrderItem } = await import('./orderItems')

    await transitionOrderItem({ orderId: 42, orderItemId: 7, toStatus: 'production', lockVersion: 3 })

    expect(api.post).toHaveBeenCalledWith('/api/order-item/transition', {
      orderId: 42,
      orderItemId: 7,
      toStatus: 'production',
      lockVersion: 3,
    })
  })
})
