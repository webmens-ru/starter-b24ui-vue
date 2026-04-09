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
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 10000, priceRetail: 13500 }),
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
      orderId: 42,
      modelId: '1',
      reachedStep: 'page1',
    })
    expect(payload).toHaveProperty('visitedPages')
    expect(payload).toHaveProperty('provides_material')
    expect(payload).toHaveProperty('provides_paint')
    expect(payload).toHaveProperty('does_painting_frame')
    expect(payload).toHaveProperty('does_assembly')
  })

  it('FillSide передаёт fill_side и materialFacadeGlob', async () => {
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
      orderId: 42,
      modelId: '1',
      reachedStep: 'page2',
      fill_side: 'Одна сторона',
      materialFacadeGlob: 'Сайдинг',
      materialYardGlob: null,
    })
  })

  it('FillSide при "Две стороны" передаёт materialYardGlob', async () => {
    calc.fillSide.value = 'Две стороны'
    calc.materialYardGlob.value = 'Профлист'

    mount(FillSide, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload.materialYardGlob).toBe('Профлист')
  })

  it('IsTherelock передаёт is_there_lock_id', async () => {
    calc.isThereLockId.value = 0
    calc.isThereLockName.value = 'Нет'

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
    expect(payload).toHaveProperty('reachedStep')
    expect(payload.modelId).toBe('1')
  })
})
