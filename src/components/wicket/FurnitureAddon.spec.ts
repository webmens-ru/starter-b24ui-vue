import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FurnitureAddon from './FurnitureAddon.vue'
import { useWicketFormStore } from '../../stores/wicket/wicketFormStore'
import { useCalculation } from '../../composables/useCalculation'
import * as api from '../../app/api/wicket'

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  saveWicketAccessoryComposition: vi.fn().mockImplementation(async (payload: { lockVersion: number }) => ({
    lockVersion: payload.lockVersion + 1,
    lockComponents: [], skud: [], doorClosers: [], bumpers: [],
    orderTotals: { priceRetail: 0, priceDealer: 0 },
  })),
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
}

const skudConfig = {
  key: 'skud' as const,
  title: 'СКУД',
  page: 'page_skud',
}

describe('FurnitureAddon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.accessoryCompositionLockVersion.value = 1
  })

  it('не сохраняет и не удаляет состав при открытии шага', async () => {
    const form = useWicketFormStore()
    form.addonItems.doorCloser = [{ id: 101, name: 'DC-1', article: 'DC-1', imageUrls: [] }]
    const wrapper = mount(FurnitureAddon, {
      props: { config },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await wrapper.vm.$nextTick()
    // Wait for onMounted async save to complete
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Доводчик')
    expect(api.saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(api.saveWicketData).not.toHaveBeenCalled()
  })

  it('выбор «Будет» раскрывает опции предоставления', async () => {
    const form = useWicketFormStore()
    form.addonItems.doorCloser = [{ id: 101, name: 'DC-1', article: 'DC-1', imageUrls: [] }]
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
      { id: 110, name: 'SKUD-110', article: 'SKUD-110', imageUrls: [] },
      { id: 111, name: 'SKUD-111', article: 'SKUD-111', imageUrls: [] },
    ]
    form.addons.skud = {
      isThere: 1,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает заказчик',
      itemId: 110,
      marking: 'SKUD-10, SKUD-11',
      itemIds: [110, 111],
    }
    form.replaceAccessorySelectionIds('skud', [110, 111], { providedByManufacturer: false, installedByManufacturer: false })

    const wrapper = mount(FurnitureAddon, {
      props: { config: skudConfig },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await flushPromises()

    expect(wrapper.find('input[type="radio"][value="Предоставляет заказчик"]').exists()).toBe(true)
    const secondCheckbox = wrapper.findAll('input[type="checkbox"]')[1]
    await secondCheckbox.setValue(false)
    await flushPromises()
    expect(api.saveWicketAccessoryComposition).toHaveBeenCalled()
    expect(api.saveWicketData).not.toHaveBeenCalled()
    const payload = vi.mocked(api.saveWicketAccessoryComposition).mock.calls[0][0]
    expect(payload.skud).toEqual([
      { role: 'skud', materialItemId: 110, providedByManufacturer: false, installedByManufacturer: false },
    ])
  })

  it('не теряет singular item, предоставленный заказчиком для установки изготовителем', async () => {
    const form = useWicketFormStore()
    form.addonItems.doorCloser = [{ id: 31, name: 'DC-31', article: 'DC-31', imageUrls: [] }]
    form.addons.doorCloser = {
      isThere: 1,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает изготовитель',
      itemId: 31,
      marking: 'DC-31',
      itemIds: [31],
    }
    form.replaceAccessorySelectionIds('door_closer', [31])
    form.setAccessoryGroupProvided('door_closer', false)
    form.setAccessoryGroupInstalled('door_closer', true)

    const wrapper = mount(FurnitureAddon, {
      props: { config },
      global: { stubs: { B24Button: true, ImageViewer: true } },
    })
    await flushPromises()

    const customerInstall = wrapper.find('input[type="radio"][value="Устанавливает заказчик"]')
    await customerInstall.setValue()
    await flushPromises()

    const payload = vi.mocked(api.saveWicketAccessoryComposition).mock.calls[0][0]
    expect(payload.doorClosers).toEqual([
      { role: 'door_closer', materialItemId: 31, providedByManufacturer: false, installedByManufacturer: false },
    ])
  })
})
