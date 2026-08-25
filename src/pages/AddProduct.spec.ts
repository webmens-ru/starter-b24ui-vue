import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AddProduct from './AddProduct.vue'
import { useCalculation } from '../composables/useCalculation'

const mocks = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> } as { query: Record<string, string> },
  push: vi.fn(),
  createOrder: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../app/api/wicket', () => ({ createOrder: mocks.createOrder }))

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
    mocks.route = reactive({ query: {} })
    mocks.createOrder.mockResolvedValue({ orderId: 42, companyId: null, managerId: 1 })
  })

  it('creates an order once for the initial entry and opens its composition', async () => {
    mountPage()
    await flushPromises()

    expect(mocks.createOrder).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith({ name: 'product-rows', params: { orderId: 42 } })
  })

  it.each([' ', '01', '1e2', '0x2a', '9007199254740992'])(
    'does not create or navigate for malformed order id %j',
    async (orderId) => {
      mocks.route.query = { orderId }
      const wrapper = mountPage()
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Некорректный номер заказа')
      expect(mocks.createOrder).not.toHaveBeenCalled()
      expect(mocks.push).not.toHaveBeenCalled()
    },
  )

  it('announces an initial order creation failure accessibly', async () => {
    mocks.createOrder.mockRejectedValueOnce(new Error('Не удалось создать заказ'))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось создать заказ')
  })

  it('explains that a product row needs an order before product selection', async () => {
    mocks.createOrder.mockRejectedValueOnce(new Error('Не удалось создать заказ'))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Калитки'))!.trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('Не указан заказ для добавления товарной позиции')
  })

  it('ignores a create-order response that arrives after unmount', async () => {
    let resolveOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveOrder = resolve
    }))
    const wrapper = mountPage()
    await Promise.resolve()
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99

    resolveOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores a create-order response after navigation supplies another order', async () => {
    let resolveOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveOrder = resolve
    }))
    mountPage()
    await Promise.resolve()

    mocks.route.query.orderId = '43'
    await flushPromises()
    resolveOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(useCalculation().orderId.value).toBe(43)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('keeps an existing order while choosing a wicket product', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Калитки'))!.trigger('click')

    expect(mocks.createOrder).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/model', query: { orderId: '42' } })
  })

  it('keeps a product disabled when the product-row backend does not support it yet', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    const swingButton = wrapper.findAll('button').find(button => button.text().includes('Ворота распашные'))!
    expect(swingButton.attributes('disabled')).toBeDefined()
    expect(swingButton.text()).toContain('Скоро')
  })
})
