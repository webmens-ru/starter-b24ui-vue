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
    skud: [row(21, 'skud'), row(22, 'skud_installation')],
    doorClosers: [row(31, 'door_closer')],
    bumpers: [],
    orderTotals: { priceRetail: null, priceDealer: null },
  } as unknown as WicketAccessoryCompositionResponse
}

describe('wicketFormStore accessory composition', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps manufacturer defaults when an empty canonical composition starts a fresh choice', () => {
    const store = useWicketFormStore()
    const empty = composition()
    empty.lockComponents = []
    empty.skud = []
    empty.doorClosers = []
    empty.bumpers = []

    store.applyAccessoryComposition(empty)

    expect(store.providesLock).toBe('Предоставляет изготовитель')
    expect(store.lockInstaller).toBe('Выполняет изготовитель')
    expect(store.addons.doorCloser).toMatchObject({
      isThere: 0,
      provided: 'Предоставляет изготовитель',
      installed: 'Устанавливает изготовитель',
    })
    expect(store.addons.bumper).toMatchObject({
      isThere: 0,
      provided: 'Предоставляет изготовитель',
      installed: 'Устанавливает изготовитель',
    })
  })

  it('restores grouped selections and installation choices from canonical child rows', () => {
    const store = useWicketFormStore()

    store.applyAccessoryComposition(composition())

    expect(store.accessoryCompositionLockVersion).toBe(8)
    expect(store.lockComponentIds).toEqual([11, 12])
    expect(store.lockComponentsInstalled).toBe('Устанавливает изготовитель')
    expect(store.addons.skud).toMatchObject({
      isThere: 1,
      itemId: 21,
      itemIds: [21, 22],
      provided: 'Предоставляет изготовитель',
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
        { role: 'skud', materialItemId: 21, providedByManufacturer: true, installedByManufacturer: false },
        { role: 'skud', materialItemId: 22, providedByManufacturer: false, installedByManufacturer: true },
      ],
      doorClosers: [
        { role: 'door_closer', materialItemId: 31, providedByManufacturer: true, installedByManufacturer: false },
      ],
      bumpers: [],
    })
  })

  it('round-trips mixed plural ownership and installation associations unchanged', () => {
    const store = useWicketFormStore()
    store.applyAccessoryComposition(composition())

    expect(store.getAccessorySelections()).toEqual({
      lockComponents: [
        { role: 'lock_component', materialItemId: 11, providedByManufacturer: true, installedByManufacturer: true },
        { role: 'lock_component', materialItemId: 12, providedByManufacturer: true, installedByManufacturer: false },
      ],
      skud: [
        { role: 'skud', materialItemId: 21, providedByManufacturer: true, installedByManufacturer: false },
        { role: 'skud', materialItemId: 22, providedByManufacturer: false, installedByManufacturer: true },
      ],
      doorClosers: [
        { role: 'door_closer', materialItemId: 31, providedByManufacturer: true, installedByManufacturer: false },
      ],
      bumpers: [],
    })
  })

  it('round-trips customer-owned lock, closer, and bumper installation tariffs unchanged', () => {
    const store = useWicketFormStore()
    store.lockInstaller = 'Выполняет заказчик'
    const source = composition()
    source.lockComponents = [source.lockComponents[1]]
    source.doorClosers = [{ ...source.doorClosers[0], productType: 'service', rowKind: 'service', relationRole: 'door_closer_installation' }]
    source.bumpers = [{ ...source.doorClosers[0], materialItemId: 41, productType: 'service', rowKind: 'service', relationRole: 'bumper_installation' }]

    store.applyAccessoryComposition(source)

    expect(store.providesLock).toBe('Предоставляет заказчик')
    expect(store.lockInstaller).toBe('Выполняет изготовитель')
    expect(store.addons.doorCloser).toMatchObject({
      itemId: 31,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает изготовитель',
    })
    expect(store.addons.bumper).toMatchObject({
      itemId: 41,
      provided: 'Предоставляет заказчик',
      installed: 'Устанавливает изготовитель',
    })
    expect(store.getAccessorySelections()).toMatchObject({
      lockComponents: [{ role: 'lock_component', materialItemId: 11, providedByManufacturer: false, installedByManufacturer: true }],
      doorClosers: [{ role: 'door_closer', materialItemId: 31, providedByManufacturer: false, installedByManufacturer: true }],
      bumpers: [{ role: 'bumper', materialItemId: 41, providedByManufacturer: false, installedByManufacturer: true }],
    })
  })
})
