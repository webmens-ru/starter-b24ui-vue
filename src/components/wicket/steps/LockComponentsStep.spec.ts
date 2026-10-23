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
    calc.lockComponentsInstalled.value = 'customer'

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })

    await new Promise(r => setTimeout(r, 100))

    const checked = wrapper.findAll('input[type="checkbox"]')
      .filter(input => (input.element as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
    expect((checked[0].element as HTMLInputElement).value).toBe('on')

    expect(api.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'lock_component', productType: 'wicket', modelId: 2 })
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

    const customerRadio = wrapper.find('input[type="radio"][name="installed"][value="customer"]')
    await customerRadio.setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(api.saveWicketAccessoryComposition).toHaveBeenCalled()
    expect(api.saveWicketData).not.toHaveBeenCalled()
  })

  it('показывает и сохраняет standalone provider/installer независимо от root-комплекта', async () => {
    const calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1
    calc.lockSetId.value = 7
    calc.providesLock.value = 'manufacturer'
    calc.lockInstaller.value = 'customer'
    calc.applyAccessoryComposition({
      lockVersion: 1,
      lockComponents: [{ materialItemId: 202, relationRole: 'lock_component_installation' }] as never,
      skud: [], doorClosers: [], bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })

    const wrapper = mount(LockComponentsStep, {
      global: { stubs: { B24Button: true } },
    })
    await new Promise(r => setTimeout(r, 100))

    expect(wrapper.find('input[name="provided"][value="customer"]:checked').exists()).toBe(true)
    expect(wrapper.find('input[name="installed"][value="manufacturer"]:checked').exists()).toBe(true)
    expect(calc.providesLock.value).toBe('manufacturer')
    expect(calc.lockInstaller.value).toBe('customer')

    vi.mocked(api.saveWicketAccessoryComposition).mockClear()
    await wrapper.find('input[name="provided"][value="manufacturer"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    const calls = vi.mocked(api.saveWicketAccessoryComposition).mock.calls
    expect(calls[calls.length - 1]?.[0].lockComponents).toEqual([{
      role: 'lock_component',
      materialItemId: 202,
      providedByManufacturer: true,
      installedByManufacturer: true,
    }])
    expect(calc.providesLock.value).toBe('manufacturer')
    expect(calc.lockInstaller.value).toBe('customer')
  })
})
