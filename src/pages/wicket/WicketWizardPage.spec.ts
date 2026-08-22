import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import type { OrderItemSummary } from '../../app/api/orderItems'
import { useCalculation } from '../../composables/useCalculation'
import WicketWizardPage from './WicketWizardPage.vue'
import page from './WicketWizardPage.vue?raw'
import type { WicketRouteDefinition } from './wicketRoute'

const mocks = vi.hoisted(() => ({
  route: { path: '/wicket/type1', query: {} as Record<string, string> } as {
    path: string
    query: Record<string, string>
  },
  replace: vi.fn(),
  loadWicketData: vi.fn(),
  getAddonList: vi.fn(),
  listOrderItems: vi.fn(),
  createOrder: vi.fn(),
  createLegacyWicketMainMenu: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('../../app/api/wicket', () => ({
  loadWicketData: mocks.loadWicketData,
  getAddonList: mocks.getAddonList,
  createOrder: mocks.createOrder,
  createLegacyWicketMainMenu: mocks.createLegacyWicketMainMenu,
}))

vi.mock('../../app/api/orderItems', () => ({ listOrderItems: mocks.listOrderItems }))

const EmptyStep = defineComponent({ template: '<div>Шаг</div>' })
const wicketRoute: WicketRouteDefinition = {
  sections: [],
  menu: () => [],
  validations: () => new Map(),
  next: () => null,
  prev: () => null,
}

function makeItem(overrides: Partial<OrderItemSummary> = {}): OrderItemSummary {
  return {
    id: 7,
    orderId: 42,
    productType: 'wicket',
    modelId: '1',
    quantity: 1,
    sortOrder: 10,
    status: { id: 1, code: 'draft', name: 'Черновик', color: null },
    baseRetailUnitPrice: null,
    baseDealerUnitPrice: null,
    finalRetailUnitPrice: null,
    finalDealerUnitPrice: null,
    retailTotalPrice: null,
    dealerTotalPrice: null,
    adjustmentType: 'none',
    adjustmentValue: 0,
    adjustmentUnit: 'percent',
    plannedCompletionAt: null,
    lastCalculatedAt: null,
    isActual: false,
    calculationError: null,
    lockVersion: 1,
    allowedActions: [],
    ...overrides,
  }
}

function mountPage() {
  return shallowMount(WicketWizardPage, {
    props: { stepComponents: { page1: EmptyStep }, route: wicketRoute },
    global: {
      stubs: {
        B24App: { template: '<div><slot /></div>' },
        B24Modal: true,
        WicketMenu: true,
        DrawingPanel: true,
        CalculateTable: true,
        Transition: false,
      },
    },
  })
}

describe('WicketWizardPage mobile summary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ path: '/wicket/type1', query: {} })
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
      reachedStep: 'page1',
      visitedPages: ['page1'],
    })
    mocks.getAddonList.mockResolvedValue({ items: [] })
    mocks.listOrderItems.mockResolvedValue({
      items: [makeItem()],
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    Reflect.deleteProperty(window, '_PARAMS_')
  })

  it('starts below the application header', () => {
    expect(page).toContain(
      "['fixed top-[50px] bottom-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200'",
    )
    expect(page).not.toContain(
      "['fixed inset-y-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200'",
    )
  })

  it('loads strict item context from the URL without creating another order or configuration', async () => {
    mocks.route.query = { orderId: '42', orderItemId: '7' }

    mountPage()
    await flushPromises()

    expect(mocks.loadWicketData).toHaveBeenCalledWith({ orderId: 42, orderItemId: 7, modelId: '1' })
    expect(mocks.createOrder).not.toHaveBeenCalled()
    expect(mocks.createLegacyWicketMainMenu).not.toHaveBeenCalled()
  })

  it('clears fields from the previously opened item before loading the requested item', async () => {
    mocks.route.query = { orderId: '42', orderItemId: '7' }
    const calc = useCalculation()
    calc.widthProyema.value = '999'

    mountPage()
    await flushPromises()

    expect(calc.widthProyema.value).toBe('')
    expect(calc.orderId.value).toBe(42)
    expect(calc.orderItemId.value).toBe(7)
  })

  it('resolves a sole legacy order item and canonicalizes the wizard URL', async () => {
    window._PARAMS_ = {
      placement: 'DEFAULT',
      placementOptions: {
        type: 'openApplication',
        title: '',
        entity: '',
        viewMode: 'view' as TPlacementOptions['viewMode'],
        id: '42',
        modelId: '1',
      },
    }

    mountPage()
    await flushPromises()

    expect(mocks.listOrderItems).toHaveBeenCalledWith(42)
    expect(mocks.replace).toHaveBeenCalledWith({
      path: '/wicket/type1',
      query: { orderId: '42', orderItemId: '7' },
    })
    expect(mocks.loadWicketData).toHaveBeenCalledWith({ orderId: 42, orderItemId: 7, modelId: '1' })
  })

  it('does not let stale singleton context override an explicit legacy order id', async () => {
    mocks.route.query = { orderId: '42' }
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.orderItemId.value = 15
    calc.modelId.value = '1'

    mountPage()
    await flushPromises()

    expect(mocks.listOrderItems).toHaveBeenCalledWith(42)
    expect(mocks.loadWicketData).toHaveBeenCalledWith({ orderId: 42, orderItemId: 7, modelId: '1' })
  })

  it('does not use stale store identity for queryless direct wizard navigation', async () => {
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.orderItemId.value = 15
    calc.modelId.value = '1'
    calc.widthProyema.value = '999'

    mountPage()
    await flushPromises()

    expect(mocks.listOrderItems).not.toHaveBeenCalled()
    expect(mocks.loadWicketData).not.toHaveBeenCalled()
    expect(calc.orderId.value).toBeNull()
    expect(calc.orderItemId.value).toBeNull()
    expect(calc.widthProyema.value).toBe('')
  })

  it('reinitializes on item-context change and ignores the previous load response', async () => {
    let resolveOld!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', orderItemId: '7' }
    mocks.loadWicketData.mockImplementation((context: { orderId: number }) => {
      if (context.orderId === 42) {
        return new Promise(resolve => {
          resolveOld = resolve
        })
      }
      return Promise.resolve({
        orderId: 43,
        orderItemId: 8,
        modelId: '1',
        activePage: 'page1',
        visitedPages: ['page1'],
        widthProyema: '430',
      })
    })
    mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))

    mocks.route.query.orderId = '43'
    mocks.route.query.orderItemId = '8'
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(2))
    await flushPromises()

    resolveOld({
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    const calc = useCalculation()
    expect(calc.orderId.value).toBe(43)
    expect(calc.orderItemId.value).toBe(8)
    expect(calc.widthProyema.value).toBe('430')
  })

  it('reinitializes when the model route changes and ignores the previous model load', async () => {
    let resolveOld!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', orderItemId: '7' }
    mocks.loadWicketData.mockImplementation((context: { modelId: string }) => {
      if (context.modelId === '1') {
        return new Promise(resolve => {
          resolveOld = resolve
        })
      }
      return Promise.resolve({
        orderId: 42,
        orderItemId: 7,
        modelId: '2',
        activePage: 'page1',
        visitedPages: ['page1'],
        widthProyema: '520',
      })
    })
    mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))

    mocks.route.path = '/wicket/type2'
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      modelId: '2',
    }))
    await flushPromises()

    resolveOld({
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    const calc = useCalculation()
    expect(calc.modelId.value).toBe('2')
    expect(calc.widthProyema.value).toBe('520')
  })

  it('ignores a stale legacy list response after explicit item navigation', async () => {
    let resolveLegacy!: (value: { items: OrderItemSummary[], orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.route.query = { orderId: '42' }
    mocks.listOrderItems.mockImplementationOnce(() => new Promise(resolve => {
      resolveLegacy = resolve
    }))
    mountPage()
    await vi.waitFor(() => expect(mocks.listOrderItems).toHaveBeenCalledWith(42))

    mocks.route.query.orderId = '43'
    mocks.route.query.orderItemId = '8'
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledWith({
      orderId: 43,
      orderItemId: 8,
      modelId: '1',
    }))

    resolveLegacy({
      items: [makeItem()],
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalledWith({
      path: '/wicket/type1',
      query: { orderId: '42', orderItemId: '7' },
    })
    expect(useCalculation().orderId.value).toBe(43)
    expect(useCalculation().orderItemId.value).toBe(8)
  })

  it('does not apply a load response after unmount', async () => {
    let resolveLoad!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', orderItemId: '7' }
    mocks.loadWicketData.mockImplementationOnce(() => new Promise(resolve => {
      resolveLoad = resolve
    }))
    const wrapper = mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.orderItemId.value = 15
    calc.widthProyema.value = '999'

    resolveLoad({
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(calc.orderItemId.value).toBe(15)
    expect(calc.widthProyema.value).toBe('999')
  })
})
