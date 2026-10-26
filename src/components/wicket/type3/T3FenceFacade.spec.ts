import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFenceGapOptions, saveWicketData } from '../../../app/api/wicket'
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

it('restores physical gap despite arbitrary labels and changed option IDs', async () => {
  const calc = useCalculation()
  calc.gapId.value = 1
  calc.gapName.value = 28
  calc.numberOfSticks.value = 99
  const wrapper = mountPage()
  await flushPromises()

  expect(calc.gapName.value).toBe(28)
  expect(calc.gapId.value).toBe(17)
  expect(calc.numberOfSticks.value).toBe(8)
  expect(wrapper.get('[data-testid="type3-gap-select"]').element).toHaveProperty('value', '17')
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('persists gapMm rather than interpreting the display label', async () => {
  const wrapper = mountPage()
  await flushPromises()
  const select = wrapper.get('[data-testid="type3-gap-select"]')
  expect(select.text()).toContain('Зазор без числа — 7 шт.')
  await select.setValue('9')
  await flushPromises()

  expect(useCalculation().gapName.value).toBe(50)
  expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({
    gapId: 9, gapName: 50, numberOfSticks: 7,
  }))
  wrapper.unmount()
})
