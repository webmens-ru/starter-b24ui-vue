import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import T4LamelFacade from './T4LamelFacade.vue'
import T4LamelYard from './T4LamelYard.vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getLamelTable, saveWicketData } from '../../../app/api/wicket'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  getLamelTable: vi.fn(), saveWicketData: vi.fn().mockResolvedValue(undefined), recalculate: vi.fn(),
}))
const palette = [{ id: 3, name: 'Новый', label: 'Новый RAL', hex: '#112233' }]
const material = { id: 12, company: 'Завод', material: 'Сталь', width: 100, workingWidth: 77, reliefImage: '/lamel.svg', reliefAlongMode: 'repeat' as const, reliefAcrossMode: 'stretch' as const, typeOfCoating: 'Покрытие', color: 'Старый текст', colors: palette }
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(getLamelTable).mockResolvedValue({ table: [material], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const calc = useCalculation()
  calc.modelId.value = '4'
  calc.orderId.value = 1
  calc.productRowId.value = 2
  calc.priceRetail.value = ''
})
const global = { stubs: ['B24Button', 'B24Modal', 'T4FilterDropdown', 'ColorSelectMenu'] }
describe.each([['Facade', T4LamelFacade], ['Yard', T4LamelYard]] as const)('Type4 %s palette', (side, component) => {
  it('hydrates a historical inactive colour without saving or replacing its ID', async () => {
    const calc = useCalculation()
    calc[`id${side}`].value = 12
    calc[`color${side}Id`].value = 99
    calc[`color${side}`].value = 'Сохранённая подпись'
    const wrapper = mount(component, { global })
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(calc[`color${side}Id`].value).toBe(99)
    expect(wrapper.findComponent({ name: 'ColorSelectMenu' }).props('items')).toContainEqual(expect.objectContaining({ id: 99, disabled: true }))
    wrapper.unmount()
  })
  it('loads the saved palette independently of the visible page and filters', async () => {
    const calc = useCalculation()
    calc[`id${side}`].value = 12
    calc[`color${side}Id`].value = 3
    vi.mocked(getLamelTable).mockImplementation(async (_model, filters) => ({
      table: filters.materialIds ? [material] : [],
      pagination: { page: 1, pageSize: 100, totalCount: 101, pageCount: 2 },
    }))
    const wrapper = mount(component, { global })
    await flushPromises()
    expect(getLamelTable).toHaveBeenCalledWith('4', expect.objectContaining({ materialIds: [12], colors: [] }), 1)
    expect(wrapper.findComponent({ name: 'ColorSelectMenu' }).props('items')).toEqual(palette)
    expect(saveWicketData).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('clears an incompatible FK on material selection and requires an explicit palette choice', async () => {
    const calc = useCalculation()
    calc[`id${side}`].value = 50
    calc[`color${side}Id`].value = 99
    calc[`color${side}`].value = 'История'
    const wrapper = mount(component, { global })
    await flushPromises()
    const choices = wrapper.findAll('tbody input')
    await choices[choices.length - 1]!.setValue(true)
    expect(calc[`color${side}Id`].value).toBeNull()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(calc[`lamelWorkingWidth${side}`].value).toBe(77)
    expect(calc[`relief${side}Image`].value).toBe('/lamel.svg')
    wrapper.findComponent({ name: 'ColorSelectMenu' }).vm.$emit('update:modelValue', 3)
    await flushPromises()
    expect(calc[`color${side}Hex`].value).toBe('#112233')
    expect(calc[`color${side}Image`].value).toBe('')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ [`id${side}`]: 12, [`color${side}Id`]: 3, [`color${side}`]: 'Новый RAL' }))
    wrapper.unmount()
  })
})
