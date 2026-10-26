import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw, reactive, watch } from 'vue'

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
  getLocks: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
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
  getLocks: mocks.getLocks,
  saveWicketData: mocks.saveWicketData,
  recalculate: mocks.recalculate,
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

function mountPage(stepComponents: Record<string, ReturnType<typeof defineComponent>> = { page7: EmptyStep }) {
  return shallowMount(WicketWizardPage, {
    props: { stepComponents, route: wicketRoute },
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

const guard = vi.fn<() => boolean | Promise<boolean>>()

const GuardedStep = markRaw(defineComponent({
  emits: ['back', 'next'],
  setup(_, { emit, expose }) {
    expose({ validateBeforeLeave: () => guard() })
    return () => h('div', [
      h('button', { 'data-testid': 'back', onClick: () => emit('back') }, 'Назад'),
      h('button', { 'data-testid': 'next', onClick: () => emit('next') }, 'Далее'),
    ])
  },
}))

const MenuStub = defineComponent({
  emits: ['select'],
  template: '<button data-testid="menu-page2" @click="$emit(\'select\', { page: \'page2\' })">page2</button>',
})

const twoPageRoute: WicketRouteDefinition = {
  sections: [],
  menu: () => [],
  validations: () => new Map(),
  next: from => from === 'page7' ? 'page2' : null,
  prev: from => from === 'page2' ? 'page7' : null,
}

function mountNavigationPage() {
  mocks.route.query = { orderId: '42', productRowId: '7' }
  mocks.loadWicketData.mockResolvedValue({
    orderId: 42,
    productRowId: 7,
    modelId: '1',
    activePage: 'page7',
    reachedStep: 'page2',
    visitedPages: ['page7', 'page2'],
  })
  return mount(WicketWizardPage, {
    props: { stepComponents: { page7: GuardedStep, page2: GuardedStep }, route: twoPageRoute },
    global: {
      stubs: {
        App: { template: '<div><slot /></div>' },
        B24App: { template: '<div><slot /></div>' },
        B24Modal: true,
        WicketMenu: MenuStub,
        DrawingPanel: true,
        CalculateTable: true,
        Transition: false,
      },
    },
  })
}

describe('WicketWizardPage guarded navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    guard.mockReset()
    mocks.route = reactive({ path: '/wicket/type1', query: {} })
    mocks.getWicketAccessoryComposition.mockResolvedValue({
      lockVersion: 3,
      lockComponents: [],
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })
    mocks.getLocks.mockResolvedValue({ items: [] })
  })

  it('blocks Back and side-menu navigation when the active step guard returns false', async () => {
    guard.mockReturnValue(false)
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    await flushPromises()
    expect(calc.activePage.value).toBe('page7')

    await wrapper.get('[data-testid="next"]').trigger('click')
    expect(calc.activePage.value).toBe('page2')
    await wrapper.get('[data-testid="back"]').trigger('click')
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(guard).toHaveBeenCalledTimes(2)
  })

  it('awaits the active step guard before a side-menu transition', async () => {
    let resolveGuard!: (allowed: boolean) => void
    guard.mockReturnValue(new Promise(resolve => { resolveGuard = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    expect(calc.activePage.value).toBe('page7')
    resolveGuard(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(guard).toHaveBeenCalledTimes(1)
  })

  it('ignores repeated navigation while the guard is pending', async () => {
    let resolveGuard!: (allowed: boolean) => void
    guard.mockReturnValue(new Promise(resolve => { resolveGuard = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()
    let transitions = 0
    const stop = watch(calc.activePage, () => { transitions += 1 }, { flush: 'sync' })

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    expect(calc.activePage.value).toBe('page7')
    expect(guard).toHaveBeenCalledTimes(1)
    resolveGuard(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(transitions).toBe(1)
    stop()
  })

  it('discards a pending guard from a replaced product row and allows navigation in the new row', async () => {
    let resolveOld!: (allowed: boolean) => void
    guard.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce(true)
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 8,
      modelId: '1',
      activePage: 'page7',
      reachedStep: 'page2',
      visitedPages: ['page7', 'page2'],
    })
    mocks.route.query.productRowId = '8'
    await vi.waitFor(() => expect(calc.productRowId.value).toBe(8))

    resolveOld(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page7')

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(guard).toHaveBeenCalledTimes(2)
  })

  it('does not mutate shared navigation state when a pending guard resolves after unmount', async () => {
    let resolveGuard!: (allowed: boolean) => void
    guard.mockReturnValue(new Promise(resolve => { resolveGuard = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    wrapper.unmount()
    calc.visitedPages.value = ['page7']

    resolveGuard(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page7')
    expect(calc.visitedPages.value).toEqual(['page7'])
  })

  it('discards a pending guard when the active step changes', async () => {
    let resolveGuard!: (allowed: boolean) => void
    guard.mockReturnValue(new Promise(resolve => { resolveGuard = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    calc.setActivePage('page3')
    resolveGuard(true)
    await flushPromises()

    expect(calc.activePage.value).toBe('page3')
  })

  it('keeps the new row navigation pending when an older guard resolves', async () => {
    let resolveOld!: (allowed: boolean) => void
    let resolveNew!: (allowed: boolean) => void
    guard.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveNew = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 8,
      modelId: '1',
      activePage: 'page7',
      reachedStep: 'page2',
      visitedPages: ['page7', 'page2'],
    })
    mocks.route.query.productRowId = '8'
    await vi.waitFor(() => expect(calc.productRowId.value).toBe(8))

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    expect(guard).toHaveBeenCalledTimes(2)
    resolveOld(true)
    await flushPromises()
    await wrapper.get('[data-testid="next"]').trigger('click')
    expect(calc.activePage.value).toBe('page7')

    resolveNew(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(guard).toHaveBeenCalledTimes(2)
  })

  it('blocks Next during a pending menu guard without validating Next', async () => {
    let resolveGuard!: (allowed: boolean) => void
    guard.mockReturnValue(new Promise(resolve => { resolveGuard = resolve }))
    const wrapper = mountNavigationPage()
    await flushPromises()
    const calc = useCalculation()
    let transitions = 0
    const stop = watch(calc.activePage, () => { transitions += 1 }, { flush: 'sync' })

    await wrapper.get('[data-testid="menu-page2"]').trigger('click')
    expect(guard).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-testid="next"]').trigger('click')
    expect(calc.activePage.value).toBe('page7')
    expect(guard).toHaveBeenCalledTimes(1)

    resolveGuard(true)
    await flushPromises()
    expect(calc.activePage.value).toBe('page2')
    expect(transitions).toBe(1)
    stop()
  })

  it('does not invoke the leave guard for the Next event', async () => {
    guard.mockReturnValue(false)
    const wrapper = mountNavigationPage()
    await flushPromises()

    await wrapper.get('[data-testid="next"]').trigger('click')
    expect(useCalculation().activePage.value).toBe('page2')
    expect(guard).not.toHaveBeenCalled()
  })
})

describe('WicketWizardPage mobile summary', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ path: '/wicket/type1', query: {} })
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      reachedStep: 'page7',
      visitedPages: ['page7'],
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
    mocks.getLocks.mockResolvedValue({ items: [] })
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

  it('loads legacy accessory composition without fetching standalone catalogs or showing them in the summary', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.getWicketAccessoryComposition.mockResolvedValue({
      lockVersion: 3,
      lockComponents: [{ materialItemId: 11, relationRole: 'lock_component' }],
      doorClosers: [{ materialItemId: 31, relationRole: 'door_closer' }],
      bumpers: [{ materialItemId: 41, relationRole: 'bumper' }],
      skud: [{ materialItemId: 21, relationRole: 'skud' }],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })

    mountPage()
    await flushPromises()

    expect(mocks.loadWicketData).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, modelId: '1' })
    expect(mocks.getWicketAccessoryComposition).toHaveBeenCalledWith({ orderId: 42, productRowId: 7 })
    expect(mocks.getMaterialItems).not.toHaveBeenCalled()
    const calc = useCalculation()
    const standaloneBlockNames = [
      'Комплектующие замка',
      'Доводчик',
      'Отбойник',
      'СКУД',
    ]
    for (const blockName of standaloneBlockNames) {
      expect(calc.data.value.map(block => block.blockName)).not.toContain(blockName)
    }
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
    expect(calc.providesLock.value).toBe('customer')
    expect(calc.lockInstaller.value).toBe('manufacturer')
    expect(calc.lockComponentIds.value).toEqual([11])
    expect(calc.getAccessorySelections().lockComponents).toEqual([
      { role: 'lock_component', materialItemId: 11, providedByManufacturer: true, installedByManufacturer: false },
    ])
    expect(calc.addons.value.doorCloser).toMatchObject({
      itemId: 31,
      provided: 'customer',
      installed: 'manufacturer',
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
      reachedStep: 'page7',
      visitedPages: ['page7'],
    })

    mountPage()
    await flushPromises()

    const calc = useCalculation()
    expect(calc.lockSetId.value).toBe(9)
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.isThereLockName.value).toBe('Есть')
    expect(calc.providesLock.value).toBe('manufacturer')
    expect(calc.lockInstaller.value).toBe('customer')
    expect(calc.getAccessorySelections().lockComponents).toEqual([])
  })

  it('reconciles a priced page12 reload with the selected lock-set marking before showing its summary', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockSetId: 9,
      lockPenId: 81,
      lockPenColorId: 82,
      lockPenColor: 'Старый цвет',
      priceRetail: '19978.49',
      activePage: 'page12',
      reachedStep: 'page12',
      visitedPages: ['page7', 'page_lock_type', 'page12'],
    })
    mocks.getLocks.mockResolvedValue({
      items: [{
        id: 9,
        marking: 'Комплект из каталога',
        imageUrls: [],
        components: [{ id: 91, name: 'Корпус замка', imageUrls: [] }],
      }],
    })

    mountPage({ page7: EmptyStep, page12: defineComponent({ template: '<div>Итого</div>' }) })
    await flushPromises()

    const calc = useCalculation()
    expect(calc.activePage.value).toBe('page12')
    expect(calc.typeLock.value).toBe('Комплект из каталога')
    expect(calc.lockPenId.value).toBeNull()
    expect(calc.lockPenColorId.value).toBeNull()
    expect(calc.lockPenColor.value).toBe('')
    expect(calc.data.value.find(block => block.blockName === 'Замок')?.params).toContainEqual({
      paramCode: 'lockType', name: 'Тип замка',
      value: 'Комплект из каталога',
    })
    expect(calc.data.value.flatMap(block => block.params)).not.toContainEqual({
      paramCode: 'penColor', name: 'Цвет ручки',
      value: 'Старый цвет',
    })
    expect(mocks.getLocks).toHaveBeenCalledTimes(1)
    expect(mocks.saveWicketData).not.toHaveBeenCalled()
    expect(mocks.recalculate).not.toHaveBeenCalled()
  })

  it('keeps the wicket load usable when the lock-set catalog is temporarily unavailable', async () => {
    mocks.route.query = { orderId: '42', productRowId: '7' }
    mocks.loadWicketData.mockResolvedValue({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      reachedStep: 'page7',
      visitedPages: ['page7'],
      widthProyema: '910',
    })
    mocks.getLocks.mockRejectedValue(new Error('catalog unavailable'))

    const wrapper = mountPage()
    await flushPromises()

    expect(useCalculation().widthProyema.value).toBe('910')
    expect(wrapper.html()).not.toContain('catalog unavailable')
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
        activePage: 'page7',
        visitedPages: ['page7'],
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
      activePage: 'page7',
      visitedPages: ['page7'],
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
        activePage: 'page7',
        visitedPages: ['page7'],
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
      activePage: 'page7',
      visitedPages: ['page7'],
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
      activePage: 'page7',
      visitedPages: ['page7'],
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
      activePage: 'page7',
      visitedPages: ['page7'],
      widthProyema: '420',
    })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(calc.productRowId.value).toBe(15)
    expect(calc.widthProyema.value).toBe('999')
  })
})
