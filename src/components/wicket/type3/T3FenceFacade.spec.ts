import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFenceGapOptions, getFenceTable, saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T3FenceFacade from './T3FenceFacade.vue'

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../app/api/wicket')>()),
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

it('keeps valid laying when changing only the material color', async () => {
  const calc = useCalculation()
  calc.idYard.value = ''
  calc.gapName.value = 28
  calc.layingFacadeCode.value = 'gap'
  calc.numberOfSticks.value = 8
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 101, company: 'Поставщик', material: 'Новое имя', widthFence: '100', typeOfCoating: 'Покрытие', color: 'Новый цвет' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.gapName.value).toBe(28)
  expect(calc.layingFacadeCode.value).toBe('gap')
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapName: 28, layingFacadeCode: 'gap' }))
})
it('retains the legacy yard snapshot across a failed material save and retry', async () => {
  const calc = useCalculation()
  calc.idYard.value = 200
  calc.thicknessYard.value = '120'
  calc.gapName.value = 28
  calc.layingFacadeCode.value = 'gap'
  vi.mocked(getFenceTable).mockResolvedValueOnce({ table: [{ id: 102, company: 'Поставщик', material: 'Другая ширина', widthFence: '120', typeOfCoating: 'Покрытие', color: 'Цвет' }], pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
  vi.mocked(getFenceGapOptions)
    .mockResolvedValueOnce([{ id: 7, gapMm: 28, label: 'Исторический', quantity: 6 }])
    .mockResolvedValueOnce([{ id: 9, gapMm: 50, label: 'Другой', quantity: 7 }])
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  await flushPromises()
  expect(calc.gapName.value).toBeNull()
  expect(wrapper.text()).toContain('Не удалось сохранить материал')
  expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapYardMm: 28, layingYardCode: 'gap', numberOfSticksYard: 6 }))
  expect(calc.gapYardMm.value).toBe(28)
})
