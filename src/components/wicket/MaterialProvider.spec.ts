import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData } from '../../app/api/wicket'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
}))

const components = Object.entries(import.meta.glob('./type*/*FillSide.vue', { eager: true })) as Array<[string, { default: any }]>

describe('re-enabling filling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    vi.clearAllMocks()
  })

  it.each(components)('%s restores and persists a valid orientation after no filling', async (path, module) => {
    const calc = useCalculation()
    calc.modelId.value = path.match(/type(\d+)/)![1]!
    calc.raspolozheniyePolotna.value = 'horizontal'
    const wrapper = mount(module.default, { global: { stubs: ['B24Button'] } })
    try {
      await flushPromises()
      await wrapper.get('input[name="providesMaterial"][value="none"]').setValue()
      await flushPromises()
      expect(calc.raspolozheniyePolotna.value).toBe(null)
      expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ fillingOrientationCode: null }))
      await wrapper.get('input[name="providesMaterial"][value="manufacturer"]').setValue()
      await flushPromises()
      expect(calc.fillSide.value).toBe(1)
      expect(calc.raspolozheniyePolotna.value).toBe('vertical')
      expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ fillingOrientationCode: 'vertical' }))
    } finally { wrapper.unmount() }
  })
})
