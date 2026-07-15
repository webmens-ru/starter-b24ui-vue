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
import LockType from './LockType.vue'
import Pen from './Pen.vue'

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
  getLocks: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первый замок', imageUrls: [] },
      { id: 7, marking: 'Сохранённый замок', imageUrls: [] },
    ],
  }),
  getPensByLock: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первая ручка', colors: [{ id: 1, name: 'Первый цвет' }], imageUrls: [] },
      { id: 3, marking: 'Сохранённая ручка', colors: [{ id: 5, name: 'Сохранённый цвет' }], imageUrls: [] },
    ],
  }),
  getAdditionalPens: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первая доп. ручка', colors: [{ id: 1, name: 'Первый цвет' }], imageUrls: [] },
      { id: 9, marking: 'Сохранённая доп. ручка', colors: [{ id: 6, name: 'Сохранённый цвет' }], imageUrls: [] },
    ],
  }),
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
    expect(payload).toHaveProperty('providesMaterial')
    expect(payload).toHaveProperty('providesPaint')
    expect(payload).toHaveProperty('doesPaintingFrame')
    expect(payload).toHaveProperty('doesAssembly')
  })

  it('FillSide передаёт fillSide и materialFacadeGlob', async () => {
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
      fillSide: 'Одна сторона',
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

  it('IsTherelock передаёт isThereLock', async () => {
    calc.isThereLock.value = 0
    calc.isThereLockName.value = 'Нет'
    calc.lockPenColorId.value = 7

    mount(IsTherelock, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload).toHaveProperty('isThereLock')
    expect(payload).toHaveProperty('isThereLockName')
    expect(payload).toHaveProperty('reachedStep')
    expect(payload.modelId).toBe('1')
    expect(payload.lockPenColorId).toBeNull()
  })

  it('LockType при редактировании не перетирает сохранённую ручку замка первой из списка', async () => {
    calc.modelId.value = '2'
    calc.lockSetId.value = 7
    calc.lockPenId.value = 3
    calc.lockPenColorId.value = 5

    mount(LockType, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls.at(-1)?.[0]
    expect(payload).toMatchObject({
      lockSetId: 7,
      lockPenId: 3,
      lockPenColorId: 5,
    })
  })

  it('Pen при редактировании не перетирает сохранённую дополнительную ручку первой из списка', async () => {
    calc.modelId.value = '2'
    calc.isTherePenName.value = 'Будет'
    calc.isTherePen.value = 1
    calc.additionalPenId.value = 9
    calc.penColorId.value = 6

    mount(Pen, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls.at(-1)?.[0]
    expect(payload).toMatchObject({
      isTherePen: 1,
      additionalPenId: 9,
      penColorId: 6,
      additionalPenColor: 'Сохранённый цвет',
    })
  })
})
