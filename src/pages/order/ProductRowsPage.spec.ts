import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import type {
  ProductRowCollectionMutationResponse,
  ProductRowListResponse,
  ProductRowSummary,
} from '../../app/api/productRows'
import ProductRowsPage from './ProductRowsPage.vue'

const mocks = vi.hoisted(() => ({
  route: { params: { orderId: '42' } } as { params: { orderId: string } },
  push: vi.fn(),
  listProductRows: vi.fn(),
  copyProductRow: vi.fn(),
  updateProductRow: vi.fn(),
  deleteProductRow: vi.fn(),
  transitionProductRow: vi.fn(),
  calculateProductRow: vi.fn(),
  transitionOrder: vi.fn(),
  reorderProductRows: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../app/api/productRows', () => ({
  listProductRows: mocks.listProductRows,
  copyProductRow: mocks.copyProductRow,
  updateProductRow: mocks.updateProductRow,
  deleteProductRow: mocks.deleteProductRow,
  transitionProductRow: mocks.transitionProductRow,
  calculateProductRow: mocks.calculateProductRow,
  transitionOrder: mocks.transitionOrder,
  reorderProductRows: mocks.reorderProductRows,
}))

const SlotStub = { template: '<div><slot /></div>' }

function makeProductRow(id: number, overrides: Partial<ProductRowSummary> = {}): ProductRowSummary {
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
      'product_row.edit_configuration',
      'product_row.change_quantity',
      'product_row.copy',
      'product_row.delete',
      'product_row.transition',
      'product_row.reorder',
    ],
    availableTransitions: ['approval', 'cancelled'],
    ...overrides,
  }
}

const first = makeProductRow(7)
const second = makeProductRow(8)
const initial: ProductRowListResponse = {
  productRows: [first, second],
  orderTotals: { priceRetail: 1800, priceDealer: 1440 },
  orderWorkflow: {
    statusCode: 'dealer_calculation',
    availableTransitions: ['submitted_to_order'],
    canCreateItem: true,
  },
}

function mountPage() {
  return mount(ProductRowsPage, {
    global: {
      stubs: {
        B24App: SlotStub,
        B24SidebarLayout: SlotStub,
        App: SlotStub,
        SidebarLayout: SlotStub,
      },
    },
  })
}

