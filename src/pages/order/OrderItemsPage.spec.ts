import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import type {
  OrderItemCollectionMutationResponse,
  OrderItemListResponse,
  OrderItemSummary,
} from '../../app/api/orderItems'
import OrderItemsPage from './OrderItemsPage.vue'

const mocks = vi.hoisted(() => ({
  route: { params: { orderId: '42' } } as { params: { orderId: string } },
  push: vi.fn(),
  listOrderItems: vi.fn(),
  copyOrderItem: vi.fn(),
  updateOrderItem: vi.fn(),
  deleteOrderItem: vi.fn(),
  transitionOrderItem: vi.fn(),
  calculateOrderItem: vi.fn(),
  transitionOrder: vi.fn(),
  reorderOrderItems: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../app/api/orderItems', () => ({
  listOrderItems: mocks.listOrderItems,
  copyOrderItem: mocks.copyOrderItem,
  updateOrderItem: mocks.updateOrderItem,
  deleteOrderItem: mocks.deleteOrderItem,
  transitionOrderItem: mocks.transitionOrderItem,
  calculateOrderItem: mocks.calculateOrderItem,
  transitionOrder: mocks.transitionOrder,
  reorderOrderItems: mocks.reorderOrderItems,
}))

const SlotStub = { template: '<div><slot /></div>' }

function makeItem(id: number, overrides: Partial<OrderItemSummary> = {}): OrderItemSummary {
  return {
    id,
    orderId: 42,
    productType: 'wicket',
    modelId: String(id),
    quantity: id === 7 ? 2 : 1,
    sortOrder: id === 7 ? 10 : 20,
    status: { id: 1, code: 'draft', name: 'Черновик', color: '#777777' },
    baseRetailUnitPrice: id === 7 ? 1000 : null,
    baseDealerUnitPrice: id === 7 ? 800 : null,
    finalRetailUnitPrice: id === 7 ? 900 : null,
    finalDealerUnitPrice: id === 7 ? 720 : null,
    retailTotalPrice: id === 7 ? 1800 : null,
    dealerTotalPrice: id === 7 ? 1440 : null,
    adjustmentType: 'none',
    adjustmentValue: 0,
    adjustmentUnit: 'percent',
    plannedCompletionAt: null,
    lastCalculatedAt: null,
    isActual: id === 7,
    calculationError: null,
    lockVersion: id === 7 ? 4 : 1,
    allowedActions: [
      'order_item.edit_configuration',
      'order_item.change_quantity',
      'order_item.copy',
      'order_item.delete',
      'order_item.transition',
      'order_item.reorder',
    ],
    availableTransitions: ['approval', 'cancelled'],
    ...overrides,
  }
}

const first = makeItem(7)
const second = makeItem(8)
const initial: OrderItemListResponse = {
  items: [first, second],
  orderTotals: { priceRetail: 1800, priceDealer: 1440 },
  orderWorkflow: {
    statusCode: 'dealer_calculation',
    availableTransitions: ['submitted_to_order'],
    canCreateItem: true,
  },
}

function mountPage() {
  return mount(OrderItemsPage, {
    global: {
      stubs: {
        B24App: SlotStub,
        B24SidebarLayout: SlotStub,
      },
    },
  })
}

