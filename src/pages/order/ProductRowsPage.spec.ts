import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import type {
  ProductRowCollectionMutationResponse,
  ProductRowListResponse,
  ProductRowSummary,
} from '../../app/api/productRows'
import ProductRowsPage from './ProductRowsPage.vue'

const mocks = vi.hoisted(() => ({
  route: { params: { orderId: '42' } } as { params: { orderId: string } },
  push: vi.fn(),
  navigateTop: vi.fn(),
  listProductRows: vi.fn(),
  copyProductRow: vi.fn(),
  updateProductRow: vi.fn(),
  deleteProductRow: vi.fn(),
  transitionProductRow: vi.fn(),
  calculateProductRow: vi.fn(),
  transitionOrder: vi.fn(),
  reorderProductRows: vi.fn(),
  createStandaloneProductRows: vi.fn(),
  materialSubmission: {
    materialItemId: 101,
    quantity: 2,
    installationRole: 'lock_component_installation',
    customerOwned: false,
  },
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
  createStandaloneProductRows: mocks.createStandaloneProductRows,
}))

vi.mock('../../components/order/AddMaterialProductRow.vue', () => ({
  default: {
    name: 'AddMaterialProductRow',
    props: ['orderId', 'disabled'],
    emits: ['close', 'submit'],
    setup: () => ({ materialSubmission: mocks.materialSubmission }),
    template: '<button type="button" aria-label="Подтвердить добавление материала" @click="$emit(\'submit\', materialSubmission)">Подтвердить</button><button type="button" aria-label="Отменить добавление материала" @click="$emit(\'close\')">Отмена</button>',
  },
}))

const B24AppStub = { template: '<div data-layout="b24-app"><slot /></div>' }
const B24SidebarLayoutStub = { template: '<div data-layout="b24-sidebar"><slot /></div>' }
const AppStub = { template: '<div data-layout="app"><slot /></div>' }
const SidebarLayoutStub = { template: '<div data-layout="sidebar"><slot /></div>' }

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

function makeProductRow(id: number, overrides: Partial<ProductRowSummary> = {}): ProductRowSummary {
  return {
    id,
    orderId: 42,
    productType: 'wicket',
    modelId: String(id),
    parentProductRowId: null,
    materialItemId: null,
    rowKind: 'product',
    relationRole: null,
    name: 'Калитка',
    article: null,
    unit: null,
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
    canCreateProductRow: true,
  },
}

function makeOrderResponse(
  productRows: ProductRowSummary[],
  overrides: Partial<ProductRowListResponse> = {},
): ProductRowListResponse {
  return {
    productRows,
    orderTotals: initial.orderTotals,
    orderWorkflow: initial.orderWorkflow,
    ...overrides,
  }
}

function withCommercialActions(
  productRow: ProductRowSummary,
  overrides: Partial<ProductRowSummary> = {},
): ProductRowSummary {
  return {
    ...productRow,
    allowedActions: [
      ...productRow.allowedActions,
      'product_row.change_terms',
      'product_row.change_deadline',
      'product_row.calculate',
    ],
    ...overrides,
  }
}

function setPlacementOptions(embedded = false, params: TPlacementParams = {}): void {
  window._PARAMS_ = {
    placement: 'DEFAULT',
    placementOptions: {
      type: 'openApplication',
      title: '',
      entity: '',
      viewMode: 'view',
      params: {
        ...(embedded ? { orderCardEmbedded: true } : {}),
        productRowCreateUrl: '/dealer/orders/product-create?id=42',
        productRowUpdateUrlTemplate: '/dealer/orders/product-update?id=42&productRowId={productRowId}',
        ...params,
      },
    },
  }
}

function mountPage(options: {
  embedded?: boolean
  attachTo?: HTMLElement
  placementParams?: TPlacementParams
} = {}) {
  setPlacementOptions(options.embedded ?? false, options.placementParams)
  return mount(ProductRowsPage, {
    attachTo: options.attachTo,
    global: {
      components: {
        B24App: B24AppStub,
        B24SidebarLayout: B24SidebarLayoutStub,
        App: AppStub,
        SidebarLayout: SidebarLayoutStub,
      },
    },
  })
}

async function openProductRowActions(
  wrapper: ReturnType<typeof mountPage>,
  productRowId: number,
): Promise<void> {
  await wrapper.get(`[aria-label="Действия товарной позиции ${productRowId}"]`).trigger('click')
}

function expectProductRowActionsDisabled(
  wrapper: ReturnType<typeof mountPage>,
  productRowId: number,
  disabled: boolean,
): void {
  const trigger = wrapper.get(`[aria-label="Действия товарной позиции ${productRowId}"]`)
  expect(trigger.attributes('disabled')).toBeUndefined()
  expect(trigger.attributes('aria-disabled')).toBe(disabled ? 'true' : undefined)
}