describe('ProductRowsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.route = reactive({ params: { orderId: '42' } })
    mocks.listProductRows.mockResolvedValue(initial)
    mocks.copyProductRow.mockResolvedValue({ productRow: second, orderTotals: initial.orderTotals })
    mocks.updateProductRow.mockResolvedValue({ productRow: { ...first, quantity: 3, lockVersion: 5 }, orderTotals: initial.orderTotals })
    mocks.deleteProductRow.mockResolvedValue({ productRow: first, orderTotals: initial.orderTotals })
    mocks.transitionProductRow.mockResolvedValue({ productRow: first, orderTotals: initial.orderTotals })
    mocks.calculateProductRow.mockResolvedValue({ priceRetail: '900.00', priceDealer: '720.00', lockVersion: 5 })
    mocks.transitionOrder.mockResolvedValue({ statusCode: 'submitted_to_order' })
    mocks.reorderProductRows.mockResolvedValue({ productRows: [second, first], orderTotals: initial.orderTotals })
  })

  it('loads two productRows and shows status, quantities, prices and dual order totals', async () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Загрузка состава заказа')

    await flushPromises()
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(mocks.listProductRows).toHaveBeenCalledWith(42)
    expect(text).toContain('Заказ №42')
    expect(text).toContain('Черновик')
    expect(text).toContain('Количество')
    expect(text).toContain('1 800')
    expect(text).toContain('1 440')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(2)
  })

  it('uses a container width independent of the B24 spacing-6xl token', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const container = wrapper.get('main > div')
    expect(container.classes()).toContain('w-full')
    expect(container.classes()).toContain('max-w-[1152px]')
    expect(container.classes()).not.toContain('max-w-6xl')
  })

  it('copies through the typed API, refreshes the source-of-truth list, and keeps the order context when adding', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        productRows: [first, second, makeProductRow(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await flushPromises()

    expect(mocks.copyProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, lockVersion: 4 })
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(3)

    await wrapper.get('[aria-label="Добавить товарную позицию в заказ 42"]').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ path: '/add-product', query: { orderId: '42' } })
  })

  it('keeps the stale list visible but disables mutations until a failed post-copy refresh is retried', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('Сеть недоступна'))
      .mockResolvedValueOnce({
        productRows: [first, second, makeProductRow(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Действие выполнено, но состав заказа не удалось обновить')
    expect(wrapper.get('[aria-label="Повторить загрузку состава заказа"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Копировать товарную позицию 7"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[aria-label="Повторить загрузку состава заказа"]').trigger('click')
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(3)
    expect(wrapper.get('[aria-label="Копировать товарную позицию 7"]').attributes('disabled')).toBeUndefined()
  })

  it('reloads when the route reuses the page for another order and ignores an older response', async () => {
    let resolveFirst!: (value: ProductRowListResponse) => void
    let resolveSecond!: (value: ProductRowListResponse) => void
    mocks.listProductRows.mockImplementation((requestedOrderId: number) => new Promise((resolve) => {
      if (requestedOrderId === 42) resolveFirst = resolve
      else resolveSecond = resolve
    }))
    const wrapper = mountPage()

    mocks.route.params.orderId = '43'
    await flushPromises()
    resolveSecond({
        productRows: [makeProductRow(43, { orderId: 43, modelId: '43' })],
      orderTotals: { priceRetail: null, priceDealer: null },
      orderWorkflow: initial.orderWorkflow,
    })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledWith(43)
    expect(wrapper.text()).toContain('Заказ №43')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(1)

    resolveFirst(initial)
    await flushPromises()

    expect(wrapper.text()).toContain('Заказ №43')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(1)
    expect(wrapper.find('[aria-label="Копировать товарную позицию 7"]').exists()).toBe(false)
  })

  it('ignores a locked mutation response after navigation to another order', async () => {
    let resolveUpdate!: (value: { productRow: ProductRowSummary, orderTotals: ProductRowListResponse['orderTotals'] }) => void
    mocks.updateProductRow.mockImplementation(() => new Promise(resolve => {
      resolveUpdate = resolve
    }))
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        productRows: [makeProductRow(43, { orderId: 43 })],
        orderTotals: { priceRetail: 4300, priceDealer: 3400 },
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Количество товарной позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').trigger('change')
    mocks.route.params.orderId = '43'
    await flushPromises()

    resolveUpdate({
      productRow: { ...first, quantity: 3, lockVersion: 5 },
      orderTotals: initial.orderTotals,
    })
    await flushPromises()

    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)
    expect(wrapper.find('[aria-label="Копировать товарную позицию 7"]').exists()).toBe(false)
  })

  it('enables the new order while an old reorder is pending and ignores its stale completion', async () => {
    let resolveReorder!: (value: ProductRowCollectionMutationResponse) => void
    mocks.reorderProductRows.mockImplementation(() => new Promise(resolve => {
      resolveReorder = resolve
    }))
    const nextOrderFirst = makeProductRow(43, { orderId: 43, sortOrder: 10 })
    const nextOrderSecond = makeProductRow(44, { orderId: 43, sortOrder: 20 })
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        productRows: [nextOrderFirst, nextOrderSecond],
        orderTotals: { priceRetail: 4300, priceDealer: 3400 },
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    mocks.route.params.orderId = '43'
    await flushPromises()

    expect(wrapper.get('[aria-label="Переместить товарную позицию 43 вниз"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Переместить товарную позицию 44 вверх"]').attributes('disabled')).toBeUndefined()

    resolveReorder({ productRows: [second, first], orderTotals: initial.orderTotals })
    await flushPromises()

    expect(wrapper.findAll('[data-product-row]')).toHaveLength(2)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)
    expect(wrapper.find('[aria-label="Копировать товарную позицию 7"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 43 вниз"]').attributes('disabled')).toBeUndefined()
  })

  it('updates quantity with lockVersion and reloads with a conflict message on HTTP 409', async () => {
    mocks.updateProductRow.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
    mocks.listProductRows.mockResolvedValueOnce(initial).mockResolvedValueOnce({
      productRows: [{ ...first, quantity: 5, lockVersion: 5 }, second],
      orderTotals: initial.orderTotals,
      orderWorkflow: initial.orderWorkflow,
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Количество товарной позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').trigger('change')
    await flushPromises()

    expect(mocks.updateProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      lockVersion: 4,
      quantity: 3,
    })
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Товарная позиция уже была изменена другим пользователем')
  })

  it('uses typed transition/delete/reorder calls and reorders every active product row id', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Новый статус товарной позиции 7"]').setValue('approval')
    await wrapper.get('[aria-label="Сменить статус товарной позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.transitionProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      toStatus: 'approval',
      lockVersion: 4,
    })

    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    await flushPromises()
    expect(mocks.reorderProductRows).toHaveBeenCalledWith({
      orderId: 42,
      productRows: [
        { productRowId: 8, lockVersion: 1 },
        { productRowId: 7, lockVersion: 4 },
      ],
    })

    await wrapper.get('[aria-label="Удалить товарную позицию 8"]').trigger('click')
    await flushPromises()
    expect(mocks.deleteProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 8, lockVersion: 1 })
  })

  it('reloads after a reorder conflict and keeps every reorder control busy until it settles', async () => {
    let rejectReorder!: (error: unknown) => void
    mocks.reorderProductRows.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectReorder = reject
    }))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    await wrapper.get('[aria-label="Переместить товарную позицию 8 вверх"]').trigger('click')

    expect(mocks.reorderProductRows).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Переместить товарную позицию 8 вверх"]').attributes('disabled')).toBeDefined()

    rejectReorder({
      isAxiosError: true,
      response: { status: 409, data: { message: 'stale' } },
    })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Товарная позиция уже была изменена другим пользователем')
  })

  it('hides every reorder control when any active product row lacks server reorder permission', async () => {
    mocks.listProductRows.mockResolvedValueOnce({
      productRows: [first, makeProductRow(8, {
        status: { id: 6, code: 'cancelled', name: 'Отменено', color: '#dc3545' },
        allowedActions: ['product_row.copy'],
      })],
      orderTotals: initial.orderTotals,
      orderWorkflow: initial.orderWorkflow,
    })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[aria-label="Переместить товарную позицию 7 вниз"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Переместить товарную позицию 8 вверх"]').exists()).toBe(false)
    expect(mocks.reorderProductRows).not.toHaveBeenCalled()
  })

  it('has stable empty and load-error states', async () => {
    mocks.listProductRows.mockResolvedValueOnce({
      productRows: [],
      orderTotals: { priceRetail: null, priceDealer: null },
      orderWorkflow: { ...initial.orderWorkflow, canCreateItem: true },
    })
    const empty = mountPage()
    await flushPromises()
    expect(empty.text()).toContain('В заказе пока нет товарных позиций')

    mocks.listProductRows.mockRejectedValueOnce(new Error('Сеть недоступна'))
    const failed = mountPage()
    await flushPromises()
    expect(failed.text()).toContain('Не удалось загрузить состав заказа')
    expect(failed.find('[aria-label="Повторить загрузку состава заказа"]').exists()).toBe(true)
  })

  it('updates terms and deadline, recalculates, and checks out through server capabilities', async () => {
    const commercialProductRow = makeProductRow(7, {
      allowedActions: [
        ...first.allowedActions,
        'product_row.change_terms',
        'product_row.change_deadline',
        'product_row.calculate',
      ],
    })
    const commercialResponse = { ...initial, productRows: [commercialProductRow, second] }
    mocks.listProductRows
      .mockResolvedValueOnce(commercialResponse)
      .mockResolvedValue(commercialResponse)
    mocks.updateProductRow.mockImplementation(payload => Promise.resolve({
      productRow: { ...commercialProductRow, ...payload },
      orderTotals: initial.orderTotals,
    }))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Тип корректировки товарной позиции 7"]').setValue('markup')
    await wrapper.get('[aria-label="Значение корректировки товарной позиции 7"]').setValue('15')
    await wrapper.get('[aria-label="Единица корректировки товарной позиции 7"]').setValue('fixed')
    await wrapper.get('[aria-label="Сохранить корректировку товарной позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.updateProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      lockVersion: 4,
      adjustmentType: 'markup',
      adjustmentValue: 15,
      adjustmentUnit: 'fixed',
    })

    await wrapper.get('[aria-label="Плановый срок товарной позиции 7"]').setValue('2026-09-15')
    await wrapper.get('[aria-label="Сохранить срок товарной позиции 7"]').trigger('click')
    await flushPromises()
    expect(mocks.updateProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      lockVersion: 4,
      plannedCompletionAt: '2026-09-15',
    })

    await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    await flushPromises()
    expect(mocks.calculateProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      modelId: '7',
      lockVersion: 4,
    })

    await wrapper.get('[aria-label="Перевести заказ в статус submitted_to_order"]').trigger('click')
    await flushPromises()
    expect(mocks.transitionOrder).toHaveBeenCalledWith({ orderId: 42, toStatus: 'submitted_to_order' })
  })

  it('hides add and checkout controls when the server does not grant them', async () => {
    mocks.listProductRows.mockResolvedValueOnce({
      ...initial,
      orderWorkflow: {
        statusCode: 'submitted_to_order',
        availableTransitions: [],
        canCreateItem: false,
      },
    })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[aria-label="Добавить товарную позицию в заказ 42"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label^="Перевести заказ в статус"]').exists()).toBe(false)
  })
})
