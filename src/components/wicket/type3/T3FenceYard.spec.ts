import FillingAppearanceFields from '../shared/FillingAppearanceFields.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFenceGapOptions, getFenceTable, saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T3FenceYard from './T3FenceYard.vue'
vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  getFillingAppearanceOptions: vi.fn().mockResolvedValue({ manufacturers: [], colors: [{ id: 8, name: 'Сохранённый цвет', hex: '#123456', image: null }] }),
  getFenceTable: vi.fn(), getFenceGapOptions: vi.fn(), saveWicketData: vi.fn(),
}))
beforeEach(() => {
  setActivePinia(createPinia())
  const calc = useCalculation(); calc.reset()
  calc.orderId.value = calc.number.value = 42; calc.productRowId.value = 7; calc.modelId.value = '3'
  calc.colorYardId.value = 8; calc.colorYard.value = 'Сохранённый цвет'; calc.colorYardHex.value = '#123456'
  calc.thicknessFacade.value = '100'; calc.gapName.value = 28; calc.layingFacadeCode.value = 'gap'
  vi.mocked(getFenceTable).mockReset().mockResolvedValue({ table: [{ id: 2, company: 'Любое имя', material: 'Переименовано', widthFence: '100', typeOfCoating: 'Покрытие' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  vi.mocked(getFenceGapOptions).mockReset().mockResolvedValue([{ id: 3, gapMm: 28, label: 'Имя не используется', quantity: 7 }, { id: 4, gapMm: 0, label: 'Без числа', quantity: 6 }])
  vi.mocked(saveWicketData).mockReset().mockResolvedValue(undefined as never)
})
function page() { return mount(T3FenceYard, { global: { stubs: { B24Button: true, B24Modal: true, T3FilterDropdown: { props: ['label'], template: '<span>{{ label }}</span>' } } } }) }
it('filters the complete server-side catalog to the facade width and saves inherited laying', async () => {
  const wrapper = page(); await flushPromises()
  expect(getFenceTable).toHaveBeenLastCalledWith('3', expect.objectContaining({ widthFence: ['100'] }), 1)
  expect(wrapper.findAll('span').some(span => span.text() === 'Ширина штакетника')).toBe(false)
  expect(wrapper.findAll('span').some(span => span.text() === 'Форма')).toBe(true)
  await wrapper.get('tbody input').setValue(true); await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idYard: 2, widthFenceYard: '100', layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: 7 }))
  expect(useCalculation().gapYardMm.value).toBe(28)
})
it('allows another width in butt mode and calculates its own count', async () => {
  const calc = useCalculation(); calc.gapName.value = 0; calc.layingFacadeCode.value = 'butt'
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 2, company: 'Поставщик', material: 'Материал', widthFence: '120', typeOfCoating: 'Покрытие' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const wrapper = page(); await flushPromises()
  expect(getFenceTable).toHaveBeenLastCalledWith('3', expect.objectContaining({ widthFence: [] }), 1)
  await wrapper.get('tbody input').setValue(true); await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ widthFenceYard: '120', layingYardCode: 'butt', gapYardMm: 0, numberOfSticksYard: 6 }))
})
it('retries inherited layout after a failed material save', async () => {
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  const wrapper = page(); await flushPromises()
  await wrapper.get('tbody input').setValue(true); await flushPromises()
  expect(wrapper.text()).toContain('Не удалось сохранить материал')
  expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
  expect(useCalculation().layingYardCode.value).toBe('gap')
})
it('does not restore an incompatible historical material into the selectable row', async () => {
  const calc = useCalculation(); calc.idYard.value = 9; calc.thicknessYard.value = '120'
  const wrapper = page(); await flushPromises()
  expect(wrapper.findAll('tbody input')).toHaveLength(1)
  expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
})

it('deselects material while retaining inherited layout and clearing count', async () => {
  const wrapper = page(); await flushPromises()
  await wrapper.get('tbody input').setValue(true); await flushPromises()
  await wrapper.get('tbody input').setValue(false); await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idYard: null, layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: null }))
  expect(useCalculation().idYard.value).toBe('')
})

it('uses profile metadata independently of captions and clears a previous overlay for legacy material', async () => {
  const calc = useCalculation()
  calc.idFacade.value = ''; calc.idYard.value = ''
  const row = { id: 303, company: 'Переименовано', material: 'Произвольное название', widthFence: '100', typeOfCoating: 'Другое имя', profileId: 12, profileWidth: 100, profileImage: '/profile.png', minTrimWidth: 35, maxTrimWidth: 65 }
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [row, { ...row, id: 304, profileId: null, profileImage: null }], pagination: { page: 1, pageSize: 100, totalCount: 2, pageCount: 1 } })
  const wrapper = page()
  await flushPromises()
  await wrapper.findAll('tbody input')[0]!.setValue(true)
  await flushPromises()
  expect(calc.reliefYardImage.value).toBe('/profile.png')
  expect(calc.thicknessYard.value).toBe('100')
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.reliefYardImage.value).toBe('')
  wrapper.unmount()
})

it('places the color field above the table and persists its independent choice', async () => {
  const calc = useCalculation()
  calc.idYard.value = 100
  calc.thicknessYard.value = '100'
  const wrapper = page()
  await flushPromises()
  const appearance = wrapper.getComponent(FillingAppearanceFields)
  expect(appearance.props('showManufacturer')).toBe(true)
  expect(appearance.props('fenceId')).toBe(useCalculation().idYard.value)
  expect(appearance.props('side')).toBe('yard')
  expect(wrapper.html().indexOf('appearance-fields')).toBeLessThan(wrapper.html().indexOf('<table'))
  appearance.vm.$emit('change')
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorYardId: 8, colorYard: 'Сохранённый цвет' }))
  wrapper.unmount()
})
