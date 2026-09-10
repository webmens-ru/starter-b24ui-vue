import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'

import { useCalculation } from '../../composables/useCalculation'
import WicketWizardPage from './WicketWizardPage.vue'
import page from './WicketWizardPage.vue?raw'
import type { WicketRouteDefinition } from './wicketRoute'

const mocks = vi.hoisted(() => ({
  route: { path: '/wicket/type1', query: {} as Record<string, unknown> } as {
    path: string
    query: Record<string, unknown>
  },
  replace: vi.fn(),
  loadWicketData: vi.fn(),
  getWicketAccessoryComposition: vi.fn(),
  getMaterialItems: vi.fn(),
  listProductRows: vi.fn(),
  onWicketProductRowLockConflict: vi.fn(),
  navigateToProductRows: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('../../app/api/wicket', () => ({
  loadWicketData: mocks.loadWicketData,
  getWicketAccessoryComposition: mocks.getWicketAccessoryComposition,
  loadCoherentWicketState: async (context: { orderId: number, productRowId: number, modelId: string }) => ({
    wicketData: await mocks.loadWicketData(context),
    accessoryComposition: await mocks.getWicketAccessoryComposition({
      orderId: context.orderId,
      productRowId: context.productRowId,
    }),
  }),
  getMaterialItems: mocks.getMaterialItems,
  onWicketProductRowLockConflict: mocks.onWicketProductRowLockConflict,
}))

vi.mock('../../app/api/productRows', () => ({ listProductRows: mocks.listProductRows }))
vi.mock('../../app/productRowReturnNavigation', () => ({ navigateToProductRows: mocks.navigateToProductRows }))

const EmptyStep = defineComponent({ template: '<div>Шаг</div>' })
const wicketRoute: WicketRouteDefinition = {
  sections: [],
  menu: () => [],
  validations: () => new Map(),
  next: () => null,
  prev: () => null,
}

function mountPage() {
  return shallowMount(WicketWizardPage, {
    props: { stepComponents: { page1: EmptyStep }, route: wicketRoute },
    global: {
      stubs: {
        App: { template: '<div><slot /></div>' },
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
      productRowId: 7,
      modelId: '1',
      reachedStep: 'page1',
      visitedPages: ['page1'],
    })
    mocks.getWicketAccessoryComposition.mockResolvedValue({
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })
    mocks.getMaterialItems.mockResolvedValue([])
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

  it('loads strict product row context from the URL without creating another order or configuration', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }

    mountPage()
    await flushPromises()

    expect(mocks.loadWicketData).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, modelId: '1' })
    expect(mocks.getWicketAccessoryComposition).toHaveBeenCalledWith({ orderId: 42, productRowId: 7 })
    expect(mocks.getMaterialItems).toHaveBeenCalledTimes(3)
    expect(mocks.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'door_closer', productType: 'wicket', modelId: 1 })
    expect(mocks.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'bumper', productType: 'wicket', modelId: 1 })
    expect(mocks.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'skud', productType: 'wicket', modelId: 1 })
  })

  it('mixed reload keeps root lock-set branches separate from canonical standalone rows', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockSetId: 9,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет изготовитель',
      lockComponentIds: '[999]',
      doorCloserId: 998,
    })
    mocks.getWicketAccessoryComposition.mockResolvedValue({
      lockVersion: 4,
      lockComponents: [{ materialItemId: 11, relationRole: 'lock_component' }],
      skud: [],
      doorClosers: [{ materialItemId: 31, relationRole: 'door_closer_installation' }],
      bumpers: [],
      orderTotals: { priceRetail: 100, priceDealer: 90 },
    })

    mountPage()
    await flushPromises()

    const calc = useCalculation()
    expect(calc.lockSetId.value).toBe(9)
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.isThereLockName.value).toBe('Есть')
    expect(calc.providesLock.value).toBe('Предоставляет заказчик')
    expect(calc.lockInstaller.value).toBe('Выполняет изготовитель')
    expect(calc.lockComponentIds.value).toEqual([11])
    expect(calc.getAccessorySelections().lockComponents).toEqual([
      { role: 'lock_component', materialItemId: 11, providedByManufacturer: true, installedByManufacturer: false },
    ])
    expect(calc.addons.value.doorCloser).toMatchObject({
      itemId: 31,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает изготовитель',
    })
  })

  it('set-only reload derives presence and branches from the saved wicket root', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockSetId: 9,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет заказчик',
      reachedStep: 'page1',
      visitedPages: ['page1'],
    })

    mountPage()
    await flushPromises()

    const calc = useCalculation()
    expect(calc.lockSetId.value).toBe(9)
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.isThereLockName.value).toBe('Есть')
    expect(calc.providesLock.value).toBe('Предоставляет изготовитель')
    expect(calc.lockInstaller.value).toBe('Выполняет заказчик')
    expect(calc.getAccessorySelections().lockComponents).toEqual([])
  })

  it('shows a reload-required modal for a lock conflict in the open product row', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    const wrapper = mountPage()
    await flushPromises()

    expect(mocks.onWicketProductRowLockConflict).toHaveBeenCalled()
    const listener = mocks.onWicketProductRowLockConflict.mock.calls[0]?.[0] as (context: {
      orderId: number
      productRowId: number
      modelId: string
    }) => void
    listener({ orderId: 42, productRowId: 7, modelId: '1' })
    await flushPromises()

    expect(wrapper.html()).toContain('Требуется перезагрузка')
    expect(wrapper.html()).toContain('Данные товарной позиции изменились')
  })

  it('reloads canonical children once and shows an explicit notice after a composition conflict', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    const wrapper = mountPage()
    await flushPromises()
    mocks.getWicketAccessoryComposition.mockClear()
    mocks.getWicketAccessoryComposition.mockResolvedValue({
      lockVersion: 6,
      lockComponents: [{ materialItemId: 55, relationRole: 'lock_component' }],
      skud: [], doorClosers: [], bumpers: [], orderTotals: { priceRetail: 1, priceDealer: 1 },
    })
    const listener = mocks.onWicketProductRowLockConflict.mock.calls[0]?.[0] as (context: {
      orderId: number
      productRowId: number
      modelId: string
    }) => void

    listener({ orderId: 42, productRowId: 7, modelId: 'accessory-composition' })
    await flushPromises()

    expect(mocks.getWicketAccessoryComposition).toHaveBeenCalledTimes(1)
    expect(useCalculation().lockComponentIds.value).toEqual([55])
    expect(wrapper.html()).toContain('Требуется перезагрузка')
  })

  it('ignores a deferred conflict reload after navigating to another product row', async () => {
    let resolveConflict!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mountPage()
    await flushPromises()
    mocks.getWicketAccessoryComposition.mockClear()
    mocks.getWicketAccessoryComposition.mockImplementation((context: { productRowId: number }) => {
      if (context.productRowId === 7) return new Promise(resolve => { resolveConflict = resolve })
      return Promise.resolve({
        lockVersion: 10,
        lockComponents: [{ materialItemId: 88, relationRole: 'lock_component' }],
        skud: [], doorClosers: [], bumpers: [], orderTotals: { priceRetail: 0, priceDealer: 0 },
      })
    })
    const listener = mocks.onWicketProductRowLockConflict.mock.calls[0]?.[0] as (context: {
      orderId: number
      productRowId: number
      modelId: string
    }) => void

    listener({ orderId: 42, productRowId: 7, modelId: 'accessory-composition' })
    mocks.route.query.productRowId = '8'
    await vi.waitFor(() => expect(useCalculation().productRowId.value).toBe(8))
    resolveConflict({
      lockVersion: 9,
      lockComponents: [{ materialItemId: 77, relationRole: 'lock_component' }],
      skud: [], doorClosers: [], bumpers: [], orderTotals: { priceRetail: 0, priceDealer: 0 },
    })
    await flushPromises()

    expect(useCalculation().lockComponentIds.value).toEqual([88])
  })

  it('clears fields from the previously opened product row before loading the requested product row', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    const calc = useCalculation()
    calc.widthProyema.value = '999'

    mountPage()
    await flushPromises()

    expect(calc.widthProyema.value).toBe('')
    expect(calc.orderId.value).toBe(42)
    expect(calc.productRowId.value).toBe(7)
  })

  it('redirects an order without a product row to its product rows page without loading configuration', async () => {
    mocks.route.query = { orderId: '42' }

    const wrapper = mountPage()
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.listProductRows).not.toHaveBeenCalled()
    expect(mocks.loadWicketData).not.toHaveBeenCalled()

    mocks.route.query = { orderId: '42', productRowId: null }
    await flushPromises()

    expect(wrapper.html(), 'undefined-to-null productRowId transition').toContain('Некорректный контекст товарной позиции')
    expect(mocks.navigateToProductRows, 'undefined-to-null productRowId transition').toHaveBeenCalledTimes(1)
    expect(mocks.getMaterialItems, 'undefined-to-null productRowId transition').not.toHaveBeenCalled()
    expect(mocks.loadWicketData, 'undefined-to-null productRowId transition').not.toHaveBeenCalled()
  })

  it('redirects a wizard URL without an order to add-product without loading configuration', async () => {
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.productRowId.value = 15
    calc.modelId.value = '1'
    calc.widthProyema.value = '999'

    mountPage()
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.listProductRows).not.toHaveBeenCalled()
    expect(mocks.loadWicketData).not.toHaveBeenCalled()
    expect(calc.orderId.value).toBeNull()
    expect(calc.productRowId.value).toBeNull()
    expect(calc.widthProyema.value).toBe('')

    const malformedContexts: Array<{ label: string, query: Record<string, unknown> }> = [
      { label: 'null orderId', query: { orderId: null, productRowId: '7' } },
      { label: 'leading-zero orderId', query: { orderId: '01', productRowId: '7' } },
      { label: 'array productRowId', query: { orderId: '42', productRowId: [] } },
      { label: 'unsafe productRowId', query: { orderId: '42', productRowId: '9007199254740992' } },
    ]
    for (const testCase of malformedContexts) {
      setActivePinia(createPinia())
      vi.clearAllMocks()
      mocks.route = reactive({ path: '/wicket/type1', query: testCase.query })
      const malformedWrapper = mountPage()
      await flushPromises()

      expect(malformedWrapper.html(), testCase.label).toContain('Некорректный контекст товарной позиции')
      expect(mocks.navigateToProductRows, testCase.label).not.toHaveBeenCalled()
      expect(mocks.getMaterialItems, testCase.label).not.toHaveBeenCalled()
      expect(mocks.loadWicketData, testCase.label).not.toHaveBeenCalled()
      malformedWrapper.unmount()
    }
  })

  it('reinitializes on product row context change and ignores the previous load response', async () => {
    let resolveOld!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockImplementation((context: { orderId: number }) => {
      if (context.orderId === 42) {
        return new Promise(resolve => {
          resolveOld = resolve
        })
      }
      return Promise.resolve({
        orderId: 43,
        productRowId: 8,
        modelId: '1',
        activePage: 'page1',
        visitedPages: ['page1'],
        widthProyema: '430',
      })
    })
    mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))

    mocks.route.query.orderId = '43'
    mocks.route.query.productRowId = '8'
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(2))
    await flushPromises()

    resolveOld({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    const calc = useCalculation()
    expect(calc.orderId.value).toBe(43)
    expect(calc.productRowId.value).toBe(8)
    expect(calc.widthProyema.value).toBe('430')
  })

  it('ignores a stale composition response after the product row route changes', async () => {
    let resolveOld!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.getWicketAccessoryComposition.mockImplementation((context: { productRowId: number }) => {
      if (context.productRowId === 7) return new Promise(resolve => { resolveOld = resolve })
      return Promise.resolve({
        lockVersion: 5,
        lockComponents: [{ materialItemId: 88, relationRole: 'lock_component' }],
        skud: [], doorClosers: [], bumpers: [], orderTotals: { priceRetail: 0, priceDealer: 0 },
      })
    })
    mountPage()
    await vi.waitFor(() => expect(mocks.getWicketAccessoryComposition).toHaveBeenCalledTimes(1))

    mocks.route.query.productRowId = '8'
    await vi.waitFor(() => expect(mocks.getWicketAccessoryComposition).toHaveBeenCalledTimes(2))
    await flushPromises()
    resolveOld({
      lockVersion: 4,
      lockComponents: [{ materialItemId: 77, relationRole: 'lock_component' }],
      skud: [], doorClosers: [], bumpers: [], orderTotals: { priceRetail: 0, priceDealer: 0 },
    })
    await flushPromises()

    expect(useCalculation().productRowId.value).toBe(8)
    expect(useCalculation().lockComponentIds.value).toEqual([88])
  })

  it('reinitializes when the model route changes and ignores the previous model load', async () => {
    let resolveOld!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockImplementation((context: { modelId: string }) => {
      if (context.modelId === '1') {
        return new Promise(resolve => {
          resolveOld = resolve
        })
      }
      return Promise.resolve({
        orderId: 42,
        productRowId: 7,
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
      productRowId: 7,
      modelId: '2',
    }))
    await flushPromises()

    resolveOld({
      orderId: 42,
      productRowId: 7,
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

  it('does not apply a stale configuration response after the context becomes malformed', async () => {
    let resolveLoad!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockImplementationOnce(() => new Promise(resolve => {
      resolveLoad = resolve
    }))
    const wrapper = mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))

    mocks.route.query.productRowId = ''
    await flushPromises()
    expect(wrapper.html()).toContain('Некорректный контекст товарной позиции')

    resolveLoad({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.listProductRows).not.toHaveBeenCalled()
    expect(useCalculation().orderId.value).toBeNull()
    expect(useCalculation().productRowId.value).toBeNull()
    expect(useCalculation().widthProyema.value).toBe('')
  })


  it('does not apply a load response after unmount', async () => {
    let resolveLoad!: (value: Record<string, unknown>) => void
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockImplementationOnce(() => new Promise(resolve => {
      resolveLoad = resolve
    }))
    const wrapper = mountPage()
    await vi.waitFor(() => expect(mocks.loadWicketData).toHaveBeenCalledTimes(1))
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.productRowId.value = 15
    calc.widthProyema.value = '999'

    resolveLoad({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      activePage: 'page1',
      visitedPages: ['page1'],
      widthProyema: '420',
    })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(calc.productRowId.value).toBe(15)
    expect(calc.widthProyema.value).toBe('999')
  })
})