describe('ProductRowsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Reflect.set(window, '__productRowsNavigateTop__', mocks.navigateTop)
    mocks.route = reactive({ params: { orderId: '42' } })
    mocks.listProductRows.mockResolvedValue(initial)
    mocks.copyProductRow.mockResolvedValue({ productRow: second, orderTotals: initial.orderTotals })
    mocks.updateProductRow.mockResolvedValue({ productRow: { ...first, quantity: 3, lockVersion: 5 }, orderTotals: initial.orderTotals })
    mocks.deleteProductRow.mockResolvedValue({ productRow: first, orderTotals: initial.orderTotals })
    mocks.transitionProductRow.mockResolvedValue({ productRow: first, orderTotals: initial.orderTotals })
    mocks.calculateProductRow.mockResolvedValue({ priceRetail: '900.00', priceDealer: '720.00', lockVersion: 5 })
    mocks.transitionOrder.mockResolvedValue({ statusCode: 'submitted_to_order' })
    mocks.reorderProductRows.mockResolvedValue({ productRows: [second, first], orderTotals: initial.orderTotals })
    mocks.createStandaloneProductRows.mockResolvedValue({ productRows: [first], orderTotals: initial.orderTotals })
    mocks.materialSubmission = {
      materialItemId: 101,
      quantity: 2,
      installationRole: 'lock_component_installation',
      customerOwned: false,
    }
  })

  it('keeps the standalone B24 shell when embedded mode is not requested', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-layout="b24-app"]').exists()).toBe(true)
    expect(wrapper.find('[data-layout="b24-sidebar"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Заказ №42')
    expect(
      wrapper.findAll('div').some(node => node.classes().includes('h-[calc(100vh-50px)]')),
    ).toBe(true)
  })

  it('renders the shared work area without the B24 shell when embedded in the order card', async () => {
    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    expect(wrapper.find('[data-layout="b24-app"]').exists()).toBe(false)
    expect(wrapper.find('[data-layout="b24-sidebar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Заказ №42')
    expect(
      wrapper.findAll('div').some(node => node.classes().includes('h-[calc(100vh-50px)]')),
    ).toBe(false)
    const embeddedActions = wrapper.get('[data-product-row-add-actions]')
    expect(embeddedActions.classes()).toContain('gap-2')

    const addProductButton = wrapper.get('[aria-label="Добавить товарную позицию в заказ 42"]')
    const addMaterialButton = wrapper.get('[aria-label="Добавить материал в заказ 42"]')
    expect(addProductButton.classes()).toContain('!rounded-[4px]')
    expect(addMaterialButton.classes()).toContain('!rounded-[4px]')
    expect(addProductButton.classes()).not.toContain('rounded-[4px]')
    expect(addMaterialButton.classes()).not.toContain('rounded-[4px]')
    expect(addProductButton.classes()).not.toContain('rounded')
    expect(addMaterialButton.classes()).not.toContain('rounded')
    expect(addProductButton.classes()).not.toContain('rounded-lg')
    expect(addMaterialButton.classes()).not.toContain('rounded-lg')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(2)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/1\s*800/)
    expect(wrapper.get('[data-order-total="dealer"]').text()).toMatch(/1\s*440/)
  })

  it('renders separated rounded add buttons in the standalone header', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const headerActions = wrapper.get('[data-product-row-add-actions]')
    expect(headerActions.classes()).toContain('gap-2')

    const addProductButton = wrapper.get('[aria-label="Добавить товарную позицию в заказ 42"]')
    const addMaterialButton = wrapper.get('[aria-label="Добавить материал в заказ 42"]')
    expect(addProductButton.classes()).toContain('!rounded-[4px]')
    expect(addMaterialButton.classes()).toContain('!rounded-[4px]')
    expect(addProductButton.classes()).not.toContain('rounded-[4px]')
    expect(addMaterialButton.classes()).not.toContain('rounded-[4px]')
    expect(addProductButton.classes()).not.toContain('rounded')
    expect(addMaterialButton.classes()).not.toContain('rounded')
    expect(addProductButton.classes()).not.toContain('rounded-lg')
    expect(addMaterialButton.classes()).not.toContain('rounded-lg')
  })

  it.each(['', ' ', '0', '-1', '1.5', '1e2', '0x2a', '042', '9007199254740992'])(
    'rejects malformed or unsafe order id %j before API and configurator navigation',
    async (invalidOrderId) => {
      mocks.route.params.orderId = invalidOrderId
      const wrapper = mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Некорректный номер заказа')
      expect(mocks.listProductRows).not.toHaveBeenCalled()
      expect(wrapper.find('[aria-label^="Добавить товарную позицию"]').exists()).toBe(false)
      expect(mocks.push).not.toHaveBeenCalled()
    },
  )

  it('renders product rows as a spacious table of aligned row cards', async () => {
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
    const table = wrapper.get('[data-product-rows-table][role="table"]')
    expect(table.element.tagName).toBe('DIV')
    expect(table.find('thead').exists()).toBe(false)
    expect(table.findAll('[data-product-row][role="rowgroup"]')).toHaveLength(2)
    expect(table.classes()).toEqual(expect.arrayContaining(['grid', 'gap-3']))

    await openProductRowActions(wrapper, 7)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 7 вверх"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').attributes('disabled')).toBeUndefined()
    await openProductRowActions(wrapper, 8)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 8 вверх"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Переместить товарную позицию 8 вниз"]').attributes('disabled')).toBeDefined()
  })

  it('groups child snapshots under their root and keeps reorder controls on roots only', async () => {
    const root = makeProductRow(7, { name: 'Калитка из снимка', sortOrder: 20 })
    const child = makeProductRow(8, {
      productType: 'material', modelId: null, rowKind: 'material', parentProductRowId: 7,
      materialItemId: 101, relationRole: 'lock_component', name: 'Замок из снимка', article: 'OLD-LOCK',
      sortOrder: 10,
      allowedActions: ['product_row.edit_configuration', 'product_row.calculate', 'product_row.reorder'],
    })
    const anotherRoot = makeProductRow(9, { name: 'Вторая калитка', sortOrder: 30 })
    mocks.listProductRows.mockResolvedValueOnce(makeOrderResponse([child, anotherRoot, root]))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('[data-product-row]').map(row => row.attributes('data-product-row')))
      .toEqual(['7', '8', '9'])
    const childCard = wrapper.get('[data-product-row="8"]')
    expect(childCard.attributes('data-product-row-depth')).toBe('1')
    expect(childCard.text()).toContain('Комплектующее: Замок из снимка')
    expect(childCard.text()).toContain('OLD-LOCK')
    expect(childCard.classes()).toContain('ml-6')
    await openProductRowActions(wrapper, 8)
    expect(wrapper.find('[aria-label="Переместить товарную позицию 8 вверх"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Редактировать товарную позицию 8"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Пересчитать товарную позицию 8"]').exists()).toBe(false)

    await openProductRowActions(wrapper, 7)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    expect(mocks.reorderProductRows).toHaveBeenCalledWith({
      orderId: 42,
      productRows: [
        { productRowId: 9, lockVersion: 1 },
        { productRowId: 7, lockVersion: 4 },
      ],
    })
  })

  it('creates standalone material and installation with one atomic request and restores add-button focus', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(makeOrderResponse([first, second, makeProductRow(101, { productType: 'material', modelId: null, rowKind: 'material' })]))
    const wrapper = mountPage({ attachTo: document.body })
    await flushPromises()

    const addButton = wrapper.get('[aria-label="Добавить материал в заказ 42"]')
    await addButton.trigger('click')
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    await flushPromises()

    expect(mocks.createStandaloneProductRows).toHaveBeenCalledWith({
      orderId: 42,
      materialItemId: 101,
      quantity: 2,
      providedByManufacturer: true,
      installationRole: 'lock_component_installation',
      idempotencyKey: expect.any(String),
    })
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[aria-label="Подтвердить добавление материала"]').exists()).toBe(false)
    expect(document.activeElement).toBe(addButton.element)
    wrapper.unmount()
  })

  it('preserves customer-owned installation-only and ignores stale route completions', async () => {
    const pendingMaterial = deferred<unknown>()
    mocks.createStandaloneProductRows.mockImplementationOnce(() => pendingMaterial.promise)
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(makeOrderResponse([makeProductRow(43, { orderId: 43 })]))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Добавить материал в заказ 42"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    mocks.route.params.orderId = '43'
    await flushPromises()
    pendingMaterial.resolve({ productRow: first, orderTotals: initial.orderTotals })
    await flushPromises()

    expect(mocks.createStandaloneProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[aria-label="Подтвердить добавление материала"]').exists()).toBe(false)

    mocks.materialSubmission = {
      materialItemId: 101,
      quantity: 1,
      installationRole: 'lock_component_installation',
      customerOwned: true,
    }
    await wrapper.get('[aria-label="Добавить материал в заказ 43"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    await flushPromises()

    expect(mocks.createStandaloneProductRows).toHaveBeenLastCalledWith({
      orderId: 43,
      materialItemId: 101,
      quantity: 1,
      providedByManufacturer: false,
      installationRole: 'lock_component_installation',
      idempotencyKey: expect.any(String),
    })
  })

  it('reuses the request key when the response is lost and retry completes without duplicate workflow calls', async () => {
    mocks.createStandaloneProductRows
      .mockRejectedValueOnce(new Error('Ответ потерян'))
      .mockResolvedValueOnce({ productRows: [first], orderTotals: initial.orderTotals })
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(makeOrderResponse([first, second, makeProductRow(101, { productType: 'material', modelId: null, rowKind: 'material' })]))
    const wrapper = mountPage({ attachTo: document.body })
    await flushPromises()

    const trigger = wrapper.get('[aria-label="Добавить материал в заказ 42"]')
    await trigger.trigger('click')
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    await flushPromises()

    expect(mocks.createStandaloneProductRows).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[aria-label="Подтвердить добавление материала"]').exists()).toBe(true)
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    await flushPromises()

    expect(mocks.createStandaloneProductRows).toHaveBeenCalledTimes(2)
    const firstKey = mocks.createStandaloneProductRows.mock.calls[0][0].idempotencyKey
    const retryKey = mocks.createStandaloneProductRows.mock.calls[1][0].idempotencyKey
    expect(retryKey).toBe(firstKey)
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[aria-label="Подтвердить добавление материала"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('reloads canonical rows with a conflict notice for standalone creation conflicts', async () => {
    mocks.createStandaloneProductRows.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
    mocks.listProductRows.mockResolvedValueOnce(initial).mockResolvedValueOnce(makeOrderResponse([second]))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Добавить материал в заказ 42"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить добавление материала"]').trigger('click')
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[role="status"]').text()).toContain('Товарная позиция уже была изменена другим пользователем')
  })

  it('restores the add-material trigger focus when dialog is cancelled', async () => {
    const wrapper = mountPage({ attachTo: document.body })
    await flushPromises()
    const trigger = wrapper.get('[aria-label="Добавить материал в заказ 42"]')
    await trigger.trigger('click')
    const cancel = wrapper.get('[aria-label="Отменить добавление материала"]')
    ;(cancel.element as HTMLButtonElement).focus()
    await cancel.trigger('click')
    await nextTick()

    expect(wrapper.find('[aria-label="Подтвердить добавление материала"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('removes a root and all of its children after cascade-delete refresh', async () => {
    const child = makeProductRow(70, {
      productType: 'material', modelId: null, rowKind: 'material', parentProductRowId: 7,
      relationRole: 'lock_component', materialItemId: 101,
    })
    mocks.listProductRows
      .mockResolvedValueOnce(makeOrderResponse([first, child, second]))
      .mockResolvedValueOnce(makeOrderResponse([second]))
    const wrapper = mountPage()
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Удалить товарную позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-product-row="7"]').exists()).toBe(false)
    expect(wrapper.find('[data-product-row="70"]').exists()).toBe(false)
    expect(wrapper.find('[data-product-row="8"]').exists()).toBe(true)
  })

  it('uses a container width independent of the B24 spacing-6xl token', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const container = wrapper.get('main > div')
    expect(container.classes()).toContain('w-full')
    expect(container.classes()).toContain('max-w-[1152px]')
    expect(container.classes()).not.toContain('max-w-6xl')
  })

  it('keeps the only product-row actions menu outside clipping table ancestors', async () => {
    mocks.listProductRows.mockResolvedValueOnce(makeOrderResponse([first]))
    const wrapper = mountPage()
    await flushPromises()

    const table = wrapper.get('[data-product-rows-table][role="table"]')
    expect(table.classes()).not.toContain('overflow-hidden')

    const onlyRowGroup = wrapper.get('[data-product-row="7"][role="rowgroup"]')
    expect(onlyRowGroup.classes()).toContain('overflow-visible')
    await openProductRowActions(wrapper, 7)

    let ancestor = wrapper.get('[role="menu"]').element.parentElement
    while (ancestor && ancestor !== wrapper.get('main').element) {
      expect(ancestor.classList).not.toContain('overflow-hidden')
      ancestor = ancestor.parentElement
    }
  })

  it('copies through the typed API and refreshes the source-of-truth list', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        productRows: [first, second, makeProductRow(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage()
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await flushPromises()

    expect(mocks.copyProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, lockVersion: 4 })
    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(3)

  })

  it('navigates the top window with server-owned product-row URLs', async () => {
    const wrapper = mountPage({
      placementParams: {
        productRowCreateUrl: '/dealer/orders/product-create?id=42',
        productRowUpdateUrlTemplate: '/dealer/orders/product-update?id=42&productRowId={productRowId}',
      },
    })
    await flushPromises()

    await wrapper.get('[aria-label="Добавить товарную позицию в заказ 42"]').trigger('click')
    expect(mocks.navigateTop).toHaveBeenCalledWith('/dealer/orders/product-create?id=42')

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Редактировать товарную позицию 7"]').trigger('click')
    expect(mocks.navigateTop).toHaveBeenCalledWith(
      '/dealer/orders/product-update?id=42&productRowId=7',
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('shows the server-owned cost details action and navigates the top window', async () => {
    const wrapper = mountPage({
      placementParams: {
        productRowCostDetailsUrlTemplate: '/order-cost-details?order_id=42&productRowId={productRowId}',
      },
    })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Открыть детализацию стоимости товарной позиции 7"]').trigger('click')

    expect(mocks.navigateTop).toHaveBeenCalledWith(
      '/order-cost-details?order_id=42&productRowId=7',
    )
  })

  it('renders a PDF action with both template markers replaced for wicket rows', async () => {
    mocks.listProductRows.mockResolvedValue(makeOrderResponse([
      makeProductRow(7, { modelId: '3' }),
      second,
    ]))
    const wrapper = mountPage({
      placementParams: {
        productRowPdfUrlTemplate: '/pdf-for-production?order_id=42&productRowId={productRowId}&model_id={modelId}',
      },
    })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    const action = wrapper.get('[aria-label="Сформировать PDF товарной позиции 7"]')
    expect(action.attributes('href')).toBe('/pdf-for-production?order_id=42&productRowId=7&model_id=3')
    expect(action.attributes('target')).toBe('_blank')
  })

  it.each([
    ['/pdf-for-production?order_id=42&productRowId={productRowId}'],
    ['/pdf-for-production?order_id=42&productRowId={productRowId}&model_id={modelId}&duplicate={modelId}'],
    ['/pdf-for-production?order_id=42&productRowId={productRowId}&productRowId={productRowId}&model_id={modelId}'],
    ['https://example.test/pdf-for-production?order_id=42&productRowId={productRowId}&model_id={modelId}'],
    ['/pdf-for-production?order_id=41&productRowId={productRowId}&model_id={modelId}'],
    ['/pdf-for-production?order_id=42&productRowId=8&resolved={productRowId}&model_id={modelId}'],
    ['/pdf-for-production?order_id=42&productRowId={productRowId}&model_id=8&resolved={modelId}'],
  ])('hides an invalid PDF template: %s', async (template) => {
    const wrapper = mountPage({ placementParams: { productRowPdfUrlTemplate: template } })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    expect(wrapper.find('[aria-label="Сформировать PDF товарной позиции 7"]').exists()).toBe(false)
  })

  it('hides the PDF action for non-wicket rows', async () => {
    mocks.listProductRows.mockResolvedValue(makeOrderResponse([
      makeProductRow(7, { productType: 'material' }),
    ]))
    const wrapper = mountPage({
      placementParams: {
        productRowPdfUrlTemplate: '/pdf-for-production?order_id=42&productRowId={productRowId}&model_id={modelId}',
      },
    })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    expect(wrapper.find('[aria-label="Сформировать PDF товарной позиции 7"]').exists()).toBe(false)
  })

  it.each([
    ['/order-cost-details?order_id=42&productRowId=7'],
    ['/order-cost-details?order_id=41&productRowId={productRowId}'],
    ['/order-cost-details?order_id=42&order_id=41&productRowId={productRowId}'],
    ['/order-cost-details?order_id=42&productRowId={productRowId}&productRowId=8'],
    ['/\n/[?order_id=42&productRowId={productRowId}'],
    ['https://example.test/order-cost-details?order_id=42&productRowId={productRowId}'],
    ['//example.test/order-cost-details?order_id=42&productRowId={productRowId}'],
  ])('hides an invalid cost details template: %s', async (template) => {
    const wrapper = mountPage({ placementParams: { productRowCostDetailsUrlTemplate: template } })
    await flushPromises()
    await openProductRowActions(wrapper, 7)

    expect(wrapper.find('[aria-label="Открыть детализацию стоимости товарной позиции 7"]').exists()).toBe(false)
  })

  it.each([
    ['missing create URL', { productRowCreateUrl: undefined }, '[aria-label="Добавить товарную позицию в заказ 42"]'],
    [
      'update template without the row placeholder',
      { productRowUpdateUrlTemplate: '/dealer/orders/product-update?id=42' },
      '[aria-label="Редактировать товарную позицию 7"]',
    ],
    [
      'absolute create URL',
      { productRowCreateUrl: 'https://example.test/product-create?id=42' },
      '[aria-label="Добавить товарную позицию в заказ 42"]',
    ],
  ] as const)('shows an error without navigating for %s', async (_, placementParams, actionSelector) => {
    const wrapper = mountPage({ placementParams })
    await flushPromises()

    if (actionSelector.includes('Редактировать')) await openProductRowActions(wrapper, 7)
    await wrapper.get(actionSelector).trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('Ссылка')
    expect(mocks.navigateTop).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('rejects navigation from stale placement URLs after the order changes', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(makeOrderResponse([makeProductRow(43, { orderId: 43 })]))
    const wrapper = mountPage()
    await flushPromises()

    mocks.route.params.orderId = '43'
    await flushPromises()
    await wrapper.get('[aria-label="Добавить товарную позицию в заказ 43"]').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('Ссылка')
    expect(mocks.navigateTop).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it.each(['copy', 'recalculate', 'delete'] as const)(
    'keeps the real menu trigger focusable and focused through pending, error, and success for %s',
    async (action) => {
      const actionRow = withCommercialActions(first)
      const orderResponse = makeOrderResponse([actionRow, second])
      const failedOperation = deferred<unknown>()
      const successfulOperation = deferred<unknown>()
      const operationMock = action === 'copy'
        ? mocks.copyProductRow
        : action === 'recalculate'
          ? mocks.calculateProductRow
          : mocks.deleteProductRow
      const successResponse = action === 'recalculate'
        ? { priceRetail: '900.00', priceDealer: '720.00', lockVersion: 5 }
        : { productRow: actionRow, orderTotals: orderResponse.orderTotals }
      operationMock
        .mockImplementationOnce(() => failedOperation.promise)
        .mockImplementationOnce(() => successfulOperation.promise)
      mocks.listProductRows
        .mockResolvedValueOnce(orderResponse)
        .mockResolvedValue(action === 'delete' ? makeOrderResponse([second]) : orderResponse)
      const wrapper = mountPage({ attachTo: document.body })
      await flushPromises()

      async function invokeAction(): Promise<void> {
        const trigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
        ;(trigger.element as HTMLButtonElement).focus()
        await trigger.trigger('click')
        const actionLabel = action === 'copy'
          ? 'Копировать товарную позицию 7'
          : action === 'recalculate'
            ? 'Пересчитать товарную позицию 7'
            : 'Удалить товарную позицию 7'
        await wrapper.get(`[aria-label="${actionLabel}"]`).trigger('click')
        if (action === 'delete') {
          await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
        }
        await nextTick()
      }

      try {
        await invokeAction()
        const pendingTrigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
        expectProductRowActionsDisabled(wrapper, 7, true)
        expect(wrapper.find('[role="menu"]').exists()).toBe(false)
        expect(pendingTrigger.element).toBe(document.activeElement)

        failedOperation.reject(new Error('Сеть недоступна'))
        await flushPromises()
        const failedTrigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
        expectProductRowActionsDisabled(wrapper, 7, false)
        expect(failedTrigger.element).toBe(document.activeElement)

        await invokeAction()
        const successfulPendingTrigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
        expectProductRowActionsDisabled(wrapper, 7, true)
        expect(successfulPendingTrigger.element).toBe(document.activeElement)

        successfulOperation.resolve(successResponse)
        await flushPromises()
        if (action === 'delete') {
          expect(wrapper.find('[aria-label="Действия товарной позиции 7"]').exists()).toBe(false)
          expect(document.activeElement).toBe(
            wrapper.get('[aria-label="Действия товарной позиции 8"]').element,
          )
        } else {
          const successfulTrigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
          expectProductRowActionsDisabled(wrapper, 7, false)
          expect(successfulTrigger.element).toBe(document.activeElement)
        }
        expect(operationMock).toHaveBeenCalledTimes(2)
      } finally {
        wrapper.unmount()
      }
    },
  )

  it('does not steal focus when the user leaves the deleting row before refresh completes', async () => {
    const deletingRow = withCommercialActions(first)
    const orderResponse = makeOrderResponse([deletingRow, second])
    const pendingDelete = deferred<unknown>()
    const pendingRefresh = deferred<ProductRowListResponse>()
    mocks.deleteProductRow.mockImplementationOnce(() => pendingDelete.promise)
    mocks.listProductRows
      .mockResolvedValueOnce(orderResponse)
      .mockImplementationOnce(() => pendingRefresh.promise)
    const wrapper = mountPage({ attachTo: document.body })
    await flushPromises()

    try {
      await openProductRowActions(wrapper, 7)
      await wrapper.get('[aria-label="Удалить товарную позицию 7"]').trigger('click')
      await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
      await nextTick()

      pendingDelete.resolve({ productRow: deletingRow, orderTotals: orderResponse.orderTotals })
      await flushPromises()
      expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
      expect(wrapper.find('[aria-label="Действия товарной позиции 7"]').exists()).toBe(true)

      const otherRowQuantity = wrapper.get('[aria-label="Количество товарной позиции 8"]')
      ;(otherRowQuantity.element as HTMLInputElement).focus()
      expect(document.activeElement).toBe(otherRowQuantity.element)

      pendingRefresh.resolve(makeOrderResponse([second]))
      await flushPromises()

      expect(wrapper.find('[aria-label="Действия товарной позиции 7"]').exists()).toBe(false)
      expect(document.activeElement).toBe(
        wrapper.get('[aria-label="Количество товарной позиции 8"]').element,
      )
    } finally {
      wrapper.unmount()
    }
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
    const wrapper = mountPage({
      placementParams: {
        productRowPdfUrlTemplate: '/pdf-for-production?order_id=42&productRowId={productRowId}&model_id={modelId}',
      },
    })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    expect(wrapper.get('[aria-label="Сформировать PDF товарной позиции 7"]')).toBeTruthy()
    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Действие выполнено, но состав заказа не удалось обновить')
    expect(wrapper.get('[aria-label="Повторить загрузку состава заказа"]').attributes('disabled')).toBeUndefined()
    expectProductRowActionsDisabled(wrapper, 7, true)
    expect(wrapper.find('[aria-label="Сформировать PDF товарной позиции 7"]').exists()).toBe(false)

    await wrapper.get('[aria-label="Повторить загрузку состава заказа"]').trigger('click')
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(3)
    expectProductRowActionsDisabled(wrapper, 7, false)
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

  it('keeps embedded shell markers absent and ignores a stale load response after switching orders', async () => {
    const firstLoad = deferred<ProductRowListResponse>()
    const secondLoad = deferred<ProductRowListResponse>()
    mocks.listProductRows.mockImplementation((requestedOrderId: number) => {
      if (requestedOrderId === 42) return firstLoad.promise
      return secondLoad.promise
    })

    const wrapper = mountPage({ embedded: true })

    expect(wrapper.find('[data-layout="b24-app"]').exists()).toBe(false)
    expect(wrapper.find('[data-layout="b24-sidebar"]').exists()).toBe(false)

    mocks.route.params.orderId = '43'
    await flushPromises()

    const order43 = makeOrderResponse(
      [makeProductRow(43, { orderId: 43, modelId: '43' })],
      { orderTotals: { priceRetail: 4300, priceDealer: 3400 } },
    )
    secondLoad.resolve(order43)
    await flushPromises()

    expect(wrapper.text()).toContain('Позиция №43')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(1)
    expect(wrapper.find('[data-layout="b24-app"]').exists()).toBe(false)
    expect(wrapper.find('[data-layout="b24-sidebar"]').exists()).toBe(false)

    firstLoad.resolve(initial)
    await flushPromises()

    expect(wrapper.text()).toContain('Позиция №43')
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(1)
    expect(wrapper.find('[aria-label="Копировать товарную позицию 7"]').exists()).toBe(false)

    await wrapper.get('[aria-label="Добавить товарную позицию в заказ 43"]').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Ссылка')
    expect(mocks.navigateTop).not.toHaveBeenCalled()
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

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    mocks.route.params.orderId = '43'
    await flushPromises()

    await openProductRowActions(wrapper, 43)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 43 вниз"]').attributes('disabled')).toBeUndefined()
    await openProductRowActions(wrapper, 44)
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

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Перевести товарную позицию 7 в статус approval"]').trigger('click')
    await flushPromises()
    expect(mocks.transitionProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      toStatus: 'approval',
      lockVersion: 4,
    })

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    await flushPromises()
    expect(mocks.reorderProductRows).toHaveBeenCalledWith({
      orderId: 42,
      productRows: [
        { productRowId: 8, lockVersion: 1 },
        { productRowId: 7, lockVersion: 4 },
      ],
    })

    await openProductRowActions(wrapper, 8)
    await wrapper.get('[aria-label="Удалить товарную позицию 8"]').trigger('click')
    expect(mocks.deleteProductRow).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Отменить удаление товарной позиции 8"]').trigger('click')
    expect(mocks.deleteProductRow).not.toHaveBeenCalled()

    await wrapper.get('[aria-label="Удалить товарную позицию 8"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 8"]').trigger('click')
    await flushPromises()
    expect(mocks.deleteProductRow).toHaveBeenCalledTimes(1)
    expect(mocks.deleteProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 8, lockVersion: 1 })
  })

  it('blocks only the moved row and every reorder choice while keeping unrelated actions callable', async () => {
    const third = makeProductRow(9, { quantity: 1, sortOrder: 30 })
    const threeRows = makeOrderResponse([first, second, third])
    const pendingReorder = deferred<ProductRowCollectionMutationResponse>()
    mocks.listProductRows.mockResolvedValue(threeRows)
    mocks.reorderProductRows.mockImplementationOnce(() => pendingReorder.promise)
    mocks.copyProductRow.mockResolvedValue({ productRow: third, orderTotals: threeRows.orderTotals })
    const wrapper = mountPage()
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    await nextTick()

    expect(mocks.reorderProductRows).toHaveBeenCalledTimes(1)
    expectProductRowActionsDisabled(wrapper, 7, true)
    expectProductRowActionsDisabled(wrapper, 8, false)
    expectProductRowActionsDisabled(wrapper, 9, false)

    await openProductRowActions(wrapper, 9)
    const copy = wrapper.get('[aria-label="Копировать товарную позицию 9"]')
    const secondReorder = wrapper.get('[aria-label="Переместить товарную позицию 9 вверх"]')
    expect(copy.attributes('disabled')).toBeUndefined()
    expect(secondReorder.attributes('disabled')).toBeDefined()
    await secondReorder.trigger('click')
    expect(mocks.reorderProductRows).toHaveBeenCalledTimes(1)

    await copy.trigger('click')
    await flushPromises()
    expect(mocks.copyProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 9, lockVersion: 1 })
    expect(mocks.reorderProductRows).toHaveBeenCalledTimes(1)

    pendingReorder.resolve({
      productRows: [second, first, third],
      orderTotals: threeRows.orderTotals,
    })
    await flushPromises()
    expectProductRowActionsDisabled(wrapper, 7, false)
  })

  it('reloads after a reorder conflict and keeps every reorder control busy until it settles', async () => {
    let rejectReorder!: (error: unknown) => void
    mocks.reorderProductRows.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectReorder = reject
    }))
    const wrapper = mountPage()
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')

    expect(mocks.reorderProductRows).toHaveBeenCalledTimes(1)
    expectProductRowActionsDisabled(wrapper, 7, true)
    expectProductRowActionsDisabled(wrapper, 8, false)
    await openProductRowActions(wrapper, 8)
    expect(wrapper.get('[aria-label="Копировать товарную позицию 8"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Переместить товарную позицию 8 вверх"]').attributes('disabled')).toBeDefined()

    rejectReorder({
      isAxiosError: true,
      response: { status: 409, data: { message: 'stale' } },
    })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Товарная позиция уже была изменена другим пользователем')
  })

  it('disables reorder in the menu when any active product row lacks server reorder permission', async () => {
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

    await openProductRowActions(wrapper, 7)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').attributes('disabled')).toBeDefined()
    await openProductRowActions(wrapper, 8)
    expect(wrapper.find('[aria-label="Переместить товарную позицию 8 вверх"]').exists()).toBe(false)
    expect(mocks.reorderProductRows).not.toHaveBeenCalled()
  })

  it('has stable empty and load-error states', async () => {
    mocks.listProductRows.mockResolvedValueOnce({
      productRows: [],
      orderTotals: { priceRetail: null, priceDealer: null },
      orderWorkflow: { ...initial.orderWorkflow, canCreateProductRow: true },
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
    const commercialProductRow = withCommercialActions(makeProductRow(7))
    const commercialResponse = makeOrderResponse([commercialProductRow, second])
    mocks.listProductRows
      .mockResolvedValueOnce(commercialResponse)
      .mockResolvedValue(commercialResponse)
    mocks.updateProductRow.mockImplementation(payload => Promise.resolve({
      productRow: { ...commercialProductRow, ...payload },
      orderTotals: initial.orderTotals,
    }))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
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

    await openProductRowActions(wrapper, 7)
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

  it('ignores a stale calculate completion without unlocking the current embedded order', async () => {
    const order42 = makeOrderResponse([withCommercialActions(first), second])
    const currentOrderRow = withCommercialActions(makeProductRow(7, {
      orderId: 43,
      quantity: 4,
      lockVersion: 8,
    }))
    const order43 = makeOrderResponse(
      [currentOrderRow],
      { orderTotals: { priceRetail: 4300, priceDealer: 3400 } },
    )
    const order43Refreshed = makeOrderResponse(
      [{ ...currentOrderRow, lockVersion: 9, lastCalculatedAt: 1787641200 }],
      { orderTotals: { priceRetail: 4700, priceDealer: 3600 } },
    )
    const staleCalculate = deferred<{ priceRetail: string, priceDealer: string, lockVersion: number }>()
    const currentCalculate = deferred<{ priceRetail: string, priceDealer: string, lockVersion: number }>()

    mocks.listProductRows
      .mockResolvedValueOnce(order42)
      .mockResolvedValueOnce(order43)
      .mockResolvedValueOnce(order43Refreshed)
    mocks.calculateProductRow
      .mockImplementationOnce(() => staleCalculate.promise)
      .mockImplementationOnce(() => currentCalculate.promise)

    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    expectProductRowActionsDisabled(wrapper, 7, true)

    mocks.route.params.orderId = '43'
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    expect(mocks.calculateProductRow).toHaveBeenNthCalledWith(2, {
      orderId: 43,
      productRowId: 7,
      modelId: '7',
      lockVersion: 8,
    })
    expectProductRowActionsDisabled(wrapper, 7, true)

    staleCalculate.resolve({ priceRetail: '900.00', priceDealer: '720.00', lockVersion: 5 })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expectProductRowActionsDisabled(wrapper, 7, true)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)

    currentCalculate.resolve({ priceRetail: '1175.00', priceDealer: '900.00', lockVersion: 9 })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(3)
    expectProductRowActionsDisabled(wrapper, 7, false)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*700/)
  })

  it('ignores a stale delete completion without unlocking the current embedded order', async () => {
    const order43Row = makeProductRow(7, { orderId: 43, lockVersion: 8 })
    const order42 = makeOrderResponse([first, second])
    const order43 = makeOrderResponse(
      [order43Row, makeProductRow(44, { orderId: 43 })],
      { orderTotals: { priceRetail: 4300, priceDealer: 3400 } },
    )
    const order43AfterDelete = makeOrderResponse(
      [makeProductRow(44, { orderId: 43 })],
      { orderTotals: { priceRetail: 1100, priceDealer: 900 } },
    )
    const staleDelete = deferred<{ productRow: ProductRowSummary, orderTotals: ProductRowListResponse['orderTotals'] }>()
    const currentDelete = deferred<{ productRow: ProductRowSummary, orderTotals: ProductRowListResponse['orderTotals'] }>()

    mocks.listProductRows
      .mockResolvedValueOnce(order42)
      .mockResolvedValueOnce(order43)
      .mockResolvedValueOnce(order43AfterDelete)
    mocks.deleteProductRow
      .mockImplementationOnce(() => staleDelete.promise)
      .mockImplementationOnce(() => currentDelete.promise)

    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Удалить товарную позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
    expectProductRowActionsDisabled(wrapper, 7, true)

    mocks.route.params.orderId = '43'
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Удалить товарную позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
    expect(mocks.deleteProductRow).toHaveBeenNthCalledWith(2, { orderId: 43, productRowId: 7, lockVersion: 8 })
    expectProductRowActionsDisabled(wrapper, 7, true)

    staleDelete.resolve({ productRow: first, orderTotals: initial.orderTotals })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(2)
    expectProductRowActionsDisabled(wrapper, 7, true)
    expect(wrapper.findAll('[data-product-row]')).toHaveLength(2)

    currentDelete.resolve({ productRow: order43Row, orderTotals: order43.orderTotals })
    await flushPromises()

    expect(mocks.listProductRows).toHaveBeenCalledTimes(3)
    expect(wrapper.find('[aria-label="Удалить товарную позицию 7"]').exists()).toBe(false)
    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/1\s*100/)
  })

  it('keeps stale refresh recovery and order context when embedded', async () => {
    mocks.listProductRows
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('Сеть недоступна'))
      .mockResolvedValueOnce({
        productRows: [first, second, makeProductRow(9)],
        orderTotals: initial.orderTotals,
        orderWorkflow: initial.orderWorkflow,
      })
    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await flushPromises()

    expect(mocks.copyProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, lockVersion: 4 })
    expect(wrapper.text()).toContain('Действие выполнено, но состав заказа не удалось обновить')
    expectProductRowActionsDisabled(wrapper, 7, true)

    await wrapper.get('[aria-label="Повторить загрузку состава заказа"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-product-row]')).toHaveLength(3)

    await wrapper.get('[aria-label="Добавить товарную позицию в заказ 42"]').trigger('click')
    expect(mocks.navigateTop).toHaveBeenCalledWith('/dealer/orders/product-create?id=42')
  })

  it('keeps route-change reorder guards and strict reorder payloads when embedded', async () => {
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
    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    expect(mocks.reorderProductRows).toHaveBeenCalledWith({
      orderId: 42,
      productRows: [
        { productRowId: 8, lockVersion: 1 },
        { productRowId: 7, lockVersion: 4 },
      ],
    })

    mocks.route.params.orderId = '43'
    await flushPromises()

    await openProductRowActions(wrapper, 43)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 43 вниз"]').attributes('disabled')).toBeUndefined()
    await openProductRowActions(wrapper, 44)
    expect(wrapper.get('[aria-label="Переместить товарную позицию 44 вверх"]').attributes('disabled')).toBeUndefined()

    resolveReorder({ productRows: [second, first], orderTotals: initial.orderTotals })
    await flushPromises()

    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*300/)
    expect(wrapper.find('[aria-label="Копировать товарную позицию 7"]').exists()).toBe(false)
  })

  it('keeps conflict recovery and strict product row payloads when embedded', async () => {
    mocks.updateProductRow.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
    mocks.listProductRows.mockResolvedValueOnce(initial).mockResolvedValueOnce({
      productRows: [{ ...first, quantity: 5, lockVersion: 5 }, second],
      orderTotals: initial.orderTotals,
      orderWorkflow: initial.orderWorkflow,
    })
    const wrapper = mountPage({ embedded: true })
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
    expect(wrapper.text()).toContain('Товарная позиция уже была изменена другим пользователем')

    await openProductRowActions(wrapper, 8)
    await wrapper.get('[aria-label="Удалить товарную позицию 8"]').trigger('click')
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 8"]').trigger('click')
    await flushPromises()

    expect(mocks.deleteProductRow).toHaveBeenCalledWith({ orderId: 42, productRowId: 8, lockVersion: 1 })
  })

  it('preserves price visibility and server action capabilities when embedded', async () => {
    const redactedRow = withCommercialActions(makeProductRow(7, {
      baseRetailUnitPrice: null,
      baseDealerUnitPrice: null,
      finalRetailUnitPrice: null,
      finalDealerUnitPrice: null,
      retailTotalPrice: null,
      dealerTotalPrice: null,
      isActual: false,
    }))
    const visibleRow = makeProductRow(8, {
      quantity: 3,
      baseRetailUnitPrice: 1500,
      baseDealerUnitPrice: 1200,
      finalRetailUnitPrice: 1400,
      finalDealerUnitPrice: 1100,
      retailTotalPrice: 4200,
      dealerTotalPrice: 3300,
    })
    const commercialResponse = makeOrderResponse(
      [redactedRow, visibleRow],
      { orderTotals: { priceRetail: 4200, priceDealer: 3300 } },
    )
    mocks.listProductRows
      .mockResolvedValueOnce(commercialResponse)
      .mockResolvedValue(commercialResponse)
    mocks.updateProductRow.mockImplementation(payload => Promise.resolve({
      productRow: { ...redactedRow, ...payload },
      orderTotals: commercialResponse.orderTotals,
    }))
    const wrapper = mountPage({ embedded: true })
    await flushPromises()

    expect(wrapper.get('[data-order-total="retail"]').text()).toMatch(/4\s*200/)
    expect(wrapper.get('[data-order-total="dealer"]').text()).toMatch(/3\s*300/)
    expect(wrapper.text()).toContain('Недоступно')
    expect(wrapper.text()).toMatch(/4\s*200/)
    expect(wrapper.find('[aria-label="Добавить товарную позицию в заказ 42"]').exists()).toBe(true)

    await openProductRowActions(wrapper, 7)
    await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    await flushPromises()
    expect(mocks.calculateProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      modelId: '7',
      lockVersion: 4,
    })

    expect(wrapper.find('[aria-label^="Перевести заказ в статус"]').exists()).toBe(false)
    expect(mocks.transitionOrder).not.toHaveBeenCalled()

    mocks.listProductRows.mockResolvedValueOnce({
      ...initial,
      orderWorkflow: {
        statusCode: 'submitted_to_order',
        availableTransitions: [],
        canCreateProductRow: false,
      },
    })
    const lockedWrapper = mountPage({ embedded: true })
    await flushPromises()

    expect(lockedWrapper.find('[aria-label="Добавить товарную позицию в заказ 42"]').exists()).toBe(false)
    expect(lockedWrapper.find('[aria-label^="Перевести заказ в статус"]').exists()).toBe(false)
  })

  it('hides add and checkout controls when the server does not grant them', async () => {
    mocks.listProductRows.mockResolvedValueOnce({
      ...initial,
      orderWorkflow: {
        statusCode: 'submitted_to_order',
        availableTransitions: [],
        canCreateProductRow: false,
      },
    })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[aria-label="Добавить товарную позицию в заказ 42"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label^="Перевести заказ в статус"]').exists()).toBe(false)
  })
})
