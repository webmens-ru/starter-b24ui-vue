import FillingAppearanceFields from '../shared/FillingAppearanceFields.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFillingAppearanceOptions, getFenceGapOptions, getFenceTable, saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T3FenceFacade from './T3FenceFacade.vue'

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../app/api/wicket')>()),
  getFillingAppearanceOptions: vi.fn().mockResolvedValue({ manufacturers: [], colors: [{ id: 8, name: 'Сохранённый цвет', hex: '#123456', image: null }] }),
  getFenceGapOptions: vi.fn(),
  getFenceTable: vi.fn().mockResolvedValue({
    table: [], pagination: { page: 1, pageSize: 100, totalCount: 0, pageCount: 1 },
  }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  const calc = useCalculation()
  calc.reset()
  calc.orderId.value = 42
  calc.number.value = 42
  calc.productRowId.value = 7
  calc.colorFacadeId.value = 8; calc.colorFacade.value = 'Сохранённый цвет'; calc.colorFacadeHex.value = '#123456'
  calc.modelId.value = '3'
  calc.widthProyema.value = '1000'
  calc.heightProyema.value = '2000'
  calc.idFacade.value = 100
  calc.thicknessFacade.value = '100'
  vi.mocked(saveWicketData).mockClear()
  vi.mocked(getFenceGapOptions).mockResolvedValue([
    { id: 17, gapMm: 28, label: 'Зазор без числа', quantity: 8 },
    { id: 9, gapMm: 50, label: 'Зазор без числа', quantity: 7 },
  ])
})

function mountPage() {
  return mount(T3FenceFacade, {
    global: { stubs: { T3FilterDropdown: true, B24Modal: true, B24Button: true, Button: true } },
  })
}

it('shows only material selection and leaves laying to its own step', async () => {
  const wrapper = mountPage()
  await flushPromises()
  expect(wrapper.find('[data-testid="type3-gap-select"]').exists()).toBe(false)
  expect(getFenceGapOptions).not.toHaveBeenCalled()
  expect(useCalculation().idFacade.value).toBe(100)
  wrapper.unmount()
})

it('keeps valid laying when changing the material with the same width', async () => {
  const calc = useCalculation()
  calc.idYard.value = ''
  calc.gapName.value = 28
  calc.layingFacadeCode.value = 'gap'
  calc.numberOfSticks.value = 8
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 101, company: 'Поставщик', material: 'Новое имя', widthFence: '100', typeOfCoating: 'Покрытие' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.gapName.value).toBe(28)
  expect(calc.layingFacadeCode.value).toBe('gap')
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapName: 28, layingFacadeCode: 'gap' }))
})
it('retries a facade width change without retaining a stale yard gap', async () => {
  const calc = useCalculation()
  calc.idYard.value = 200
  calc.thicknessYard.value = '120'
  calc.gapName.value = 28
  calc.layingFacadeCode.value = 'gap'
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 102, company: 'Поставщик', material: 'Другая ширина', widthFence: '120', typeOfCoating: 'Покрытие' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  vi.mocked(getFenceGapOptions).mockResolvedValue([{ id: 9, gapMm: 50, label: 'Другой', quantity: 7 }])
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.gapName.value).toBeNull()
  expect(wrapper.text()).toContain('Не удалось сохранить материал')
  expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapName: null, gapYardMm: null, numberOfSticksYard: null }))
  expect(calc.gapYardMm.value).toBeNull()
})

it('uses profile metadata independently of captions and clears a previous overlay for legacy material', async () => {
  const calc = useCalculation()
  calc.idFacade.value = ''; calc.idYard.value = ''
  const row = { id: 303, company: 'Переименовано', material: 'Произвольное название', widthFence: '100', typeOfCoating: 'Другое имя', profileId: 12, profileWidth: 100, profileImage: '/profile.png', minTrimWidth: 35, maxTrimWidth: 65 }
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [row, { ...row, id: 304, profileId: null, profileImage: null }], pagination: { page: 1, pageSize: 100, totalCount: 2, pageCount: 1 } })
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[0]!.setValue(true)
  await flushPromises()
  expect(calc.reliefFacadeImage.value).toBe('/profile.png')
  expect(calc.thicknessFacade.value).toBe('100')
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.reliefFacadeImage.value).toBe('')
  wrapper.unmount()
})

it('keeps the independently selected color when choosing a catalog row', async () => {
  const calc = useCalculation()
  calc.idYard.value = ''
  calc.colorFacade.value = 'Сохранённый цвет'; calc.colorFacadeHex.value = '#123456'
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 901, company: 'Поставщик', material: 'Без цвета', widthFence: 100, typeOfCoating: '' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.colorFacade.value).toBe('Сохранённый цвет')
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idFacade: 901, colorFacade: 'Сохранённый цвет' }))
  expect(wrapper.findAll('th').some(cell => cell.text() === 'Цвет')).toBe(false)
  wrapper.unmount()
})

it('places the color field above the table and persists its independent choice', async () => {
  const calc = useCalculation()
  calc.idFacade.value = 100
  const wrapper = mountPage()
  await flushPromises()
  const appearance = wrapper.getComponent(FillingAppearanceFields)
  expect(appearance.props('showManufacturer')).toBe(true)
  expect(appearance.props('fenceId')).toBe(useCalculation().idFacade.value)
  expect(appearance.props('side')).toBe('facade')
  expect(wrapper.html().indexOf('appearance-fields')).toBeLessThan(wrapper.html().indexOf('<table'))
  appearance.vm.$emit('change')
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorFacadeId: 8, colorFacade: 'Сохранённый цвет' }))
  wrapper.unmount()
})

it('clears a color outside the new material palette before saving its ID', async () => {
  const calc = useCalculation()
  calc.idYard.value = ''
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 902, company: 'Производитель', material: 'Переименованный материал', fenceFormCode: '01', fenceFormName: 'Переименованная форма', widthFence: 100, typeOfCoating: '' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const wrapper = mountPage()
  await flushPromises()
  vi.mocked(getFillingAppearanceOptions).mockResolvedValueOnce({ manufacturers: [], colors: [{ id: 9, name: 'Другой цвет', hex: '#ffffff', image: null }] })
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idFacade: 902, colorFacadeId: null, colorFacade: '' }))
  expect(wrapper.text()).toContain('Переименованная форма')
  expect(calc.formFacade.value).toBe('Переименованная форма')
  wrapper.unmount()
})
