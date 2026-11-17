import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import T4FillSide from './T4FillSide.vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData } from '../../../app/api/wicket'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  const calc = useCalculation()
  calc.orderId.value = 1
  calc.productRowId.value = 3
  calc.modelId.value = '4'
  calc.priceRetail.value = ''
})

describe('Type4 fixed lamella selection', () => {
  it.each([2 as const, '' as const])('normalizes draft %s and never offers a second side or another material', async (initialCount) => {
    const calc = useCalculation()
    calc.fillSide.value = initialCount
    calc.materialFacadeGlob.value = 'siding'
    calc.materialYardGlob.value = 'profnastil'
    calc.idFacade.value = '77'
    calc.idYard.value = '88'
    const wrapper = mount(T4FillSide, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Две стороны')
    expect(wrapper.text()).not.toContain('Материал заполнения (двор)')
    expect(wrapper.text()).toContain('Одна сторона')
    expect(wrapper.text()).toContain('Ламель')
    expect(calc.fillSide.value).toBe(1)
    expect(calc.materialFacadeGlob.value).toBe('lamella')
    expect(calc.materialYardGlob.value).toBe(null)
    expect(calc.idFacade.value).toBe('')
    expect(calc.idYard.value).toBe('')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      fillSide: 1, materialFacadeGlob: 'lamella', materialYardGlob: null, idFacade: null,
    }))
    expect(vi.mocked(saveWicketData).mock.calls.slice(-1)[0]?.[0]).not.toHaveProperty('idYard')
    wrapper.unmount()
  })

  it('keeps an existing facade lamella selection when opening the step', async () => {
    const calc = useCalculation()
    calc.fillSide.value = 1
    calc.materialFacadeGlob.value = 'lamella'
    calc.idFacade.value = '12'
    const wrapper = mount(T4FillSide, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(calc.idFacade.value).toBe('12')
    expect(vi.mocked(saveWicketData).mock.calls.slice(-1)[0]?.[0]).not.toHaveProperty('idYard')
    wrapper.unmount()
  })
})
