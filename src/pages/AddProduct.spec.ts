import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AddProduct from './AddProduct.vue'

const mocks = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  push: vi.fn(),
  createOrder: vi.fn(),
  createOrderItem: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../app/api/wicket', () => ({ createOrder: mocks.createOrder }))
vi.mock('../app/api/orderItems', () => ({ createOrderItem: mocks.createOrderItem }))

const SlotStub = { template: '<div><slot /></div>' }

function mountPage() {
  return mount(AddProduct, {
    global: {
      stubs: {
        B24App: SlotStub,
        B24SidebarLayout: SlotStub,
        B24Button: { props: ['label'], emits: ['click'], template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>' },
      },
    },
  })
}

describe('AddProduct order flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route.query = {}
    mocks.createOrder.mockResolvedValue({ orderId: 42, companyId: null, managerId: 1 })
    mocks.createOrderItem.mockResolvedValue({
      item: { id: 7, orderId: 42 },
      orderTotals: { priceRetail: null, priceDealer: null },
    })
  })

  it('creates an order once for the initial entry and opens its composition', async () => {
    mountPage()
    await flushPromises()

    expect(mocks.createOrder).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith({ name: 'order-items', params: { orderId: 42 } })
  })

  it('announces an initial order creation failure accessibly', async () => {
    mocks.createOrder.mockRejectedValueOnce(new Error('Не удалось создать заказ'))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось создать заказ')
  })

  it('keeps an existing order while choosing a wicket product', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Калитки'))!.trigger('click')

    expect(mocks.createOrder).not.toHaveBeenCalled()
    expect(mocks.createOrderItem).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/model', query: { orderId: '42' } })
  })

  it('keeps a product disabled when the order-item backend does not support it yet', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    const swingButton = wrapper.findAll('button').find(button => button.text().includes('Ворота распашные'))!
    expect(swingButton.attributes('disabled')).toBeDefined()
    expect(swingButton.text()).toContain('Скоро')
    expect(mocks.createOrderItem).not.toHaveBeenCalled()
  })
})
