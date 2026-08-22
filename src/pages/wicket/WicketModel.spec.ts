import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import WicketModel from './WicketModel.vue'
import { useCalculation } from '../../composables/useCalculation'

const mocks = vi.hoisted(() => ({
  route: { query: { orderId: '42' } as Record<string, string> } as { query: Record<string, string> },
  push: vi.fn(),
  createOrderItem: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../app/api/orderItems', () => ({ createOrderItem: mocks.createOrderItem }))

const SlotStub = { template: '<div><slot /></div>' }

describe('WicketModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ query: { orderId: '42' } })
    mocks.createOrderItem.mockResolvedValue({
      item: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
  })

  function mountPage() {
    return mount(WicketModel, {
      global: {
        stubs: {
          B24App: SlotStub,
          B24SidebarLayout: SlotStub,
          B24Button: true,
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

  it('atomically creates a wicket item and opens the wizard with both ids', async () => {
    const wrapper = mountPage()
    const type3Button = wrapper.findAll('button').find(button => button.text().includes('штакетник'))!

    await type3Button.trigger('click')
    await flushPromises()

    expect(mocks.createOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      productType: 'wicket',
      modelId: '3',
      model: '"Стандарт" 50/50/штакетник',
    })
    expect(mocks.push).toHaveBeenCalledWith({
      path: '/wicket/type3',
      query: { orderId: '42', orderItemId: '7' },
    })
  })

  it('does not use stale store order identity when orderId is missing from the URL', async () => {
    mocks.route.query = {}
    useCalculation().orderId.value = 99
    const wrapper = mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    await flushPromises()

    expect(mocks.createOrderItem).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Не указан заказ')
  })

  it('ignores a create-item response that arrives after unmount', async () => {
    let resolveItem!: (value: { item: { id: number, orderId: number }, orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.createOrderItem.mockImplementationOnce(() => new Promise(resolve => {
      resolveItem = resolve
    }))
    const wrapper = mountPage()
    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99
    calc.orderItemId.value = 15

    resolveItem({
      item: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(calc.orderItemId.value).toBe(15)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores a create-item response after the order query changes', async () => {
    let resolveItem!: (value: { item: { id: number, orderId: number }, orderTotals: { priceRetail: null, priceDealer: null } }) => void
    mocks.createOrderItem.mockImplementationOnce(() => new Promise(resolve => {
      resolveItem = resolve
    }))
    const wrapper = mountPage()
    await wrapper.findAll('button').find(button => button.text().includes('штакетник'))!.trigger('click')
    mocks.route.query.orderId = '43'
    await flushPromises()

    resolveItem({
      item: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    await flushPromises()

    expect(useCalculation().orderItemId.value).toBeNull()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
