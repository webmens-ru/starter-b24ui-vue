import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useCalculation } from '../../composables/useCalculation'
import ShieldType from './ShieldType.vue'

vi.mock('../../app/api/wicket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/wicket')>()),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [] }),
  getNetWidths: vi.fn().mockResolvedValue({ netWidths: [{ id: '150', name: '150' }] }),
  getNetsByWidth: vi.fn().mockResolvedValue({
    items: [{ id: 31, model: 'Сетка 150', imageUrl: '/net.png', sizeA: 150, sizeB: 150, thickness: 1, price: 100 }],
  }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

const { saveWicketData } = await import('../../app/api/wicket')

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

function mountShieldType() {
  return mount(ShieldType, {
    global: {
      plugins: [router],
      stubs: {
        B24Button: true,
        B24Modal: true,
        B24SelectMenu: true,
      },
    },
  })
}

describe('ShieldType top-only subtype', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    vi.mocked(saveWicketData).mockClear()
  })

  it('keeps upper mesh and clears stale lower and side values on selection', async () => {
    const calc = useCalculation()
    calc.shieldType.value = 'Тип_3'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    calc.heightLowerPart.value = '200'
    calc.assortmentHeightLowerNetId.value = 32
    calc.widthSidePart.value = '100'
    calc.assortmentSideGrilleNetId.value = 33

    const wrapper = mountShieldType()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(wrapper.find('input[value="Тип_5"]').exists()).toBe(true)
    await wrapper.get('input[value="Тип_5"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Высота сетки верхней части')
    expect(wrapper.text()).not.toContain('Высота сетки нижней части')
    expect(wrapper.text()).not.toContain('Ширина сетки боковой решётки')
    expect(wrapper.get('img[alt="Тип 5"]').attributes('src')).toMatch(/\/img\/wicket\/type1\/w_[gv]_1\.5\.png$/)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({
      shieldType: 'Тип_5',
      heightTopPart: '150',
      heightLowerPart: '0',
      widthSidePart: '0',
      netWidthProviderTop: 'executor',
      assortmentHeightUpperNetId: 31,
    })
    const payload = vi.mocked(saveWicketData).mock.lastCall?.[0]
    expect(payload?.netWidthProviderLower).toBeUndefined()
    expect(payload?.netWidthProviderSide).toBeUndefined()
    expect(payload?.assortmentHeightLowerNetId).toBeUndefined()
    expect(payload?.assortmentSideGrilleNetId).toBeUndefined()
    expect(calc.heightLowerPart.value).toBe('')
    expect(calc.widthSidePart.value).toBe('')
    wrapper.unmount()
  })

  it('restores Type 5 upper mesh and uses the shared preview directory for another model', async () => {
    const calc = useCalculation()
    calc.modelId.value = '11'
    calc.shieldType.value = 'Тип_5'
    calc.heightTopPart.value = '150'
    calc.assortmentHeightUpperNetId.value = 31
    calc.netWidthProviderTop.value = 'executor'

    const wrapper = mountShieldType()
    await flushPromises()

    expect((wrapper.get('input[value="Тип_5"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('Высота сетки верхней части')
    expect(wrapper.find('#heightTopPart').exists()).toBe(true)
    expect(calc.heightTopPart.value).toBe('150')
    expect(wrapper.get('img[alt="Тип 5"]').attributes('src')).toMatch(/\/img\/wicket\/type1\/w_[gv]_1\.5\.png$/)
    expect(vi.mocked(saveWicketData).mock.lastCall?.[0]).toMatchObject({
      shieldType: 'Тип_5',
      heightTopPart: '150',
      assortmentHeightUpperNetId: 31,
    })
    wrapper.unmount()
  })
})
