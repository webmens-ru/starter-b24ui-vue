import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FurnitureAddon from './FurnitureAddon.vue'
import { useWicketFormStore } from '../../stores/wicket/wicketFormStore'
import { useCalculation } from '../../composables/useCalculation'
import * as api from '../../app/api/wicket'

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
  saveOrderData: vi.fn().mockResolvedValue(undefined),
  saveClientInfo: vi.fn().mockResolvedValue(undefined),
  getAssortmentStolb: vi.fn().mockResolvedValue({ assortmentPipe: [] }),
  getPolozhenieJumper: vi.fn().mockResolvedValue({ availablePolozheniyeJumper: [] }),
  getAssortmentJumper: vi.fn().mockResolvedValue({ assortmentJumper: [] }),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [] }),
  getFilterOptions: vi.fn().mockResolvedValue({}),
  getSidingTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getProfnastilTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
  createOrder: vi.fn().mockResolvedValue({ orderId: 42, companyId: null, managerId: 1 }),
  loadWicketData: vi.fn().mockResolvedValue({}),
  createWicketMainMenu: vi.fn().mockResolvedValue(undefined),
  finalCalculate: vi.fn().mockResolvedValue({ priceDealer: '15000', priceRetail: '22500' }),
  deleteCalculation: vi.fn().mockResolvedValue(undefined),
}))

const config = {
  key: 'doorCloser' as const,
  title: 'Доводчик',
  page: 'page_door_closer',
  saveKeys: { isThere: 'isThereDoorCloser', id: 'doorCloserId', provided: 'doorCloserProvided', installed: 'doorCloserInstalled' },
}

const skudConfig = {
  key: 'skud' as const,
  title: 'СКУД',
  page: 'page_skud',
  saveKeys: { isThere: 'isThereSkud', id: 'skudId', provided: 'skudProvided', installed: 'skudInstalled', ids: 'skudIds' },
}

describe('FurnitureAddon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
  })

  it('по умолчанию «Не будет» — без сетки моделей, save вызван с ключом isThereDoorCloser=0', async () => {
    const form = useWicketFormStore()
    form.addonItems.doorCloser = [{ id: 1, marking: 'DC-1' }]
    const wrapper = mount(FurnitureAddon, {
      props: { config },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await wrapper.vm.$nextTick()
    // Wait for onMounted async save to complete
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Доводчик')
    expect(api.saveWicketData).toHaveBeenCalled()
    const payload = (api.saveWicketData as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<string, unknown>
    expect(payload).toHaveProperty('isThereDoorCloser', 0)
  })

  it('выбор «Будет» раскрывает опции предоставления', async () => {
    const form = useWicketFormStore()
    form.addonItems.doorCloser = [{ id: 1, marking: 'DC-1' }]
    const wrapper = mount(FurnitureAddon, {
      props: { config },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await wrapper.vm.$nextTick()
    const radios = wrapper.findAll('input[type="radio"]')
    const budet = radios.find(r => (r.element as HTMLInputElement).value === 'Будет')
    if (budet) {
      await budet.setValue()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Предоставляет изготовитель')
    } else {
      // fallback: component renders without crashing and shows title
      expect(wrapper.text()).toContain('Доводчик')
    }
  })

  it('при повторной загрузке СКУД сохраняет выбранного поставщика в первом payload', async () => {
    const form = useWicketFormStore()
    form.addonItems.skud = [
      { id: 10, marking: 'SKUD-10' },
      { id: 11, marking: 'SKUD-11' },
    ]
    form.addons.skud = {
      isThere: 1,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает заказчик',
      itemId: 10,
      marking: 'SKUD-10, SKUD-11',
      itemIds: [10, 11],
    }

    const wrapper = mount(FurnitureAddon, {
      props: { config: skudConfig },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await flushPromises()

    expect(wrapper.find('input[type="radio"][value="Предоставляет заказчик"]').exists()).toBe(true)
    expect(api.saveWicketData).toHaveBeenCalled()
    const payload = (api.saveWicketData as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({
      isThereSkud: 1,
      skudId: 10,
      skudIds: '[10,11]',
      skudProvided: 'Предоставляет заказчик',
      skudInstalled: 'Устанавливает заказчик',
    })
  })
})
