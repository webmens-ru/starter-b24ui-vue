import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LockComponentsStep from './LockComponentsStep.vue'
import { useCalculation } from '../../../composables/useCalculation'
import * as api from '../../../app/api/wicket'

vi.mock('../../../app/api/wicket', () => ({
  getMaterialItems: vi.fn().mockResolvedValue([
    { id: 101, typeCode: 'lock_component', name: 'Комплект 1', article: 'LC-1', imageUrls: [], attributes: {}, documents: [], unit: { code: 'pcs', name: 'Штука', symbol: 'шт' }, price: 10 },
    { id: 202, typeCode: 'lock_component', name: 'Комплект 2', article: 'LC-2', imageUrls: [], attributes: {}, documents: [], unit: { code: 'pcs', name: 'Штука', symbol: 'шт' }, price: 20 },
  ]),
  getLockComponents: vi.fn(),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  saveWicketAccessoryComposition: vi.fn().mockImplementation(async (payload: { lockVersion: number }) => ({
    lockVersion: payload.lockVersion + 1,
    lockComponents: [], skud: [], doorClosers: [], bumpers: [],
    orderTotals: { priceRetail: 0, priceDealer: 0 },
  })),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))

describe('LockComponentsStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('загружает universal material IDs и не сохраняет при открытии шага', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1
    calc.lockComponentIds.value = [202]
    calc.lockComponentsInstalled.value = 'Устанавливает заказчик'

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })

    await new Promise(r => setTimeout(r, 100))

    const checked = wrapper.findAll('input[type="checkbox"]')
      .filter(input => (input.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect((checked[0].element as HTMLInputElement).value).toBe('on')

    expect(api.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'lock_component', productType: 'wicket', modelId: 2 })
    expect(api.getLockComponents).not.toHaveBeenCalled()
    expect(api.saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(api.saveWicketData).not.toHaveBeenCalled()
  })

  it('сохраняет смену исполнителя установки', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })
    await new Promise(r => setTimeout(r, 100))
    vi.mocked(api.saveWicketAccessoryComposition).mockClear()

    const customerRadio = wrapper.find('input[type="radio"][value="Устанавливает заказчик"]')
    await customerRadio.setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(api.saveWicketAccessoryComposition).toHaveBeenCalled()
    expect(api.saveWicketData).not.toHaveBeenCalled()
  })
})
