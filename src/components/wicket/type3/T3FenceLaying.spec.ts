import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFenceGapOptions, saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T3FenceLaying from './T3FenceLaying.vue'

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../app/api/wicket')>()),
  getFenceGapOptions: vi.fn(),
  saveWicketData: vi.fn(),
}))
beforeEach(() => {
  setActivePinia(createPinia())
  const calc = useCalculation()
  calc.reset()
  calc.modelId.value = '3'
  calc.orderId.value = calc.number.value = 42
  calc.productRowId.value = 7
  calc.idFacade.value = 100
  calc.idYard.value = 101
  calc.thicknessFacade.value = '100'
  calc.thicknessYard.value = '120'
  vi.mocked(saveWicketData).mockReset().mockResolvedValue(undefined as never)
  vi.mocked(getFenceGapOptions).mockImplementation(async payload => [
    { id: 17, gapMm: 28, label: 'Любая подпись', quantity: payload.side === 'yard' ? 7 : 8 },
    { id: 91, gapMm: 0, label: 'Другая подпись', quantity: 10 },
  ])
})
function page() {
  return mount(T3FenceLaying, { global: { stubs: {
    B24Button: { props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' },
  } } })
}
it('restores physical gap despite renamed labels and new option IDs', async () => {
  const calc = useCalculation()
  calc.gapId.value = 1
  calc.gapName.value = 28
  const wrapper = page()
  await flushPromises()
  expect(wrapper.get('[data-testid="type3-gap-select"]').element).toHaveProperty('value', '17')
  expect(calc.gapId.value).toBe(17)
  expect(calc.numberOfSticks.value).toBe(8)
  expect(saveWicketData).not.toHaveBeenCalled()
})
it('saves butt as zero without using the option caption', async () => {
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-butt"]').setValue()
  await flushPromises()
  expect(useCalculation().gapName.value).toBe(0)
  expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({ layingFacadeCode: 'butt', gapName: 0, numberOfSticks: 10 }))
})
it('copies facade gap and saves the shifted server count for the equal-width yard', async () => {
  const calc = useCalculation()
  calc.thicknessYard.value = '100'
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-gap"]').setValue()
  await wrapper.get('[data-testid="type3-gap-select"]').setValue('17')
  await flushPromises()
  expect(calc.gapName.value).toBe(28)
  expect(calc.gapYardMm.value).toBe(28)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapName: 28, layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: 7 }))
})
it('clears a different-width yard when choosing a facade gap', async () => {
  const calc = useCalculation()
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-gap"]').setValue()
  await wrapper.get('[data-testid="type3-gap-select"]').setValue('17')
  await flushPromises()
  expect(calc.idYard.value).toBe('')
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idYard: null, gapName: 28, layingYardCode: 'gap', gapYardMm: 28 }))
})
it('blocks next after failed save and allows retry', async () => {
  const wrapper = page()
  await flushPromises()
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  await wrapper.get('[data-testid="laying-butt"]').setValue()
  await flushPromises()
  expect(wrapper.text()).toContain('Не удалось сохранить')
  expect(wrapper.emitted('next')).toBeUndefined()
  await wrapper.findAll('button').find(button => button.text() === 'Далее')!.trigger('click')
  await flushPromises()
  expect(wrapper.emitted('next')).toHaveLength(1)
})
it('includes independent laying fields in a full Type3 save and clears them on reset', () => {
  const calc = useCalculation()
  calc.layingFacadeCode.value = 'butt'
  calc.gapName.value = 0
  calc.layingYardCode.value = 'gap'
  calc.gapYardMm.value = 28
  calc.numberOfSticksYard.value = 6
  expect(calc.getFullSavePayload()).toMatchObject({ layingFacadeCode: 'butt', layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: 6 })
  calc.reset()
  expect(calc.layingFacadeCode.value).toBeNull()
  expect(calc.layingYardCode.value).toBeNull()
  expect(calc.gapYardMm.value).toBeNull()
})
it('blocks leaving an incomplete laying selection but allows the Back button', async () => {
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-gap"]').setValue()
  expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
  await wrapper.findAll('button').find(button => button.text() === 'Назад')!.trigger('click')
  expect(wrapper.emitted('back')).toHaveLength(1)
  expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
})
it('does not apply a late save to another opened calculation', async () => {
  let finish!: (value: never) => void
  vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-butt"]').setValue()
  wrapper.unmount()
  const calc = useCalculation()
  calc.reset()
  calc.orderId.value = 43
  calc.productRowId.value = 8
  finish(undefined as never)
  await flushPromises()
  expect(calc.gapName.value).toBeNull()
  expect(calc.layingFacadeCode.value).toBeNull()
})

it('changes both sides to butt and retains different-width yard material', async () => {
  const calc = useCalculation()
  calc.gapName.value = 28
  calc.numberOfSticks.value = 8
  const wrapper = page()
  await flushPromises()
  await wrapper.get('[data-testid="laying-butt"]').setValue()
  await flushPromises()
  expect(calc.gapName.value).toBe(0)
  expect(calc.gapYardMm.value).toBe(0)
  expect(calc.layingYardCode.value).toBe('butt')
  expect(calc.idYard.value).toBe(101)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ gapName: 0, gapYardMm: 0, layingYardCode: 'butt' }))
})
