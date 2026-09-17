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
  deleteCalculation: vi.fn(),
  navigateToProductRows: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../app/api/wicket', () => ({
  finalCalculate: mocks.finalCalculate,
  saveWicketData: mocks.saveWicketData,
  fetchSavedOrderPrice: mocks.fetchSavedOrderPrice,
  deleteCalculation: mocks.deleteCalculation,
}))
vi.mock('../../app/productRowReturnNavigation', () => ({ navigateToProductRows: mocks.navigateToProductRows }))

const ButtonStub = {
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
}
const ModalStub = { template: '<div><slot /><slot name="footer" :close="() => undefined" /></div>' }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(currentResolve => {
    resolve = currentResolve
  })
  return { promise, resolve }
}

describe('End order composition navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    mocks.saveWicketData.mockResolvedValue(undefined)
    mocks.fetchSavedOrderPrice.mockResolvedValue({ hasSavedPrice: false, isActual: false })
    mocks.finalCalculate.mockResolvedValue({ priceRetail: '1000.00', priceDealer: '800.00' })
    mocks.deleteCalculation.mockResolvedValue(undefined)
  })

  it('shows calculated prices and stays on the calculation step after a successful calculation', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Рассчитать'))!.trigger('click')
    await flushPromises()

    expect(mocks.finalCalculate).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
    }))
    expect(wrapper.text()).toContain('1000.00 ₽')
    expect(wrapper.text()).toContain('800.00 ₽')
    expect(mocks.navigateToProductRows).not.toHaveBeenCalled()
  })

  it('returns to product rows only when the user clicks «К заказу»', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('К заказу'))!.trigger('click')

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
  })

  it('deletes through the serialized wicket calculation API and returns to the order composition', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))!.trigger('click')
    await flushPromises()
    const confirmButtons = [...document.body.querySelectorAll('button')]
      .filter(button => button.textContent?.includes('Да, удалить'))
    const confirmButton = confirmButtons[confirmButtons.length - 1]
    expect(confirmButton).toBeDefined()
    confirmButton!.click()
    await flushPromises()

    expect(mocks.deleteCalculation).toHaveBeenCalledWith({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
    })
    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
  })

  it('does not navigate away when conflict-aware deletion rejects with a 409', async () => {
    mocks.deleteCalculation.mockRejectedValueOnce({ response: { status: 409 } })
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))!.trigger('click')
    await flushPromises()
    const confirmButtons = [...document.body.querySelectorAll('button')]
      .filter(button => button.textContent?.includes('Да, удалить'))
    const confirmButton = confirmButtons[confirmButtons.length - 1]
    confirmButton!.click()
    await flushPromises()

    expect(mocks.deleteCalculation).toHaveBeenCalledWith({ orderId: 42, productRowId: 7, modelId: '1' })
    expect(mocks.navigateToProductRows).not.toHaveBeenCalled()
  })

  it('ignores a calculation result that arrives after End unmounts', async () => {
    const calculation = deferred<{ priceRetail: string, priceDealer: string }>()
    mocks.finalCalculate.mockReturnValueOnce(calculation.promise)
    const calc = useCalculation()
    calc.priceRetail.value = '500.00'
    calc.priceDealer.value = '400.00'
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()
    const savesBeforeCalculation = mocks.saveWicketData.mock.calls.length

    await wrapper.findAll('button').find(button => button.text().includes('Рассчитать'))!.trigger('click')
    await vi.waitFor(() => expect(mocks.finalCalculate).toHaveBeenCalledTimes(1))
    wrapper.unmount()
    calculation.resolve({ priceRetail: '1000.00', priceDealer: '800.00' })
    await flushPromises()

    expect(calc.priceRetail.value).toBe('500.00')
    expect(calc.priceDealer.value).toBe('400.00')
    expect(mocks.saveWicketData).toHaveBeenCalledTimes(savesBeforeCalculation)
    expect(mocks.navigateToProductRows).not.toHaveBeenCalled()
  })

  it('ignores a calculation response that arrives after returning to product rows', async () => {
    const calculation = deferred<{ priceRetail: string, priceDealer: string }>()
    mocks.finalCalculate.mockReturnValueOnce(calculation.promise)
    const calc = useCalculation()
    calc.priceRetail.value = '500.00'
    calc.priceDealer.value = '400.00'
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()
    const savesBeforeCalculation = mocks.saveWicketData.mock.calls.length

    await wrapper.findAll('button').find(button => button.text().includes('Рассчитать'))!.trigger('click')
    await vi.waitFor(() => expect(mocks.finalCalculate).toHaveBeenCalledTimes(1))
    await wrapper.findAll('button').find(button => button.text().includes('К заказу'))!.trigger('click')
    calculation.resolve({ priceRetail: '1000.00', priceDealer: '800.00' })
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
    expect(calc.priceRetail.value).toBe('500.00')
    expect(calc.priceDealer.value).toBe('400.00')
    expect(mocks.saveWicketData).toHaveBeenCalledTimes(savesBeforeCalculation)
  })

  it('ignores a delete completion that arrives after End unmounts', async () => {
    const deletion = deferred<void>()
    mocks.deleteCalculation.mockReturnValueOnce(deletion.promise)
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))!.trigger('click')
    await flushPromises()
    const confirmButtons = [...document.body.querySelectorAll('button')]
      .filter(button => button.textContent?.includes('Да, удалить'))
    const confirmButton = confirmButtons[confirmButtons.length - 1]
    expect(confirmButton).toBeDefined()
    confirmButton!.click()
    await vi.waitFor(() => expect(mocks.deleteCalculation).toHaveBeenCalledTimes(1))
    wrapper.unmount()
    deletion.resolve()
    await flushPromises()

    expect(mocks.navigateToProductRows).not.toHaveBeenCalled()
  })

  it('sends one terminal navigation when «К заказу» is clicked twice', async () => {
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()
    const button = wrapper.findAll('button').find(item => item.text().includes('К заказу'))!

    await button.trigger('click')
    await button.trigger('click')

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
  })

  it('sends one delete request and one navigation on a double confirmation', async () => {
    const deletion = deferred<void>()
    mocks.deleteCalculation.mockReturnValueOnce(deletion.promise)
    const wrapper = mount(End, {
      global: { stubs: { B24Button: ButtonStub, B24Modal: ModalStub, Transition: false } },
    })
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Не сохранять расчёт'))!.trigger('click')
    await flushPromises()
    const confirmButtons = [...document.body.querySelectorAll('button')]
      .filter(button => button.textContent?.includes('Да, удалить'))
    const confirmButton = confirmButtons[confirmButtons.length - 1]!
    confirmButton.click()
    confirmButton.click()
    await vi.waitFor(() => expect(mocks.deleteCalculation).toHaveBeenCalledTimes(1))
    deletion.resolve()
    await flushPromises()

    expect(mocks.navigateToProductRows).toHaveBeenCalledTimes(1)
  })
})
