import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AddProduct from './AddProduct.vue'
import { useCalculation } from '../composables/useCalculation'

const mocks = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> } as { query: Record<string, unknown> },
  push: vi.fn(),
  createOrder: vi.fn(),
  navigateToProductRows: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../app/api/wicket', () => ({ createOrder: mocks.createOrder }))
vi.mock('../app/productRowReturnNavigation', () => ({ navigateToProductRows: mocks.navigateToProductRows }))

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

  it('creates an order once for the initial entry and returns through the server URL', async () => {
    mountPage()
    await flushPromises()

    expect(mocks.createOrder).toHaveBeenCalledTimes(1)
    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'product-rows' }))
  })

  it('uses the server-owned return navigation when cancelled', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Назад'))!.trigger('click')

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'product-rows' }))
  })

  it.each([
    { label: 'whitespace or null', orderIds: [' ', null] },
    { label: 'leading-zero or empty', orderIds: ['01', ''] },
    { label: 'exponent or array', orderIds: ['1e2', []] },
    { label: 'hex or decimal array', orderIds: ['0x2a', ['42']] },
    { label: 'unsafe', orderIds: ['9007199254740992'] },
  ])(
    'does not create or navigate for malformed order ids $label',
    async ({ orderIds }) => {
      for (const orderId of orderIds) {
        mocks.route.query = { orderId }
        const wrapper = mountPage()
        await flushPromises()

        expect(wrapper.get('[role="alert"]').text(), `malformed orderId ${JSON.stringify(orderId)}`)
          .toContain('Некорректный номер заказа')
        expect(mocks.createOrder, `malformed orderId ${JSON.stringify(orderId)}`).not.toHaveBeenCalled()
        expect(mocks.push, `malformed orderId ${JSON.stringify(orderId)}`).not.toHaveBeenCalled()
        wrapper.unmount()
      }
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
    wrapper.unmount()

    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ query: { orderId: null } })
    const malformedWrapper = mountPage()
    await flushPromises()

    await malformedWrapper.findAll('button').find(button => button.text().includes('Калитки'))!.trigger('click')

    expect(malformedWrapper.get('[role="alert"]').text(), 'malformed orderId product selection')
      .toContain('Некорректный номер заказа')
    expect(mocks.createOrder, 'malformed orderId product selection').not.toHaveBeenCalled()
    expect(mocks.push, 'malformed orderId product selection').not.toHaveBeenCalled()
  })

  it('ignores a create-order response that arrives after unmount', async () => {
    let resolveMalformedOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveMalformedOrder = resolve
    }))
    const wrapper = mountPage()
    await Promise.resolve()
    wrapper.unmount()
    const calc = useCalculation()
    calc.orderId.value = 99

    resolveMalformedOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(calc.orderId.value).toBe(99)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('ignores create-order responses after the order query becomes valid or malformed', async () => {
    let resolveOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveOrder = resolve
    }))
    const wrapper = mountPage()
    await Promise.resolve()

    mocks.route.query.orderId = '43'
    await flushPromises()
    resolveOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(useCalculation().orderId.value).toBe(43)
    expect(mocks.push).not.toHaveBeenCalled()
    wrapper.unmount()

    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ query: {} })
    let resolveMalformedOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveMalformedOrder = resolve
    }))
    const malformedWrapper = mountPage()
    await Promise.resolve()

    mocks.route.query.orderId = null
    await flushPromises()
    resolveMalformedOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(malformedWrapper.get('[role="alert"]').text(), 'absent-to-null route race')
      .toContain('Некорректный номер заказа')
    expect(useCalculation().orderId.value, 'absent-to-null route race').toBeNull()
    expect(mocks.push, 'absent-to-null route race').not.toHaveBeenCalled()
    malformedWrapper.unmount()

    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.route = reactive({ query: {} })
    let resolveUnrelatedQueryOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveUnrelatedQueryOrder = resolve
    }))
    mountPage()
    await Promise.resolve()

    mocks.route.query = { placement: 'sidebar' }
    await flushPromises()
    resolveUnrelatedQueryOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(useCalculation().orderId.value, 'unrelated query change').toBe(42)
    expect(mocks.navigateToProductRows, 'unrelated query change').toHaveBeenCalledTimes(1)
  })

  it('keeps an existing order while choosing a wicket product', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Калитки'))!.trigger('click')

    expect(mocks.createOrder).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/wicket/model', query: { orderId: '42' } })
  })

  it('ignores a late create-order response after cancellation', async () => {
    let resolveOrder!: (value: { orderId: number, companyId: null, managerId: number }) => void
    mocks.createOrder.mockImplementationOnce(() => new Promise(resolve => {
      resolveOrder = resolve
    }))
    const wrapper = mountPage()
    await Promise.resolve()

    await wrapper.findAll('button').find(button => button.text().includes('Назад'))!.trigger('click')
    resolveOrder({ orderId: 42, companyId: null, managerId: 1 })
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(useCalculation().orderId.value).toBeNull()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('keeps a product disabled when the product-row backend does not support it yet', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    const swingButton = wrapper.findAll('button').find(button => button.text().includes('Ворота распашные'))!
    expect(swingButton.attributes('disabled')).toBeDefined()
    expect(swingButton.text()).toContain('Скоро')
  })

  it('loads product images from the public web root', async () => {
    mocks.route.query = { orderId: '42' }
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('img').map(image => image.attributes('src'))).toEqual([
      '/k2.jpg',
      '/k3.jpg',
    ])
  })
})
