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

  it('keeps standalone lock components when selecting a lock set', async () => {
    const existingStandaloneSelections = [
      { role: 'lock_component' as const, materialItemId: 88, providedByManufacturer: true, installedByManufacturer: false },
    ]
    calc.setAccessorySelections('lock_component', existingStandaloneSelections)
    calc.lockComponentIds.value = [88]

    const wrapper = mount(LockType, {
      global: { stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'] },
    })
    await flushPromises()

    await wrapper.find('input[type="radio"][value="7"]').setValue()
    await flushPromises()

    expect(calc.lockSetId.value).toBe(7)
    expect(calc.lockComponentIds.value).toEqual([88])
    expect(calc.getAccessorySelections().lockComponents).toEqual(existingStandaloneSelections)
    expect(apiMocks.saveWicketAccessoryComposition).toHaveBeenCalledWith(expect.objectContaining({
      lockComponents: existingStandaloneSelections,
    }))
    expect(apiMocks.saveWicketAccessoryComposition).not.toHaveBeenCalledWith(expect.objectContaining({
      lockComponents: expect.arrayContaining([
        expect.objectContaining({ materialItemId: 701 }),
      ]),
    }))
  })
})
