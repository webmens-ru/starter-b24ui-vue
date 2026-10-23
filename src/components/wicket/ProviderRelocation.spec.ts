import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData } from '../../app/api/wicket'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 100, priceRetail: 150 }),
}))

const fillingComponents = import.meta.glob<{ default: Component }>('./type*/*FillSide.vue', { eager: true })
const cases = Object.entries(fillingComponents).map(([path, component]) => [path.match(/type(\d+)/)![1]!, component.default] as const)

describe('material provider in filling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    vi.clearAllMocks()
  })

  it.each(cases)('type %s restores and saves the provider before the existing filling fields', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.providesMaterial.value = 'customer'
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(wrapper.get('fieldset legend').text()).toBe('Материал заполнения')
    expect(wrapper.get<HTMLInputElement>('input[value="customer"]').element.checked).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ providesMaterial: 'customer' }))
    await wrapper.get('input[value="manufacturer"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ providesMaterial: 'manufacturer' }))
    expect(calc.data.value.find(block => block.blockName === 'Заполнение')?.params[0]).toEqual({
      name: 'Материал заполнения', value: 'Предоставляет изготовитель',
    })
    wrapper.unmount()
  })
})
