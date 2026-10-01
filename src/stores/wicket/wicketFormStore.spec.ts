import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { WicketAccessoryCompositionResponse } from '../../app/api/wicket.types'
import { useWicketFormStore } from './wicketFormStore'
import { useWicketWizardStore } from './wicketWizardStore'

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

  it('empty canonical composition leaves root lock-set state unchanged', () => {
    const store = useWicketFormStore()
    store.lockSetId = 7
    store.providesLock = 'Предоставляет заказчик'
    store.lockInstaller = 'Выполняет заказчик'
    const empty = composition()
    empty.lockComponents = []
    empty.skud = []
    empty.doorClosers = []
    empty.bumpers = []

    store.applyAccessoryComposition(empty)

    expect(store.lockSetId).toBe(7)
    expect(store.providesLock).toBe('Предоставляет заказчик')
    expect(store.lockInstaller).toBe('Выполняет заказчик')
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

  it('round-trips standalone lock, closer, and bumper branches without changing root lock set', () => {
    const store = useWicketFormStore()
    store.lockSetId = 7
    store.providesLock = 'Предоставляет изготовитель'
    store.lockInstaller = 'Выполняет заказчик'
    const source = composition()
    source.lockComponents = [source.lockComponents[1]]
    source.doorClosers = [{ ...source.doorClosers[0], productType: 'service', rowKind: 'service', relationRole: 'door_closer_installation' }]
    source.bumpers = [{ ...source.doorClosers[0], materialItemId: 41, productType: 'service', rowKind: 'service', relationRole: 'bumper_installation' }]

    store.applyAccessoryComposition(source)

    expect(store.lockSetId).toBe(7)
    expect(store.providesLock).toBe('Предоставляет изготовитель')
    expect(store.lockInstaller).toBe('Выполняет заказчик')
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

  it('keeps legacy accessory selections while rebuilding a summary without standalone accessory blocks', () => {
    const store = useWicketFormStore()
    const source = composition()
    source.bumpers = [{
      ...source.doorClosers[0],
      materialItemId: 41,
      productType: 'material',
      rowKind: 'material',
      relationRole: 'bumper',
    }]

    store.applyAccessoryComposition(source)
    store.loadFromApi({ modelId: '1' })

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
      bumpers: [
        { role: 'bumper', materialItemId: 41, providedByManufacturer: true, installedByManufacturer: false },
      ],
    })
    const standaloneBlockNames = [
      'Комплектующие замка',
      'Доводчик',
      'Отбойник',
      'СКУД',
    ]
    for (const blockName of standaloneBlockNames) {
      expect(store.data.map(block => block.blockName)).not.toContain(blockName)
    }
  })

  it('удаляет самостоятельные шаги и заменяет шаг клиента расчётом при восстановлении', () => {
    const store = useWicketFormStore()
    const wizard = useWicketWizardStore()

    store.loadFromApi({
      modelId: '1',
      activePage: 'page11',
      visitedPages: [
        'page1',
        'page7',
        'page_lock_type',
        'page_lock_components',
        'page10',
        'page_door_closer',
        'page_bumper',
        'page_skud',
        'page11',
      ],
    })

    expect(wizard.activePage).toBe('page12')
    expect(wizard.visitedPages).toEqual([
      'page1',
      'page7',
      'page2',
      'page3',
      'page5',
      'page6',
      'page9',
      'page10',
      'page12',
      'page_lock_type',
    ])
  })

  it('falls back from a retired legacy active page without changing valid active-page restoration', () => {
    const store = useWicketFormStore()
    const wizard = useWicketWizardStore()
    const retiredPages = [
      'page_lock_components',
      'page_door_closer',
      'page_bumper',
      'page_skud',
    ]

    store.loadFromApi({
      modelId: '1',
      activePage: 'page_door_closer',
      visitedPages: ['page1', 'page7', 'page_lock_components', 'page10', 'page_door_closer'],
    })

    expect(wizard.activePage).toBe('page7')
    expect(wizard.visitedPages).toEqual(['page1', 'page7', 'page10'])
    for (const page of retiredPages) {
      expect(wizard.visitedPages).not.toContain(page)
    }

    store.loadFromApi({
      modelId: '1',
      activePage: 'page10',
      visitedPages: ['page1', 'page7', 'page10'],
    })

    expect(wizard.activePage).toBe('page10')
  })

  it.each(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])(
    'тип %s: заменяет сохранённый page11 расчётом даже без списка посещённых шагов',
    modelId => {
      const store = useWicketFormStore()
      const wizard = useWicketWizardStore()

      store.loadFromApi({ modelId, activePage: 'page11', visitedPages: [] })

      expect(wizard.activePage).toBe('page12')
      expect(wizard.visitedPages).toContain('page12')
      expect(wizard.isPageAccessible('page11')).toBe(false)
    },
  )

  it.each(['1', '2'])('тип %s: восстановление полного расчёта не создаёт шаг клиента', modelId => {
    const store = useWicketFormStore()
    const wizard = useWicketWizardStore()

    store.loadFromApi({
      modelId,
      widthProyema: '1000',
      heightProyema: '2000',
      fillSide: 'Одна сторона',
      idFacade: 5,
      shieldType: 'Тип_1',
      openingOptionId: 1,
      raspolozheniyePolotna: 'Вертикально',
      isTherePen: 0,
      priceRetail: '1000',
    })

    expect(wizard.visitedPages).toContain('page12')
    expect(wizard.isPageAccessible('page11')).toBe(false)
  })
})

describe('wicketFormStore restored shield summary', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe.each(['1', '11'])('model %s', modelId => {
    it.each([
      ['Тип_1', []],
      ['Тип_2', [{ name: 'Высота нижней части', value: '200' }]],
      ['Тип_3', [
        { name: 'Высота верхней части', value: '300' },
        { name: 'Высота нижней части', value: '200' },
      ]],
      ['Тип_4', [
        { name: 'Ширина боковой части', value: '100' },
        { name: 'Расположение решётки', value: 'Возле замка' },
      ]],
      ['Тип_5', [{ name: 'Высота верхней части', value: '300' }]],
    ] as const)('restores %s zone summary without mounting the form', (shieldType, zones) => {
      const store = useWicketFormStore()
      store.loadFromApi({
        modelId,
        shieldType,
        heightTopPart: '300',
        heightLowerPart: '200',
        widthSidePart: '100',
        grilleLocation: 'Возле замка',
        assortmentHeightUpperNetId: 31,
        netWidthProviderTop: 'executor',
        priceRetail: '1000',
        activePage: 'page12',
      })

      const shieldSummary = store.data.find(block => block.blockName === 'Тип щита')
      expect(shieldSummary?.params).toEqual([
        { name: 'Тип щита', value: shieldType },
        ...zones,
      ])
    })
  })
})