describe('OrderItemsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.route = reactive({ params: { orderId: '42' } })
    mocks.listOrderItems.mockResolvedValue(initial)
    mocks.copyOrderItem.mockResolvedValue({ item: second, orderTotals: initial.orderTotals })
    mocks.updateOrderItem.mockResolvedValue({ item: { ...first, quantity: 3, lockVersion: 5 }, orderTotals: initial.orderTotals })
    mocks.deleteOrderItem.mockResolvedValue({ item: first, orderTotals: initial.orderTotals })
    mocks.transitionOrderItem.mockResolvedValue({ item: first, orderTotals: initial.orderTotals })
    mocks.calculateOrderItem.mockResolvedValue({ priceRetail: '900.00', priceDealer: '720.00', lockVersion: 5 })
    mocks.transitionOrder.mockResolvedValue({ statusCode: 'submitted_to_order' })
    mocks.reorderOrderItems.mockResolvedValue({ items: [second, first], orderTotals: initial.orderTotals })
  })

  it('loads two items and shows status, quantities, prices and dual order totals', async () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Загрузка состава заказа')

    await flushPromises()
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(mocks.listOrderItems).toHaveBeenCalledWith(42)
    expect(text).toContain('Заказ №42')
    expect(text).toContain('Черновик')
    expect(text).toContain('Количество')
    expect(text).toContain('1 800')
    expect(text).toContain('1 440')
    expect(wrapper.findAll('[data-order-item]')).toHaveLength(2)
  })

  it('copies through the typed API, refreshes the source-of-truth list, and keeps the order context when adding', async () => {
    mocks.listOrderItems
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        items: [first, second, makeItem(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Копировать позицию 7"]').trigger('click')
    await flushPromises()

    expect(mocks.copyOrderItem).toHaveBeenCalledWith({ orderId: 42, orderItemId: 7, lockVersion: 4 })
    expect(mocks.listOrderItems).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('[data-order-item]')).toHaveLength(3)

    await wrapper.get('[aria-label="Добавить изделие в заказ 42"]').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ path: '/add-product', query: { orderId: '42' } })
  })

  it('keeps the stale list visible but disables mutations until a failed post-copy refresh is retried', async () => {
    mocks.listOrderItems
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('Сеть недоступна'))
      .mockResolvedValueOnce({
        items: [first, second, makeItem(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Копировать позицию 7"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Действие выполнено, но состав заказа не удалось обновить')
    expect(wrapper.get('[aria-label="Повторить загрузку состава заказа"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Копировать позицию 7"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[aria-label="Повторить загрузку состава заказа"]').trigger('click')
    await flushPromises()

    expect(mocks.listOrderItems).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('[data-order-item]')).toHaveLength(3)
    expect(wrapper.get('[aria-label="Копировать позицию 7"]').attributes('disabled')).toBeUndefined()
  })

  it('reloads when the route reuses the page for another order and ignores an older response', async () => {
    let resolveFirst!: (value: OrderItemListResponse) => void
    let resolveSecond!: (value: OrderItemListResponse) => void
    mocks.listOrderItems.mockImplementation((requestedOrderId: number) => new Promise((resolve) => {
      if (requestedOrderId === 42) resolveFirst = resolve
      else resolveSecond = resolve
    }))
    const wrapper = mountPage()

    mocks.route.params.orderId = '43'
    await flushPromises()
    resolveSecond({
      items: [makeItem(43, { orderId: 43, modelId: '43' })],
      orderTotals: { priceRetail: null, priceDealer: null },
      orderWorkflow: initial.orderWorkflow,
    })
    await flushPromises()

    expect(mocks.listOrderItems).toHaveBeenCalledWith(43)
    expect(wrapper.text()).toContain('Заказ №43')
    expect(wrapper.findAll('[data-order-item]')).toHaveLength(1)

    resolveFirst(initial)
    await flushPromises()

    expect(wrapper.text()).toContain('Заказ №43')
    expect(wrapper.findAll('[data-order-item]')).toHaveLength(1)
    expect(wrapper.find('[aria-label="Копировать позицию 7"]').exists()).toBe(false)
  })

  it('ignores a locked mutation response after navigation to another order', async () => {
    let resolveUpdate!: (value: { item: OrderItemSummary, orderTotals: OrderItemListResponse['orderTotals'] }) => void
    mocks.updateOrderItem.mockImplementation(() => new Promise(resolve => {
      resolveUpdate = resolve
    }))
    mocks.listOrderItems
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        items: [makeItem(43, { orderId: 43 })],
        orderTotals: { priceRetail: 4300, priceDealer: 3400 },
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Количество позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество позиции 7"]').trigger('change')
    mocks.route.params.orderId = '43'
    await flushPromises()

    resolveUpdate({
      item: { ...first, quantity: 3, lockVersion: 5 },
      orderTotals: initial.orderTotals,
    })
    await flushPromises()

    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)
    expect(wrapper.find('[aria-label="Копировать позицию 7"]').exists()).toBe(false)
  })

  it('ignores a reorder response after navigation to another order', async () => {
    let resolveReorder!: (value: OrderItemCollectionMutationResponse) => void
    mocks.reorderOrderItems.mockImplementation(() => new Promise(resolve => {
      resolveReorder = resolve
    }))
    mocks.listOrderItems
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        items: [makeItem(43, { orderId: 43 })],
        orderTotals: { priceRetail: 4300, priceDealer: 3400 },
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Переместить позицию 7 вниз"]').trigger('click')
    mocks.route.params.orderId = '43'
    await flushPromises()

    resolveReorder({ items: [second, first], orderTotals: initial.orderTotals })
    await flushPromises()

    expect(wrapper.findAll('[data-order-item]')).toHaveLength(1)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)
    expect(wrapper.find('[aria-label="Копировать позицию 7"]').exists()).toBe(false)
  })

  it('updates quantity with lockVersion and reloads with a conflict message on HTTP 409', async () => {
    mocks.updateOrderItem.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
    mocks.listOrderItems.mockResolvedValueOnce(initial).mockResolvedValueOnce({
      items: [{ ...first, quantity: 5, lockVersion: 5 }, second],
      orderTotals: initial.orderTotals,
      orderWorkflow: initial.orderWorkflow,
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Количество позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество позиции 7"]').trigger('change')
    await flushPromises()

    expect(mocks.updateOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      lockVersion: 4,
      quantity: 3,
    })
    expect(mocks.listOrderItems).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Позиция уже была изменена другим пользователем')
  })

  it('uses typed transition/delete/reorder calls and reorders with every active item id', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Новый статус позиции 7"]').setValue('approval')
    await wrapper.get('[aria-label="Сменить статус позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.transitionOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      toStatus: 'approval',
      lockVersion: 4,
    })

    await wrapper.get('[aria-label="Переместить позицию 7 вниз"]').trigger('click')
    await flushPromises()
    expect(mocks.reorderOrderItems).toHaveBeenCalledWith({ orderId: 42, itemIds: [8, 7] })

    await wrapper.get('[aria-label="Удалить позицию 8"]').trigger('click')
    await flushPromises()
    expect(mocks.deleteOrderItem).toHaveBeenCalledWith({ orderId: 42, orderItemId: 8, lockVersion: 1 })
  })

  it('hides every reorder control when any active item lacks server reorder permission', async () => {
    mocks.listOrderItems.mockResolvedValueOnce({
      items: [first, makeItem(8, {
        status: { id: 6, code: 'cancelled', name: 'Отменено', color: '#dc3545' },
        allowedActions: ['order_item.copy'],
      })],
      orderTotals: initial.orderTotals,
      orderWorkflow: initial.orderWorkflow,
    })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[aria-label="Переместить позицию 7 вниз"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Переместить позицию 8 вверх"]').exists()).toBe(false)
    expect(mocks.reorderOrderItems).not.toHaveBeenCalled()
  })

  it('has stable empty and load-error states', async () => {
    mocks.listOrderItems.mockResolvedValueOnce({
      items: [],
      orderTotals: { priceRetail: null, priceDealer: null },
      orderWorkflow: { ...initial.orderWorkflow, canCreateItem: true },
    })
    const empty = mountPage()
    await flushPromises()
    expect(empty.text()).toContain('В заказе пока нет изделий')

    mocks.listOrderItems.mockRejectedValueOnce(new Error('Сеть недоступна'))
    const failed = mountPage()
    await flushPromises()
    expect(failed.text()).toContain('Не удалось загрузить состав заказа')
    expect(failed.find('[aria-label="Повторить загрузку состава заказа"]').exists()).toBe(true)
  })

  it('updates terms and deadline, recalculates, and checks out through server capabilities', async () => {
    const commercialItem = makeItem(7, {
      allowedActions: [
        ...first.allowedActions,
        'order_item.change_terms',
        'order_item.change_deadline',
        'order_item.calculate',
      ],
    })
    const commercialResponse = { ...initial, items: [commercialItem, second] }
    mocks.listOrderItems
      .mockResolvedValueOnce(commercialResponse)
      .mockResolvedValue(commercialResponse)
    mocks.updateOrderItem.mockImplementation(payload => Promise.resolve({
      item: { ...commercialItem, ...payload },
      orderTotals: initial.orderTotals,
    }))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Тип корректировки позиции 7"]').setValue('markup')
    await wrapper.get('[aria-label="Значение корректировки позиции 7"]').setValue('15')
    await wrapper.get('[aria-label="Единица корректировки позиции 7"]').setValue('fixed')
    await wrapper.get('[aria-label="Сохранить корректировку позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.updateOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      lockVersion: 4,
      adjustmentType: 'markup',
      adjustmentValue: 15,
      adjustmentUnit: 'fixed',
    })

    await wrapper.get('[aria-label="Плановый срок позиции 7"]').setValue('2026-09-15')
    await wrapper.get('[aria-label="Сохранить срок позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.updateOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      lockVersion: 4,
      plannedCompletionAt: '2026-09-15',
    })

    await wrapper.get('[aria-label="Пересчитать позицию 7"]').trigger('click')
    await flushPromises()
    expect(mocks.calculateOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      modelId: '7',
      lockVersion: 4,
    })

    await wrapper.get('[aria-label="Перевести заказ в статус submitted_to_order"]').trigger('click')
    await flushPromises()
    expect(mocks.transitionOrder).toHaveBeenCalledWith({ orderId: 42, toStatus: 'submitted_to_order' })
  })

  it('hides add and checkout controls when the server does not grant them', async () => {
    mocks.listOrderItems.mockResolvedValueOnce({
      ...initial,
      orderWorkflow: {
        statusCode: 'submitted_to_order',
        availableTransitions: [],
        canCreateItem: false,
      },
    })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[aria-label="Добавить изделие в заказ 42"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label^="Перевести заказ в статус"]').exists()).toBe(false)
  })
})
