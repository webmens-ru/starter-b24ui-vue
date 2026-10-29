import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import * as groups from '../../app/fillingMaterialGroups'
import * as sideCounts from '../../app/fillingSideCounts'
import { getNextPage } from '../../pages/wicket/type2Route'
import { getNextPage as getType1NextPage } from '../../pages/wicket/type1Route'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 100, priceRetail: 150 }),
}))

const fillingComponents = import.meta.glob<{ default: Component }>('./type*/*FillSide.vue', { eager: true })
const cases = Object.entries(fillingComponents).map(([path, component]) => [path.match(/type(\d+)/)![1]!, component.default] as const)

describe('material provider in filling', () => {
  it.each(cases.filter(([id]) => Number(id) <= 5))('type %s does not guess invalid yard group when selecting Double', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = 1
    calc.materialFacadeGlob.value = ({ '1': 'siding', '2': 'siding', '3': 'fence', '4': 'lamella', '5': 'spSiding' } as Record<string, string>)[modelId]!
    calc.materialYardGlob.value = ''
    calc.priceRetail.value = 1000
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[name="fillingSideCount"][value="2"]').setValue()
    await flushPromises()
    expect(calc.fillSide.value).toBe(2)
    expect(calc.materialYardGlob.value).toBe('')
    expect(recalculate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it.each(cases.filter(([id]) => Number(id) <= 5))('type %s can edit provider without trying to calculate an unresolved count', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = ''
    calc.priceRetail.value = 1000
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[value="customer"]').setValue()
    await flushPromises()
    expect(calc.fillSide.value).toBe('')
    expect(saveWicketData).toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it.each(cases)('type %s does not repair or autosave an invalid stored side count on mount', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = ''
    calc.setActivePage('page1')
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(calc.fillSide.value).toBe('')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(calc.getBaseSavePayload().reachedStep).toBe('page2')
    wrapper.unmount()
  })
  it('keeps numeric choices and yard resets when both side-count labels change', async () => {
    const options = vi.spyOn(sideCounts, 'fillingSideCountOptions').mockReturnValue([{ value: 1, label: 'Вариант А' }, { value: 2, label: 'Вариант Б' }])
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.fillSide.value = 1
    calc.materialFacadeGlob.value = 'siding'
    calc.materialYardGlob.value = 'profnastil'
    calc.idFacade.value = 21
    calc.idYard.value = 39
    const wrapper = mount(cases.find(([id]) => id === '2')![1], { global: { stubs: ['B24Button'] } })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Вариант Б')
      await wrapper.get('input[name="fillingSideCount"][value="2"]').setValue()
      await flushPromises()
      expect(calc.fillSide.value).toBe(2)
      expect(calc.idYard.value).toBe(39)
      await wrapper.get('input[name="fillingSideCount"][value="1"]').setValue()
      await flushPromises()
      expect(calc.fillSide.value).toBe(1)
      expect(calc.idYard.value).toBe('')
      expect(calc.materialYardGlob.value).toBe(null)
      expect(calc.idFacade.value).toBe(21)
    } finally {
      wrapper.unmount()
      options.mockRestore()
    }
  })
  it.each(cases.filter(([id]) => Number(id) >= 6))('type %s repairs a side count only through explicit selection, independently of group', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = ''
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[value="customer"]').setValue()
    await flushPromises()
    expect(calc.fillSide.value).toBe('')
    await wrapper.get('input[name="materialFacadeGroup"]').trigger('click')
    await flushPromises()
    expect(calc.fillSide.value).toBe('')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.not.objectContaining({ fillSide: expect.anything() }))
    await wrapper.get('input[name="fillingSideCount"]').trigger('click')
    await flushPromises()
    expect(calc.fillSide.value).toBe(1)
    expect(wrapper.find('[data-side-count-problem]').exists()).toBe(false)
    wrapper.unmount()
  })
  it.each(cases.filter(([id]) => Number(id) >= 6))('type %s can save an explicit count repair while keeping invalid group unresolved', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = ''
    calc.materialFacadeGlob.value = ''
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[name="fillingSideCount"]').trigger('click')
    await flushPromises()
    expect(calc.fillSide.value).toBe(1)
    expect(calc.materialFacadeGlob.value).toBe('')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ fillSide: 1 }))
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.not.objectContaining({ materialFacadeGlob: expect.anything() }))
    wrapper.unmount()
  })
  it('uses codes when every option label changes, preserving the other side and route', async () => {
    const options = vi.spyOn(groups, 'fillingMaterialGroupOptions').mockImplementation(codes => codes.map(value => ({ value, label: `Новая подпись ${value}` })))
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.materialFacadeGlob.value = 'siding'
    calc.materialYardGlob.value = 'profnastil'
    calc.fillSide.value = 2
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
    calc.setActivePage('page1')
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(calc.materialFacadeGlob.value).toBe('')
    expect(calc.materialYardGlob.value).toBe('')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(calc.getBaseSavePayload().reachedStep).toBe('page2')
    wrapper.unmount()
  })
  it.each(cases)('type %s persists no filling, hides fields and restores single with cleared IDs', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.idFacade.value = 21
    calc.idYard.value = 39
    calc.paintId.value = 7
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[value="none"]').setValue()
    await flushPromises()
    expect(calc.fillSide.value).toBe(0)
    expect(calc.providesMaterial.value).toBe('manufacturer')
    expect(wrapper.find('input[name="fillingSideCount"]').exists()).toBe(false)
    expect(calc.idFacade.value).toBe('')
    expect(calc.idYard.value).toBe('')
    expect(calc.paintId.value).toBe(7)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ fillingSideCount: 0, idFacade: null, idYard: null }))
    expect(calc.data.value.find(block => block.blockCode === 'filling')?.params).toEqual([
      { paramCode: 'sideCount', name: 'Сторона заполнения', value: 'Без заполнения' },
    ])
    await wrapper.get('input[value="customer"]').setValue()
    await flushPromises()
    expect(calc.fillSide.value).toBe(1)
    expect(calc.idFacade.value).toBe('')
    expect(calc.isFillSectionIncomplete.value).toBe(true)
    wrapper.unmount()
  })
  it.each(cases)('type %s restores its default material group when enabling previously absent filling', async (modelId, component) => {
    const calc = useCalculation()
    calc.modelId.value = modelId
    calc.fillSide.value = 0
    calc.clearFilling()
    const wrapper = mount(component, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    await wrapper.get('input[value="manufacturer"]').setValue()
    await flushPromises()
    const expectedGroup = ({ '1': 'siding', '2': 'siding', '3': 'fence', '4': 'lamella', '5': 'spSiding',
      '6': 'louver', '7': 'siding', '8': 'sheet', '9': 'profnastil', '10': 'profnastil', '11': 'profnastil' } as Record<string, string>)[modelId]
    expect(calc.materialFacadeGlob.value).toBe(expectedGroup)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ materialFacadeGlob: expectedGroup }))
    expect(calc.fillSide.value).toBe(1)
    expect(calc.idFacade.value).toBe('')
    expect(calc.idYard.value).toBe('')
    if (modelId === '1' || modelId === '2') {
      const next = modelId === '1' ? getType1NextPage : getNextPage
      expect(next('page2', { modelId, materialFacadeGlob: calc.materialFacadeGlob.value,
        materialYardGlob: calc.materialYardGlob.value, fillSide: calc.fillSide.value,
        isThereLock: 1, providesLock: 'manufacturer', availableSections: [] })).toBe('page2_facade_siding')
    }
    wrapper.unmount()
  })
  it('shows a failed no-filling save and keeps navigation disabled until retry succeeds', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    const wrapper = mount(cases.find(([id]) => id === '2')![1], { global: { stubs: ['B24Button'] } })
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('save unavailable'))
    await wrapper.get('input[value="none"]').setValue()
    await flushPromises()
    expect(wrapper.get('[data-filling-save-error]').text()).toContain('Не удалось сохранить')
    expect(wrapper.find('[data-filling-save-retry]').exists()).toBe(true)
    await wrapper.get('[data-filling-save-retry]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-filling-save-error]').exists()).toBe(false)
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
      paramCode: 'fillingProvider', name: 'Материал заполнения', value: 'Предоставляет изготовитель',
    })
    wrapper.unmount()
  })
})
