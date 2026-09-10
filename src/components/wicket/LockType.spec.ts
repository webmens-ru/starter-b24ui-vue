import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LockType from './LockType.vue'
import { useCalculation } from '../../composables/useCalculation'

const apiMocks = vi.hoisted(() => ({
  getLocks: vi.fn(),
  getPensByLock: vi.fn(),
  saveWicketData: vi.fn(),
  saveWicketAccessoryComposition: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../app/api/wicket', () => apiMocks)

describe('LockType', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.reset()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1
    apiMocks.getLocks.mockResolvedValue({
      items: [
        { id: 7, marking: 'Комплект 7', imageUrls: [], materialItemIds: [701, 702] },
      ],
    })
    apiMocks.getPensByLock.mockResolvedValue({ items: [] })
    apiMocks.saveWicketData.mockResolvedValue(undefined)
    apiMocks.saveWicketAccessoryComposition.mockImplementation(async (payload: {
      lockVersion: number
      lockComponents: Array<{ materialItemId: number; role: 'lock_component'; providedByManufacturer: boolean; installedByManufacturer: boolean }>
    }) => ({
      lockVersion: payload.lockVersion + 1,
      lockComponents: payload.lockComponents.map(selection => ({
        materialItemId: selection.materialItemId,
        relationRole: selection.role,
        providedByManufacturer: selection.providedByManufacturer,
        installedByManufacturer: selection.installedByManufacturer,
      })),
      skud: [],
      doorClosers: [],
      bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    }))
    apiMocks.recalculate.mockResolvedValue({ priceDealer: 0, priceRetail: 0 })
  })

  it('keeps standalone lock components without rewriting their composition when selecting a lock set', async () => {
    const existingStandaloneSelections = [
      { role: 'lock_component' as const, materialItemId: 88, providedByManufacturer: true, installedByManufacturer: false },
    ]
    calc.setAccessorySelections('lock_component', existingStandaloneSelections)
    calc.lockComponentIds.value = [88]
    calc.providesLock.value = 'Предоставляет заказчик'
    calc.lockInstaller.value = 'Выполняет изготовитель'

    const wrapper = mount(LockType, {
      global: { stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'] },
    })
    await flushPromises()

    await wrapper.find('input[type="radio"][value="7"]').setValue()
    await flushPromises()

    expect(calc.lockSetId.value).toBe(7)
    expect(apiMocks.saveWicketData).toHaveBeenCalledWith(expect.objectContaining({
      lockSetId: 7,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет изготовитель',
    }))
    expect(calc.lockComponentIds.value).toEqual([88])
    expect(calc.getAccessorySelections().lockComponents).toEqual(existingStandaloneSelections)
    expect(apiMocks.saveWicketAccessoryComposition).not.toHaveBeenCalled()
  })

  it('restores the saved selection and summary without recalculation when root save is rejected', async () => {
    apiMocks.getLocks.mockResolvedValue({
      items: [
        { id: 7, marking: 'Комплект 7', imageUrls: [], materialItemIds: [701, 702] },
        { id: 8, marking: 'Комплект 8', imageUrls: [], materialItemIds: [801, 802] },
      ],
    })
    apiMocks.getPensByLock.mockImplementation(async (lockSetId: number) => ({
      items: lockSetId === 7
        ? [{ id: 70, marking: 'Ручка 7', colors: [{ id: 700, name: 'Цвет 7' }], imageUrls: [] }]
        : [{ id: 80, marking: 'Ручка 8', colors: [{ id: 800, name: 'Цвет 8' }], imageUrls: [] }],
    }))
    calc.lockSetId.value = 7
    calc.typeLock.value = 'Комплект 7'
    calc.lockPenId.value = 70
    calc.lockPenColorId.value = 700
    calc.lockPenColor.value = 'Цвет 7'
    calc.priceRetail.value = 100
    calc.updateOrCreateBlock('Замок', [
      { name: 'Тип замка', value: 'Комплект 7' },
      { name: 'Ручка', value: 'Ручка 7' },
      { name: 'Цвет ручки', value: 'Цвет 7' },
    ])

    const wrapper = mount(LockType, {
      global: { stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'] },
    })
    await flushPromises()
    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('rejected'))
    apiMocks.recalculate.mockClear()

    await wrapper.find('input[type="radio"][value="8"]').setValue()
    await flushPromises()

    expect(calc.lockSetId.value).toBe(7)
    expect(calc.typeLock.value).toBe('Комплект 7')
    expect(calc.lockPenId.value).toBe(70)
    expect(calc.lockPenColorId.value).toBe(700)
    expect(calc.lockPenColor.value).toBe('Цвет 7')
    expect(wrapper.find('input[type="radio"][value="7"]:checked').exists()).toBe(true)
    expect(wrapper.find('input[type="radio"][value="70"]:checked').exists()).toBe(true)
    expect(calc.data.value.find(block => block.blockName === 'Замок')?.params).toEqual([
      { name: 'Тип замка', value: 'Комплект 7' },
      { name: 'Ручка', value: 'Ручка 7' },
      { name: 'Цвет ручки', value: 'Цвет 7' },
    ])
    expect(apiMocks.getPensByLock).toHaveBeenLastCalledWith(7)
    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
  })

  it('keeps the previous handle catalogue when its rollback reload fails', async () => {
    apiMocks.getLocks.mockResolvedValue({
      items: [
        { id: 7, marking: 'Комплект 7', imageUrls: [], materialItemIds: [701, 702] },
        { id: 8, marking: 'Комплект 8', imageUrls: [], materialItemIds: [801, 802] },
      ],
    })
    let set7Loads = 0
    apiMocks.getPensByLock.mockImplementation(async (lockSetId: number) => {
      if (lockSetId === 7) {
        set7Loads += 1
        if (set7Loads > 1) throw new Error('rollback reload failed')
        return { items: [{ id: 70, marking: 'Ручка 7', colors: [{ id: 700, name: 'Цвет 7' }], imageUrls: [] }] }
      }
      return { items: [{ id: 80, marking: 'Ручка 8', colors: [{ id: 800, name: 'Цвет 8' }], imageUrls: [] }] }
    })
    calc.lockSetId.value = 7
    calc.typeLock.value = 'Комплект 7'
    calc.lockPenId.value = 70
    calc.lockPenColorId.value = 700
    calc.lockPenColor.value = 'Цвет 7'
    calc.priceRetail.value = 100
    calc.updateOrCreateBlock('Замок', [
      { name: 'Тип замка', value: 'Комплект 7' },
      { name: 'Ручка', value: 'Ручка 7' },
      { name: 'Цвет ручки', value: 'Цвет 7' },
    ])

    const wrapper = mount(LockType, {
      global: { stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'] },
    })
    await flushPromises()
    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('rejected'))
    apiMocks.recalculate.mockClear()

    await wrapper.find('input[type="radio"][value="8"]').setValue()
    await flushPromises()

    expect(calc.lockSetId.value).toBe(7)
    expect(calc.lockPenId.value).toBe(70)
    expect(calc.lockPenColorId.value).toBe(700)
    expect(wrapper.find('input[type="radio"][value="7"]:checked').exists()).toBe(true)
    expect(wrapper.find('input[type="radio"][value="70"]:checked').exists()).toBe(true)
    expect(calc.data.value.find(block => block.blockName === 'Замок')?.params).toEqual([
      { name: 'Тип замка', value: 'Комплект 7' },
      { name: 'Ручка', value: 'Ручка 7' },
      { name: 'Цвет ручки', value: 'Цвет 7' },
    ])
    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
  })
})
