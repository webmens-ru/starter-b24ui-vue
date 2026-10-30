import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../../composables/useCalculation'
import T2FillSide from './T2FillSide.vue'
import { saveWicketData } from '../../../app/api/wicket'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 1 }),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  const calc = useCalculation()
  calc.reset()
  calc.modelId.value = '2'
  calc.orderId.value = 42
  calc.number.value = 42
  calc.productRowId.value = 7
  vi.mocked(saveWicketData).mockClear()
})

it('sets the fixed group for both sides without material-family controls', async () => {
  const calc = useCalculation()
  calc.modelId.value = '2'
  calc.materialFacadeGlob.value = null
  calc.orderId.value = 42
  calc.number.value = 42
  calc.productRowId.value = 7
  const wrapper = mount(T2FillSide, { global: { stubs: ['B24Button'] } })
  await flushPromises()
  expect(calc.materialFacadeGlob.value).toBe('profnastil')
  expect(wrapper.find('input[value="siding"]').exists()).toBe(false)
  await wrapper.get('input[name="fillingSideCount"][value="2"]').setValue()
  await flushPromises()
  expect(calc.materialYardGlob.value).toBe('profnastil')
  expect(wrapper.find('input[value="profnastil"]').exists()).toBe(false)
  wrapper.unmount()
})

it('clears both incompatible selections and saves the fixed group without user selection', async () => {
  const calc = useCalculation()
  calc.fillSide.value = 2
  calc.materialFacadeGlob.value = 'siding'
  calc.materialYardGlob.value = 'siding'
  calc.idFacade.value = 17
  calc.idYard.value = 18
  calc.colorFacadeId.value = 9
  calc.colorYardId.value = 10
  const wrapper = mount(T2FillSide, { global: { stubs: ['B24Button'] } })
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
    materialFacadeGlob: 'profnastil', materialYardGlob: 'profnastil',
    idFacade: null, idYard: null, colorFacadeId: null, colorYardId: null,
  }))
  expect(calc.fillingSaveBlocked.value).toBe(false)
  expect(wrapper.text()).not.toContain('выберите металлопрофиль')
  wrapper.unmount()
})

it('blocks navigation after an initial save failure and allows retry', async () => {
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('Unavailable'))
  const calc = useCalculation()
  const wrapper = mount(T2FillSide, { global: { stubs: ['B24Button'] } })
  await flushPromises()
  expect(calc.fillingSaveBlocked.value).toBe(true)
  expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось сохранить')
  await wrapper.findAll('button').find(button => button.text() === 'Повторить сохранение')!.trigger('click')
  await flushPromises()
  expect(calc.fillingSaveBlocked.value).toBe(false)
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  wrapper.unmount()
})
