import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../../composables/useCalculation'
import T2FillSide from './T2FillSide.vue'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 1 }),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

beforeEach(() => { setActivePinia(createPinia()); useCalculation().reset() })

it('defaults to profnastil and offers it alone for both sides', async () => {
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
  expect(wrapper.findAll('input[value="profnastil"]')).toHaveLength(2)
  wrapper.unmount()
})
