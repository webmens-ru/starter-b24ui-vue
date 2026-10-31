import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import WicketModel from './WicketModel.vue'
import { useCalculation } from '../../composables/useCalculation'

const mocks = vi.hoisted(() => ({
  route: { query: { orderId: '42' } as Record<string, unknown> } as { query: Record<string, unknown> },
  push: vi.fn(),
  createProductRow: vi.fn(),
  getWicketModelNames: vi.fn(),
  navigateToProductRows: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../app/api/wicket', () => ({ getWicketModelNames: mocks.getWicketModelNames }))

vi.mock('../../app/api/productRows', () => ({ createProductRow: mocks.createProductRow }))
vi.mock('../../app/productRowReturnNavigation', () => ({ navigateToProductRows: mocks.navigateToProductRows }))

const SlotStub = { template: '<div><slot /></div>' }

describe('WicketModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.getWicketModelNames.mockResolvedValue([])
    mocks.route = reactive({ query: { orderId: '42' } })
    mocks.createProductRow.mockResolvedValue({
      productRow: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
  })

  function mountPage() {
    return mount(WicketModel, {
      global: {
        stubs: {
          B24App: SlotStub,
          B24SidebarLayout: SlotStub,
          B24Button: { props: ['label'], emits: ['click'], template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>' },
          B24Modal: true,
          Teleport: true,
          Transition: false,
        },
      },
    })
  }

  it('делает третий тип доступным без метки «Скоро»', () => {
    const wrapper = mountPage()

    const type3Button = wrapper.findAll('button').find(button => button.text().includes('штакетник'))

    expect(type3Button).toBeDefined()
    expect(type3Button?.attributes('disabled')).toBeUndefined()
    expect(type3Button?.text()).not.toContain('Скоро')
  })

  it('opens type 4 without a coming-soon flag and preserves routing after renaming', async () => {
    mocks.getWicketModelNames.mockResolvedValue([{ modelId: '4', name: 'Переименованная ламельная калитка' }])
    const wrapper = mountPage()
    await flushPromises()
    const button = wrapper.findAll('button').find(item => item.text().includes('Переименованная ламельная калитка'))!
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).not.toContain('Скоро')
    await button.trigger('click')
    await flushPromises()
    expect(mocks.createProductRow).toHaveBeenCalledWith(expect.objectContaining({ modelId: '4' }))
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/type4', query: { orderId: '42', productRowId: '7' } })
  })

  it('opens type 5 after a caption rename without a coming-soon restriction', async () => {
    mocks.getWicketModelNames.mockResolvedValue([{ modelId: '5', name: 'Переименованная СП40' }])
    const wrapper = mountPage()
    await flushPromises()
    const button = wrapper.findAll('button').find(item => item.text().includes('Переименованная СП40'))!
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).not.toContain('Скоро')
    await button.trigger('click')
    await flushPromises()
    expect(mocks.createProductRow).toHaveBeenCalledWith(expect.objectContaining({ modelId: '5' }))
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/type5', query: { orderId: '42', productRowId: '7' } })
  })

  it('opens type 7 after a caption rename without a coming-soon restriction', async () => {
    mocks.getWicketModelNames.mockResolvedValue([{ modelId: '7', name: 'Переименованная СП40' }])
    const wrapper = mountPage()
    await flushPromises()
    const button = wrapper.findAll('button').find(item => item.text().includes('Переименованная СП40'))!
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).not.toContain('Скоро')
    await button.trigger('click')
    await flushPromises()
    expect(mocks.createProductRow).toHaveBeenCalledWith(expect.objectContaining({ modelId: '7' }))
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/type7', query: { orderId: '42', productRowId: '7' } })
  })

  it('enables model 6 between 5 and 7 and routes by identity after a caption rename', async () => {
    mocks.getWicketModelNames.mockResolvedValue([
      { modelId: '5', name: 'Предыдущая модель' },
      { modelId: '6', name: 'Переименованная модель' },
      { modelId: '7', name: 'Следующая модель' },
    ])
    const wrapper = mountPage()
    await flushPromises()
    const buttons = wrapper.findAll('button')
    const index = buttons.findIndex(item => item.text() === 'Переименованная модель')
    expect(index).toBeGreaterThan(-1)
    const button = buttons[index]!
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).not.toContain('Скоро')
    expect(buttons.findIndex(item => item.text() === 'Предыдущая модель')).toBeLessThan(index)
    expect(buttons.findIndex(item => item.text().includes('Следующая модель'))).toBeGreaterThan(index)
    await button.trigger('click')
    await flushPromises()
    expect(mocks.createProductRow).toHaveBeenCalledWith(expect.objectContaining({ modelId: '6' }))
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/type6', query: { orderId: '42', productRowId: '7' } })
  })

  it('uses editable labels while routing by the same stable model id', async () => {
    mocks.getWicketModelNames.mockResolvedValue([{ modelId: '3', name: 'Новое название модели' }])
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text().includes('Новое название модели'))!.trigger('click')
    await flushPromises()
    expect(mocks.createProductRow).toHaveBeenCalledWith(expect.objectContaining({ modelId: '3', model: 'Новое название модели' }))
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/type3', query: { orderId: '42', productRowId: '7' } })
  })

  it('loads model images from the public web root', () => {
    const wrapper = mountPage()
    const sources = wrapper.findAll('img').map(image => image.attributes('src'))

    expect(sources.length).toBeGreaterThan(0)
    expect(sources.every(source => source != null && source.startsWith('/') && !source.startsWith('/web/'))).toBe(true)
  })

  it('creates a wicket product row and opens the wizard with both ids', async () => {
    const wrapper = mountPage()
    const type3Button = wrapper.findAll('button').find(button => button.text().includes('штакетник'))!

    await type3Button.trigger('click')
    await flushPromises()

    expect(mocks.createProductRow).toHaveBeenCalledWith({
      orderId: 42,
      productType: 'wicket',
      modelId: '3',
      model: 'Калитка «Стандарт» 50/50/штакетник',
    })
    expect(mocks.push).toHaveBeenCalledWith({
      path: '/wicket/type3',
      query: { orderId: '42', productRowId: '7' },
    })
  })

  it('returns through the server-owned URL from the model picker', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Назад'))!.trigger('click')

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'product-rows' }))
  })

  it('does not use stale store identity or malformed direct order ids', async () => {
    const cases: Array<{ label: string, query: Record<string, unknown>, message: string }> = [
      { label: 'missing orderId', query: {}, message: 'Не указан заказ' },
      { label: 'null orderId', query: { orderId: null }, message: 'Некорректный номер заказа' },
      { label: 'empty orderId', query: { orderId: '' }, message: 'Некорректный номер заказа' },
      { label: 'array orderId', query: { orderId: [] }, message: 'Некорректный номер заказа' },
      { label: 'array decimal orderId', query: { orderId: ['42'] }, message: 'Некорректный номер заказа' },
      { label: 'leading-zero orderId', query: { orderId: '01' }, message: 'Некорректный номер заказа' },
      { label: 'exponent orderId', query: { orderId: '1e2' }, message: 'Некорректный номер заказа' },
      { label: 'hex orderId', query: { orderId: '0x2a' }, message: 'Некорректный номер заказа' },
      { label: 'unsafe orderId', query: { orderId: '9007199254740992' }, message: 'Некорректный номер заказа' },
    ]

    for (const testCase of cases) {
      setActivePinia(createPinia())
      vi.clearAllMocks()
      mocks.route = reactive({ query: testCase.query })
      useCalculation().orderId.value = 99
      const wrapper = mountPage()

      await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text(), testCase.label).toContain(testCase.message)
      expect(mocks.createProductRow, testCase.label).not.toHaveBeenCalled()
      expect(mocks.push, testCase.label).not.toHaveBeenCalled()
      wrapper.unmount()
    }
  })

  it('ignores a create-product-row response that arrives after unmount', async () => {
    let resolveItem!: (value: { productRow: { id: number, orderId: number }, orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.createProductRow.mockImplementationOnce(() => new Promise(resolve => {
      resolveItem = resolve
    }))
    const wrapper = mountPage()
    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.productRowId.value = 15

    resolveItem({
      productRow: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(calc.productRowId.value).toBe(15)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores a create-product-row response after the order query changes', async () => {
    let resolveItem!: (value: { productRow: { id: number, orderId: number }, orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.createProductRow.mockImplementationOnce(() => new Promise(resolve => {
      resolveItem = resolve
    }))
    const wrapper = mountPage()
    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    mocks.route.query.orderId = '43'
    await flushPromises()

    resolveItem({
      productRow: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(useCalculation().productRowId.value).toBeNull()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores a late product-row response after returning to the product rows', async () => {
    let resolveItem!: (value: { productRow: { id: number, orderId: number }, orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.createProductRow.mockImplementationOnce(() => new Promise(resolve => {
      resolveItem = resolve
    }))
    const wrapper = mountPage()
    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('Назад'))!.trigger('click')

    resolveItem({
      productRow: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(useCalculation().productRowId.value).toBeNull()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
