import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { WicketAccessoryCompositionResponse } from '../../app/api/wicket.types'
import { useWicketFormStore } from './wicketFormStore'

function composition(): WicketAccessoryCompositionResponse {
  const row = (materialItemId: number, relationRole: string) => ({
    id: materialItemId * 10,
    orderId: 42,
    statusId: 1,
    statusCode: 'draft',
    statusName: 'Черновик',
    lockVersion: 1,
    sortOrder: 1,
    isActive: true,
    quantity: '1',
    priceMode: 'auto',
    baseRetailUnitPrice: null,
    baseDealerUnitPrice: null,
    adjustmentType: 'none',
    adjustmentValue: null,
    retailUnitPrice: null,
    dealerUnitPrice: null,
    retailTotalPrice: null,
    dealerTotalPrice: null,
    allowedActions: [],
    productType: relationRole.endsWith('_installation') ? 'service' : 'material',
    rowKind: relationRole.endsWith('_installation') ? 'service' : 'material',
    modelId: null,
    parentProductRowId: 7,
    materialItemId,
    relationRole,
    name: `Item ${materialItemId}`,
    article: `A-${materialItemId}`,
    unit: { code: 'pcs', name: 'штука', symbol: 'шт' },
  })

  return {
    lockVersion: 8,
    lockComponents: [row(11, 'lock_component'), row(11, 'lock_component_installation'), row(12, 'lock_component')],
    skud: [row(21, 'skud_installation')],
    doorClosers: [row(31, 'door_closer')],
    bumpers: [],
    orderTotals: { priceRetail: null, priceDealer: null },
  } as unknown as WicketAccessoryCompositionResponse
}

describe('wicketFormStore accessory composition', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restores grouped selections and installation choices from canonical child rows', () => {
    const store = useWicketFormStore()

    store.applyAccessoryComposition(composition())

    expect(store.accessoryCompositionLockVersion).toBe(8)
    expect(store.lockComponentIds).toEqual([11, 12])
    expect(store.lockComponentsInstalled).toBe('Устанавливает изготовитель')
    expect(store.addons.skud).toMatchObject({
      isThere: 1,
      itemId: 21,
      itemIds: [21],
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает изготовитель',
    })
    expect(store.addons.doorCloser).toMatchObject({
      isThere: 1,
      itemId: 31,
      itemIds: [31],
      provided: 'Предоставляет изготовитель',
      installed: 'Устанавливает заказчик',
    })
    expect(store.addons.bumper.isThere).toBe(0)
  })

  it('builds complete canonical desired state without prices', () => {
    const store = useWicketFormStore()
    store.applyAccessoryComposition(composition())

    expect(store.getAccessorySelections()).toEqual({
      lockComponents: [
        { role: 'lock_component', materialItemId: 11, providedByManufacturer: true, installedByManufacturer: true },
        { role: 'lock_component', materialItemId: 12, providedByManufacturer: true, installedByManufacturer: false },
      ],
      skud: [
        { role: 'skud', materialItemId: 21, providedByManufacturer: false, installedByManufacturer: true },
      ],
      doorClosers: [
        { role: 'door_closer', materialItemId: 31, providedByManufacturer: true, installedByManufacturer: false },
      ],
      bumpers: [],
    })
  })
})
