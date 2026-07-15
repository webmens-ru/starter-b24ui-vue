import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LockComponentsStep from './LockComponentsStep.vue'
import { useCalculation } from '../../../composables/useCalculation'
import * as api from '../../../app/api/wicket'

vi.mock('../../../app/api/wicket', () => ({
  getLockComponents: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Комплект 1' },
      { id: 2, marking: 'Комплект 2' },
    ],
  }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

describe('LockComponentsStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('восстанавливает сохранённые комплектующие перед первым сохранением', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.lockComponentIds.value = [2]
    calc.lockComponentsInstalled.value = 'Устанавливает заказчик'

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })

    await new Promise(r => setTimeout(r, 100))

    const checked = wrapper.findAll('input[type="checkbox"]')
      .filter(input => (input.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect((checked[0].element as HTMLInputElement).value).toBe('on')

    expect(api.saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(api.saveWicketData).mock.calls[0][0] as Record<string, unknown>
    expect(payload.lockComponentIds).toBe('[2]')
    expect(payload.lockComponentsInstalled).toBe('Устанавливает заказчик')
  })

  it('сохраняет смену исполнителя установки', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })
    await new Promise(r => setTimeout(r, 100))
    vi.mocked(api.saveWicketData).mockClear()

    const customerRadio = wrapper.find('input[type="radio"][value="Устанавливает заказчик"]')
    await customerRadio.setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(api.saveWicketData).toHaveBeenCalled()
    const calls = vi.mocked(api.saveWicketData).mock.calls
    const payload = calls[calls.length - 1][0] as Record<string, unknown>
    expect(payload.lockComponentsInstalled).toBe('Устанавливает заказчик')
  })
})
