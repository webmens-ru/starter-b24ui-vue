import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData } from '../../app/api/wicket'
import * as groups from '../../app/fillingMaterialGroups'
import { getNextPage } from '../../pages/wicket/type2Route'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 100, priceRetail: 150 }),
}))

const fillingComponents = import.meta.glob<{ default: Component }>('./type*/*FillSide.vue', { eager: true })
const cases = Object.entries(fillingComponents).map(([path, component]) => [path.match(/type(\d+)/)![1]!, component.default] as const)

describe('material provider in filling', () => {
  it('uses codes when every option label changes, preserving the other side and route', async () => {
    const options = vi.spyOn(groups, 'fillingMaterialGroupOptions').mockImplementation(codes => codes.map(value => ({ value, label: `Новая подпись ${value}` })))
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.materialFacadeGlob.value = 'siding'
    calc.materialYardGlob.value = 'profnastil'
    calc.fillSide.value = 'Две стороны'
    calc.idFacade.value = 21
    calc.idYard.value = 39
    const component = cases.find(([id]) => id === '2')![1]
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Новая подпись profnastil')
      await wrapper.findAll('input[value="profnastil"]')[0]!.setValue()
      await flushPromises()
      expect(calc.materialFacadeGlob.value).toBe('profnastil')
      expect(calc.idFacade.value).toBe('')
      expect(calc.materialYardGlob.value).toBe('profnastil')
      expect(calc.idYard.value).toBe(39)
      expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ materialFacadeGlob: 'profnastil', materialYardGlob: 'profnastil' }))
      expect(getNextPage('page2', { modelId: '2', materialFacadeGlob: calc.materialFacadeGlob.value,
        materialYardGlob: calc.materialYardGlob.value, fillSide: calc.fillSide.value,
        isThereLock: 1, providesLock: 'manufacturer', availableSections: [] })).toBe('page2_facade_profnastil')
    } finally {
      wrapper.unmount()
      options.mockRestore()
    }
  })
  it.each(cases.filter(([id]) => Number(id) >= 6))('type %s requires explicit group reselection, not provider editing, to clear invalid groups', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.materialFacadeGlob.value = ''
    calc.materialYardGlob.value = ''
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Выберите материал')
    await wrapper.get('input[value="customer"]').setValue()
    await flushPromises()
    expect(calc.materialFacadeGlob.value).toBe('')
    expect(calc.materialYardGlob.value).toBe('')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.not.objectContaining({ materialFacadeGlob: expect.anything() }))
    await wrapper.get('input[name="materialFacadeGroup"]').trigger('click')
    await flushPromises()
    expect(groups.isFillingMaterialGroup(calc.materialFacadeGlob.value)).toBe(true)
    expect(calc.materialYardGlob.value).toBe(null)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it.each(cases)('type %s does not repair or autosave an invalid stored group on mount', async (modelId, component) => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = modelId
    calc.materialFacadeGlob.value = ''
    calc.materialYardGlob.value = ''
    vi.clearAllMocks()
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(calc.materialFacadeGlob.value).toBe('')
    expect(calc.materialYardGlob.value).toBe('')
    expect(saveWicketData).not.toHaveBeenCalled()
    wrapper.unmount()
  })
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
