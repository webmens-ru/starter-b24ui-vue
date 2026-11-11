import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RaspolozheniyePolotna from './RaspolozheniyePolotna.vue'
import { useCalculation } from '../../composables/useCalculation'
import { recalculate, saveWicketData } from '../../app/api/wicket'
import * as orientations from '../../app/fillingOrientations'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 100, priceRetail: 150 }),
}))

describe('explicit filling orientation choice', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '2'
    vi.clearAllMocks()
  })

  it.each(['', null] as const)('does not repair or autosave unresolved %s on mount', async value => {
    const calc = useCalculation()
    calc.raspolozheniyePolotna.value = value
    calc.priceRetail.value = 1000
    const wrapper = mount(RaspolozheniyePolotna, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    expect(calc.raspolozheniyePolotna.value).toBe(value)
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(recalculate).not.toHaveBeenCalled()
    expect(calc.getBaseSavePayload().reachedStep).toBe('page6')
    expect(wrapper.find('input:checked').exists()).toBe(false)
    expect(wrapper.text()).toContain('Выберите расположение полотна')
    wrapper.unmount()
  })

  it('saves the same code after changing both display labels and explicitly repairs only orientation', async () => {
    const options = vi.spyOn(orientations, 'fillingOrientationOptions').mockReturnValue([
      { value: 'vertical', label: 'Вариант А' }, { value: 'horizontal', label: 'Вариант Б' },
    ])
    const calc = useCalculation()
    calc.raspolozheniyePolotna.value = ''
    calc.fillSide.value = ''
    const wrapper = mount(RaspolozheniyePolotna, { global: { stubs: ['B24Button'] } })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Вариант Б')
      await wrapper.get('input[name="fillingOrientationCode"][value="horizontal"]').setValue()
      await flushPromises()
      expect(calc.raspolozheniyePolotna.value).toBe('horizontal')
      expect(calc.fillSide.value).toBe('')
      expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ fillingOrientationCode: 'horizontal' }))
      expect(wrapper.get('img[alt="Вариант Б"]').attributes('src')).toContain('w_g_1.1.png')
    } finally {
      wrapper.unmount()
      options.mockRestore()
    }
  })
  it('keeps a failed type3 orientation change dirty and retries atomic geometry clearing', async () => {
    const calc = useCalculation()
    calc.modelId.value = '3'
    calc.fillSide.value = 2
    calc.idFacade.value = 91
    calc.idYard.value = 92
    calc.raspolozheniyePolotna.value = 'vertical'
    calc.gapName.value = 20
    const wrapper = mount(RaspolozheniyePolotna, { global: { stubs: ['B24Button'] } })
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('offline'))
    await wrapper.get('input[value="horizontal"]').setValue()
    await flushPromises()
    expect(calc.fillingNeedsRecalculation.value).toBe(true)
    expect(calc.gapName.value).toBe(20)
    expect(wrapper.text()).toContain('Не удалось сохранить')
    const allowed = await (wrapper.vm as unknown as { validateBeforeLeave: () => Promise<boolean> }).validateBeforeLeave()
    expect(allowed).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      fillingOrientationCode: 'horizontal', gapName: null, layingFacadeCode: null,
      layingYardCode: null, gapYardMm: null, yardTrimCode: null,
    }))
    expect(calc.gapName.value).toBeNull()
    expect(calc.idFacade.value).toBe(91)
    expect(calc.idYard.value).toBe(92)
    wrapper.unmount()
  })

})
