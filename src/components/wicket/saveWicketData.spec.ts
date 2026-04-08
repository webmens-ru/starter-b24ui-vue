/**
 * Тесты передачи данных на бэк через saveWicketData.
 * Проверяем, что компоненты вызывают saveWicketData с корректным payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import ManufacturingOption from './ManufacturingOption.vue'
import FillSide from './type1/FillSide.vue'
import IsTherelock from './IsTherelock.vue'

const testRouter = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ price_dealer: 10000, price_retail: 13500 }),
  saveOrderData: vi.fn().mockResolvedValue(undefined),
  saveClientInfo: vi.fn().mockResolvedValue(undefined),
  getAssortmentStolb: vi.fn().mockResolvedValue({ arr_assortment_pipe: [] }),
  getPolozhenieJumper: vi.fn().mockResolvedValue({ arr_available_polozheniye_jumper: [] }),
  getAssortmentJumper: vi.fn().mockResolvedValue({ arr_assortment_jumper: [] }),
  getColorShield: vi.fn().mockResolvedValue({ arr_color_shield: [] }),
  getFilterOptions: vi.fn().mockResolvedValue({}),
  getSidingTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getProfnastilTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
  createOrder: vi.fn().mockResolvedValue({ order_id: 42, companyId: null, managerId: 1 }),
  loadWicketData: vi.fn().mockResolvedValue({}),
  createWicketMainMenu: vi.fn().mockResolvedValue(undefined),
  finalCalculate: vi.fn().mockResolvedValue({ price_dealer: '15000', price_retail: '22500' }),
  deleteCalculation: vi.fn().mockResolvedValue(undefined),
}))

const { saveWicketData } = await import('../../app/api/wicket')

describe('saveWicketData — данные передаются на бэк', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(async () => {
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.reset()
    calc.modelId.value = '1'
    calc.number.value = 42
    vi.mocked(saveWicketData).mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('ManufacturingOption передаёт вариант изготовления', async () => {
    mount(ManufacturingOption, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    // save вызывается на onMounted
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]

    expect(payload).toMatchObject({
      order_id: 42,
      model_id: '1',
      reached_step: 'page1',
    })
    expect(payload).toHaveProperty('visited_pages')
    expect(payload).toHaveProperty('provides_material')
    expect(payload).toHaveProperty('provides_paint')
    expect(payload).toHaveProperty('does_painting_frame')
    expect(payload).toHaveProperty('does_assembly')
  })

  it('FillSide передаёт fill_side и material_facade_glob', async () => {
    mount(FillSide, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]

    expect(payload).toMatchObject({
      order_id: 42,
      model_id: '1',
      reached_step: 'page2',
      fill_side: 'Одна сторона',
      material_facade_glob: 'Сайдинг',
      material_yard_glob: null,
    })
  })

  it('FillSide при "Две стороны" передаёт material_yard_glob', async () => {
    calc.fill_side.value = 'Две стороны'
    calc.material_yard_glob.value = 'Профлист'

    mount(FillSide, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload.material_yard_glob).toBe('Профлист')
  })

  it('IsTherelock передаёт is_there_lock_id', async () => {
    calc.is_there_lock_id.value = 0
    calc.is_there_lock_name.value = 'Нет'

    mount(IsTherelock, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload).toHaveProperty('is_there_lock_id')
    expect(payload).toHaveProperty('is_there_lock_name')
    expect(payload).toHaveProperty('reached_step')
    expect(payload.model_id).toBe('1')
  })
})
