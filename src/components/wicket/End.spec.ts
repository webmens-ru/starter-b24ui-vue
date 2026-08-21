import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCalculation } from '../../composables/useCalculation'
import End from './End.vue'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  finalCalculate: vi.fn(),
  saveWicketData: vi.fn(),
  fetchSavedOrderPrice: vi.fn(),
  listOrderItems: vi.fn(),
  deleteOrderItem: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../app/api/wicket', () => ({
  finalCalculate: mocks.finalCalculate,
  saveWicketData: mocks.saveWicketData,
  fetchSavedOrderPrice: mocks.fetchSavedOrderPrice,
}))
vi.mock('../../app/api/orderItems', () => ({
  listOrderItems: mocks.listOrderItems,
  deleteOrderItem: mocks.deleteOrderItem,
}))

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
}
const ModalStub = { template: '<div><slot /><slot name="footer" :close="() => undefined" /></div>' }

describe('End order composition navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.orderItemId.value = 7
    calc.modelId.value = '1'
    mocks.saveWicketData.mockResolvedValue(undefined)
    mocks.fetchSavedOrderPrice.mockResolvedValue({ hasSavedPrice: false, isActual: false })
    mocks.finalCalculate.mockResolvedValue({ priceRetail: '1000.00', priceDealer: '800.00' })
    mocks.listOrderItems.mockResolvedValue({
      items: [{ id: 7, lockVersion: 4, allowedActions: ['order_item.delete'] }],
      orderTotals: { priceRetail: null, priceDealer: null },
    })
    mocks.deleteOrderItem.mockResolvedValue({ item: {}, orderTotals: {} })
  })

  it('returns to order items after a successful calculation save', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Рассчитать'))!.trigger('click')
    await flushPromises()

    expect(mocks.finalCalculate).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 42,
      orderItemId: 7,
      modelId: '1',
    }))
    expect(mocks.push).toHaveBeenCalledWith({ name: 'order-items', params: { orderId: 42 } })
  })

  it('deletes the current order item and returns to the order composition', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))!.trigger('click')
    await flushPromises()
    const confirmButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Да, удалить'))
    expect(confirmButton).toBeDefined()
    confirmButton!.click()
    await flushPromises()

    expect(mocks.listOrderItems).toHaveBeenCalledWith(42)
    expect(mocks.deleteOrderItem).toHaveBeenCalledWith({
      orderId: 42,
      orderItemId: 7,
      lockVersion: 4,
    })
    expect(mocks.push).toHaveBeenCalledWith({ name: 'order-items', params: { orderId: 42 } })
  })
})
