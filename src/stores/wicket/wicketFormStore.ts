import { defineStore, storeToRefs } from 'pinia'
import { ref, computed } from 'vue'
import type { CalcBlock } from './types'
import type {
  WicketAccessoryCompositionResponse,
  WicketAccessoryRole,
  WicketAccessorySelectionPayload,
} from '../../app/api/wicket.types'
import { useWicketWizardStore } from './wicketWizardStore'
import { applyWicketApiPayloadForModel } from './wicketLoadApiByModel'
import { laterWizardStep, mergeVisitedPages, visitedPagesUpTo } from './wicketStepProgress'

/** Поля формы и сводка калитки (отдельно от сессии мастера `wicket-wizard`). */
export const useWicketFormStore = defineStore('wicket-form', () => {
  const data = ref<CalcBlock[]>([])

// Поля шага "Вариант изготовления"
const providesMaterial    = ref<string>('Предоставляет изготовитель')
const providesPaint       = ref<string>('Предоставляет изготовитель')
const doesPaintingFrame  = ref<string>('Выполняет изготовитель')
const doesAssembly        = ref<string>('Выполняет изготовитель')

// Поля шага "Заполнение"
const fillSide            = ref<string>('Одна сторона')
const materialFacadeGlob = ref<string>('Сайдинг')
const materialYardGlob   = ref<string | null>(null)

// Поля шага "Столбы / Вариант открытия / Перемычка"
const nalichieStolbovName       = ref<string>('Со столбами')
const hasStolby                  = ref<number>(1)
const stolbId                    = ref<string | number>('')
const stolbName                  = ref<string>('')
const openingOptionName         = ref<string>('')
const openingOptionId           = ref<number | null>(null)
const openingOptionPathPhoto   = ref<string>('')
const peremichkaPolozheniyeId   = ref<string>('')
const peremichkaPolozheniyeName = ref<string>('')
const assortmentJumperId        = ref<string | number | null>(null)
const peremichkaSortamentName   = ref<string | null>(null)

// Поля шага "Клиент"
const calculationName  = ref<string>('')
const clientName       = ref<string>('')
const clientLastName  = ref<string>('')
const clientSurname    = ref<string>('')
const clientPhone      = ref<string>('')
const clientEmail      = ref<string>('')
const clientAddress    = ref<string>('')
const clientComment    = ref<string>('')
const countryCode      = ref<string>('+7')

// Поля шага "Ручка" (дополнительная ручка / скоба)
const isTherePenName   = ref<string>('Не будет')
const isTherePen       = ref<number>(0)
const penProvided        = ref<string>('Предоставляет изготовитель')
const penInstalled       = ref<string>('Устанавливает изготовитель')
const penColor           = ref<string>('')
const penColorId         = ref<number | null>(null)
const additionalPenId     = ref<number | null>(null)
const additionalPenColor  = ref<string>('')
const additionalPenMarking = ref<string>('')

// Поля furniture-разделов (доводчик/отбойник/скуд)
type AddonKey = 'doorCloser' | 'bumper' | 'skud'
interface AddonState { isThere: number; provided: string; installed: string; itemId: number | null; marking: string; itemIds: number[] }
function emptyAddon(): AddonState {
  return { isThere: 0, provided: 'Предоставляет изготовитель', installed: 'Устанавливает изготовитель', itemId: null, marking: '', itemIds: [] }
}
const addons = ref<Record<AddonKey, AddonState>>({ doorCloser: emptyAddon(), bumper: emptyAddon(), skud: emptyAddon() })
interface AccessoryCatalogItem {
  id: number
  name: string
  article: string
  imageUrls: string[]
}
const addonItems = ref<Record<AddonKey, AccessoryCatalogItem[]>>({ doorCloser: [], bumper: [], skud: [] })
const availableSections = ref<string[]>([])
const accessoryCompositionLockVersion = ref<number | null>(null)
const accessorySaveGeneration = ref(0)
type AccessorySelections = {
  lockComponents: WicketAccessorySelectionPayload<'lock_component'>[]
  skud: WicketAccessorySelectionPayload<'skud'>[]
  doorClosers: WicketAccessorySelectionPayload<'door_closer'>[]
  bumpers: WicketAccessorySelectionPayload<'bumper'>[]
}
const accessorySelections = ref<AccessorySelections>({ lockComponents: [], skud: [], doorClosers: [], bumpers: [] })

// Поля шага "Тип замка" и ручки в комплекте
const typeLock      = ref<string>('Тип_1')
const lockSetId    = ref<number | null>(null)
const lockPenId    = ref<number | null>(null)
const lockPenColor = ref<string>('')
const lockPenColorId = ref<number | null>(null)
const lockComponentIds = ref<number[]>([])
const lockComponentsInstalled = ref<string>('Устанавливает изготовитель')

// Поля шага "Замок"
const isThereLockName = ref<string>('Есть')
const isThereLock     = ref<number>(1)
const providesLock      = ref<string>('Предоставляет изготовитель')
const lockInstaller     = ref<string>('Выполняет изготовитель')
const isThereCable     = ref<string>('Изготовитель устанавливает')

// Поля шага "Проем"
const widthProyema      = ref<string>('')
const heightProyema     = ref<string>('')
const clearanceProyema  = ref<string>('')
const sostoyaniyeProyema = ref<string>('Готов')

// Поля шага "Расположение полотна"
const raspolozheniyePolotna = ref<string>('Вертикально')

// Поля шага "Тип щита"
const shieldType       = ref<string>('Тип_1')
const colorShieldId   = ref<string | number>('')
const colorShieldName = ref<string>('')
const colorShieldHex  = ref<string>('')
const heightTopPart   = ref<string>('0')
const heightLowerPart = ref<string>('0')
const widthSidePart         = ref<string>('0')
const assortmentSideGrilleNetId = ref<string | number | null>(null)
const sideGrilleNetImage = ref<string>('')
const lowerGrilleNetImage = ref<string>('')
const upperGrilleNetImage = ref<string>('')
const assortmentHeightUpperNetId = ref<string | number | null>(null)
const assortmentHeightLowerNetId = ref<string | number | null>(null)
const grilleLocation         = ref<string>('Возле петель')
const netWidthProviderTop  = ref<string>('executor')
const netWidthProviderLower = ref<string>('executor')
const netWidthProviderSide  = ref<string>('executor')

// Поля шага "Заполнение (фасад)"
const idFacade                = ref<string | number>('')
const manufacturerFacadeId    = ref<string | number | null>(null)
const colorFacadeId           = ref<string | number | null>(null)
const materialSupplierFacade = ref<string>('')
const materialFacade          = ref<string>('')
const formFacade              = ref<string>('')
const thicknessFacade         = ref<string>('')
const typeOfCoatingFacade   = ref<string>('')
const colorFacade             = ref<string>('')
const colorFacadeHex          = ref<string>('')
const colorFacadeImage        = ref<string>('')
const coatingFacadeHex        = ref<string>('')
const coatingFacadeImage      = ref<string>('')
const reliefFacadeImage       = ref<string>('')
const colorFacadeReverseHex   = ref<string>('')
const colorFacadeReverseImage = ref<string>('')
const gapId                    = ref<number | null>(null)
const gapName                  = ref<number | null>(null)
const numberOfSticks           = ref<number | null>(null)

// Поля шага "Заполнение (двор)"
const idYard                = ref<string | number>('')
const manufacturerYardId    = ref<string | number | null>(null)
const colorYardId           = ref<string | number | null>(null)
const materialSupplierYard = ref<string>('')
const materialYard          = ref<string>('')
const formYard              = ref<string>('')
const thicknessYard         = ref<string>('')
const typeOfCoatingYard   = ref<string>('')
const colorYard             = ref<string>('')
const colorYardHex          = ref<string>('')
const colorYardImage        = ref<string>('')
const coatingYardHex        = ref<string>('')
const coatingYardImage      = ref<string>('')
const reliefYardImage       = ref<string>('')

// Цена
const priceRetail  = ref<string | number>('')
const priceDealer  = ref<string | number>('')
const fieldsFilled = ref<number>(0)

  /** Раздел «Заполнение» неполный: сброшен материал или не выбран материал двора при «Две стороны». */
  const isFillSectionIncomplete = computed(() => {
    const hasFacade = idFacade.value != null && String(idFacade.value).trim() !== ''
    const needYard = fillSide.value === 'Две стороны'
    const hasYard = idYard.value != null && String(idYard.value).trim() !== ''
    return !hasFacade || (needYard && !hasYard)
  })

  function updateOrCreateBlock(blockName: string, params: CalcBlock['params']) {
    const block = data.value.find(b => b.blockName === blockName)
    if (block) {
      block.params = params
    } else {
      data.value.push({ blockName, params })
    }
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function removeAllBlocksExcept(allowedBlockNames: string[]) {
    data.value = data.value.filter(b => allowedBlockNames.includes(b.blockName))
    document.dispatchEvent(new Event('dataUpdated'))
  }

  /** Сброс полей формы (сессия заказа/шагов — в `wicket-wizard`). */
  function resetFormFields() {
    data.value = []
    priceRetail.value = ''
    priceDealer.value = ''
    providesMaterial.value = 'Предоставляет изготовитель'
    providesPaint.value = 'Предоставляет изготовитель'
    doesPaintingFrame.value = 'Выполняет изготовитель'
    doesAssembly.value = 'Выполняет изготовитель'
    fillSide.value = 'Одна сторона'
    materialFacadeGlob.value = 'Сайдинг'
    materialYardGlob.value = null
    nalichieStolbovName.value = 'Со столбами'
    hasStolby.value = 1
    stolbId.value = ''
    stolbName.value = ''
    openingOptionName.value = ''
    openingOptionId.value = null
    openingOptionPathPhoto.value = ''
    peremichkaPolozheniyeId.value = ''
    peremichkaPolozheniyeName.value = ''
    assortmentJumperId.value = null
    peremichkaSortamentName.value = null
    calculationName.value = ''
    clientName.value = ''
    clientLastName.value = ''
    clientSurname.value = ''
    clientPhone.value = ''
    clientEmail.value = ''
    clientAddress.value = ''
    clientComment.value = ''
    countryCode.value = '+7'
    isTherePenName.value = 'Не будет'
    isTherePen.value = 0
    penProvided.value = 'Предоставляет изготовитель'
    penInstalled.value = 'Устанавливает изготовитель'
    penColor.value = ''
    penColorId.value = null
    additionalPenId.value = null
    additionalPenColor.value = ''
    additionalPenMarking.value = ''
    addons.value = { doorCloser: emptyAddon(), bumper: emptyAddon(), skud: emptyAddon() }
    addonItems.value = { doorCloser: [], bumper: [], skud: [] }
    availableSections.value = []
    accessoryCompositionLockVersion.value = null
    accessorySaveGeneration.value += 1
    accessorySelections.value = { lockComponents: [], skud: [], doorClosers: [], bumpers: [] }
    typeLock.value = 'Тип_1'
    lockSetId.value = null
    lockPenId.value = null
    lockPenColor.value = ''
    lockPenColorId.value = null
    lockComponentIds.value = []
    lockComponentsInstalled.value = 'Устанавливает изготовитель'
    isThereLockName.value = 'Есть'
    isThereLock.value = 1
    providesLock.value = 'Предоставляет изготовитель'
    lockInstaller.value = 'Выполняет изготовитель'
    isThereCable.value = 'Изготовитель устанавливает'
    widthProyema.value = ''
    heightProyema.value = ''
    clearanceProyema.value = ''
    sostoyaniyeProyema.value = 'Готов'
    raspolozheniyePolotna.value = 'Вертикально'
    shieldType.value = 'Тип_1'
    colorShieldId.value = ''
    colorShieldName.value = ''
    colorShieldHex.value = ''
    heightTopPart.value = '0'
    heightLowerPart.value = '0'
    widthSidePart.value = '0'
    assortmentSideGrilleNetId.value = null
    sideGrilleNetImage.value = ''
    lowerGrilleNetImage.value = ''
    upperGrilleNetImage.value = ''
    assortmentHeightUpperNetId.value = null
    assortmentHeightLowerNetId.value = null
    grilleLocation.value = 'Возле петель'
    netWidthProviderTop.value = 'executor'
    netWidthProviderLower.value = 'executor'
    netWidthProviderSide.value = 'executor'
    idFacade.value = ''
    manufacturerFacadeId.value = null
    colorFacadeId.value = null
    materialSupplierFacade.value = ''
    materialFacade.value = ''
    formFacade.value = ''
    thicknessFacade.value = ''
    typeOfCoatingFacade.value = ''
    colorFacade.value = ''
    colorFacadeHex.value = ''
    colorFacadeImage.value = ''
    coatingFacadeHex.value = ''
    coatingFacadeImage.value = ''
    reliefFacadeImage.value = ''
    colorFacadeReverseHex.value = ''
    gapId.value = null
    gapName.value = null
    numberOfSticks.value = null
    colorFacadeReverseImage.value = ''
    idYard.value = ''
    manufacturerYardId.value = null
    colorYardId.value = null
    materialSupplierYard.value = ''
    materialYard.value = ''
    formYard.value = ''
    thicknessYard.value = ''
    typeOfCoatingYard.value = ''
    colorYard.value = ''
    colorYardHex.value = ''
    colorYardImage.value = ''
    coatingYardHex.value = ''
    coatingYardImage.value = ''
    reliefYardImage.value = ''
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function updatePriceBlock(dealer: string | number, retail: string | number) {
    priceDealer.value = dealer
    priceRetail.value = retail
    updateOrCreateBlock('Цена', [
      { name: 'Дилерская цена', value: String(dealer) },
      { name: 'Рек. розн. цена', value: String(retail) },
    ])
  }

  function selectionsFromRows<Role extends WicketAccessoryRole>(
    rows: WicketAccessoryCompositionResponse[
      Role extends 'lock_component' ? 'lockComponents'
        : Role extends 'skud' ? 'skud'
          : Role extends 'door_closer' ? 'doorClosers'
            : 'bumpers'
    ],
    role: Role,
  ): WicketAccessorySelectionPayload<Role>[] {
    const selections = new Map<number, WicketAccessorySelectionPayload<Role>>()
    for (const row of rows) {
      const materialItemId = Number(row.materialItemId)
      if (!Number.isSafeInteger(materialItemId) || materialItemId <= 0) continue
      const selection = selections.get(materialItemId) ?? {
        role,
        materialItemId,
        providedByManufacturer: false,
        installedByManufacturer: false,
      }
      if (row.relationRole === role) selection.providedByManufacturer = true
      if (row.relationRole === `${role}_installation`) selection.installedByManufacturer = true
      selections.set(materialItemId, selection)
    }
    return [...selections.values()]
  }

  function applyAddonSelections(key: AddonKey, selections: WicketAccessorySelectionPayload[]): void {
    const state = addons.value[key]
    const ids = selections.map(selection => selection.materialItemId)
    const first = selections[0]
    state.isThere = first ? 1 : 0
    state.itemId = first?.materialItemId ?? null
    state.itemIds = ids
    state.provided = first?.providedByManufacturer
      ? 'Предоставляет изготовитель'
      : 'Предоставляет заказчик'
    state.installed = selections.some(selection => selection.installedByManufacturer)
      ? 'Устанавливает изготовитель'
      : 'Устанавливает заказчик'
  }

  function applyAccessoryComposition(composition: WicketAccessoryCompositionResponse): void {
    accessoryCompositionLockVersion.value = composition.lockVersion
    const lockSelections = selectionsFromRows(composition.lockComponents, 'lock_component')
    const skudSelections = selectionsFromRows(composition.skud, 'skud')
    const doorCloserSelections = selectionsFromRows(composition.doorClosers, 'door_closer')
    const bumperSelections = selectionsFromRows(composition.bumpers, 'bumper')
    accessorySelections.value = {
      lockComponents: lockSelections,
      skud: skudSelections,
      doorClosers: doorCloserSelections,
      bumpers: bumperSelections,
    }
    lockComponentIds.value = lockSelections.map(selection => selection.materialItemId)
    lockComponentsInstalled.value = lockSelections.some(selection => selection.installedByManufacturer)
      ? 'Устанавливает изготовитель'
      : 'Устанавливает заказчик'
    providesLock.value = lockSelections.some(selection => selection.providedByManufacturer)
      ? 'Предоставляет изготовитель'
      : 'Предоставляет заказчик'
    isThereLock.value = lockSelections.length > 0 ? 1 : 0
    isThereLockName.value = lockSelections.length > 0 ? 'Есть' : 'Нет'
    applyAddonSelections('skud', skudSelections)
    applyAddonSelections('doorCloser', doorCloserSelections)
    applyAddonSelections('bumper', bumperSelections)
  }

  function getAccessorySelections(): {
    lockComponents: WicketAccessorySelectionPayload<'lock_component'>[]
    skud: WicketAccessorySelectionPayload<'skud'>[]
    doorClosers: WicketAccessorySelectionPayload<'door_closer'>[]
    bumpers: WicketAccessorySelectionPayload<'bumper'>[]
  } {
    return {
      lockComponents: accessorySelections.value.lockComponents.map(selection => ({ ...selection })),
      skud: accessorySelections.value.skud.map(selection => ({ ...selection })),
      doorClosers: accessorySelections.value.doorClosers.map(selection => ({ ...selection })),
      bumpers: accessorySelections.value.bumpers.map(selection => ({ ...selection })),
    }
  }

  function selectionBucket(role: WicketAccessoryRole): WicketAccessorySelectionPayload[] {
    if (role === 'lock_component') return accessorySelections.value.lockComponents
    if (role === 'skud') return accessorySelections.value.skud
    if (role === 'door_closer') return accessorySelections.value.doorClosers
    return accessorySelections.value.bumpers
  }

  function setAccessorySelections(
    role: WicketAccessoryRole,
    selections: WicketAccessorySelectionPayload[],
  ): void {
    const exact = selections
      .filter(selection => selection.role === role)
      .map(selection => ({ ...selection }))
    if (role === 'lock_component') accessorySelections.value.lockComponents = exact as WicketAccessorySelectionPayload<'lock_component'>[]
    else if (role === 'skud') accessorySelections.value.skud = exact as WicketAccessorySelectionPayload<'skud'>[]
    else if (role === 'door_closer') accessorySelections.value.doorClosers = exact as WicketAccessorySelectionPayload<'door_closer'>[]
    else accessorySelections.value.bumpers = exact as WicketAccessorySelectionPayload<'bumper'>[]
  }

  function replaceAccessorySelectionIds(
    role: WicketAccessoryRole,
    ids: number[],
    defaults: { providedByManufacturer: boolean; installedByManufacturer: boolean } = {
      providedByManufacturer: true,
      installedByManufacturer: false,
    },
  ): void {
    const uniqueIds = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))]
    const existing = new Map(selectionBucket(role).map(selection => [selection.materialItemId, selection]))
    const next = uniqueIds.map((materialItemId, index): WicketAccessorySelectionPayload => ({
      role,
      materialItemId,
      providedByManufacturer: existing.get(materialItemId)?.providedByManufacturer ?? defaults.providedByManufacturer,
      installedByManufacturer: existing.get(materialItemId)?.installedByManufacturer
        ?? (defaults.installedByManufacturer && index === 0),
    }))
    if (role === 'lock_component') accessorySelections.value.lockComponents = next as WicketAccessorySelectionPayload<'lock_component'>[]
    else if (role === 'skud') accessorySelections.value.skud = next as WicketAccessorySelectionPayload<'skud'>[]
    else if (role === 'door_closer') accessorySelections.value.doorClosers = next as WicketAccessorySelectionPayload<'door_closer'>[]
    else accessorySelections.value.bumpers = next as WicketAccessorySelectionPayload<'bumper'>[]
  }

  function setAccessoryGroupProvided(role: WicketAccessoryRole, providedByManufacturer: boolean): void {
    selectionBucket(role).forEach(selection => { selection.providedByManufacturer = providedByManufacturer })
  }

  function setAccessoryGroupInstalled(role: WicketAccessoryRole, installedByManufacturer: boolean): void {
    selectionBucket(role).forEach((selection, index) => {
      selection.installedByManufacturer = installedByManufacturer && index === 0
    })
  }

  function clearAccessorySelections(role: WicketAccessoryRole): void {
    replaceAccessorySelectionIds(role, [])
  }

  function beginAccessorySave(): number {
    accessorySaveGeneration.value += 1
    return accessorySaveGeneration.value
  }

  function isCurrentAccessorySave(generation: number): boolean {
    return accessorySaveGeneration.value === generation
  }

  /**
   * Вычисляет visitedPages и activePage по текущему состоянию ref'ов.
   * Используется при пустом visitedPages из API (старые заказы).
   * Логика повторяет BaseModel::isStepCompleted / getReachedStepProgress.
   */
  function computeProgressFromState(apiData?: Record<string, unknown>): { visitedPages: string[]; activePage: string } {
    const modelId = String(apiData?.modelId ?? useWicketWizardStore().modelId ?? '')
    const addonPages = ['page_door_closer', 'page_bumper', 'page_skud'].filter(page => availableSections.value.includes(page))
    const stepOrder = modelId === '2'
      ? [
          'page1',
          'page7',
          'page2',
          'page2_facade_profnastil',
          'page5',
          'page3',
          'page6',
          'page9',
          'page_lock_type',
          'page_lock_components',
          'page10',
          ...addonPages,
          'page11',
          'page12',
        ]
      : ['page1', 'page7', 'page2', 'page3', 'page5', 'page6', 'page9', 'page10', 'page11', 'page12']
    const visited: string[] = []
    let active = 'page1'

    function notEmpty(v: unknown): boolean {
      return v != null && String(v).trim() !== ''
    }
    function numGt(key: string | number, n: number): boolean {
      const v = typeof key === 'number' ? key : Number(key)
      return !isNaN(v) && v > n
    }

    for (const pageId of stepOrder) {
      let completed = false
      switch (pageId) {
        case 'page1':
          completed = notEmpty(providesMaterial.value) && notEmpty(providesPaint.value) && notEmpty(doesPaintingFrame.value)
          break
        case 'page2':
          completed = notEmpty(fillSide.value) || !!(idFacade.value && String(idFacade.value)) || !!(idYard.value && String(idYard.value))
          break
        case 'page2_facade_profnastil':
          completed = !!(idFacade.value && String(idFacade.value))
          break
        case 'page3':
          completed = notEmpty(shieldType.value)
          break
        case 'page5':
          completed = openingOptionId.value != null && (Number(openingOptionId.value) || 0) > 0
          break
        case 'page6':
          completed = notEmpty(raspolozheniyePolotna.value)
          break
        case 'page7':
          completed = numGt(widthProyema.value as string | number, 0) && numGt(heightProyema.value as string | number, 0)
          break
        case 'page9':
          completed = isThereLock.value !== null
          break
        case 'page_lock_type':
          completed = isThereLock.value !== 1 || providesLock.value === 'Предоставляет заказчик' || lockComponentIds.value.length > 0
          break
        case 'page_lock_components':
          completed = isThereLock.value !== 1 || providesLock.value === 'Предоставляет заказчик' || lockComponentIds.value.length > 0
          break
        case 'page10':
          completed = isTherePen.value !== null
          break
        case 'page_door_closer':
          completed = addons.value.doorCloser.isThere !== null
          break
        case 'page_bumper':
          completed = addons.value.bumper.isThere !== null
          break
        case 'page_skud':
          completed = addons.value.skud.isThere !== null
          break
        case 'page11': {
          const snap = apiData?.client_snapshot
          const hasSnapshot = snap != null && String(snap).trim() !== ''
          const hasClient = notEmpty(clientName.value) || notEmpty(clientPhone.value) || notEmpty(clientEmail.value) || notEmpty(clientAddress.value)
          completed = hasSnapshot || hasClient
          break
        }
        case 'page12':
          completed = notEmpty(priceRetail.value)
          break
        default:
          break
      }
      if (completed) {
        visited.push(pageId)
        active = pageId
      } else {
        active = pageId
        break
      }
    }
    return { visitedPages: visited, activePage: active }
  }

  /** Заполняет состояние из ответа API get-data (редактирование расчёта). */
  function loadFromApi(apiData: Record<string, unknown>) {
    const wizard = useWicketWizardStore()
    const w = storeToRefs(wizard)
    const refMap: Record<string, { value: unknown }> = {
      orderId: w.orderId,
      productRowId: w.productRowId,
      modelId: w.modelId,
      productType: w.productType,
      model: w.model,
      providesMaterial,
      providesPaint,
      doesPaintingFrame,
      doesAssembly,
      fillSide,
      materialFacadeGlob,
      materialYardGlob,
      nalichieStolbovName,
      hasStolby,
      stolbId,
      stolbName,
      openingOptionName,
      openingOptionId,
      openingOptionPathPhoto,
      peremichkaPolozheniyeId,
      peremichkaPolozheniyeName,
      assortmentJumperId,
      peremichkaSortamentName,
      calculationName,
      clientName,
      clientLastName,
      clientSurname,
      clientPhone,
      clientEmail,
      clientAddress,
      clientComment,
      countryCode,
      isTherePenName,
      isTherePen,
      penProvided,
      penInstalled,
      penColor,
      penColorId,
      additionalPenId,
      additionalPenColor,
      additionalPenMarking,
      typeLock,
      lockSetId,
      lockPenId,
      lockPenColor,
      lockPenColorId,
    lockComponentIds,
    lockComponentsInstalled,
      isThereLockName,
      isThereLock,
      providesLock,
      lockInstaller,
      isThereCable,
      widthProyema,
      heightProyema,
      clearanceProyema,
      sostoyaniyeProyema,
      raspolozheniyePolotna,
      shieldType,
      colorShieldId,
      colorShieldName,
      colorShieldHex,
      heightTopPart,
      heightLowerPart,
      widthSidePart,
      assortmentSideGrilleNetId,
      sideGrilleNetImage,
      lowerGrilleNetImage,
      upperGrilleNetImage,
      assortmentHeightUpperNetId,
      assortmentHeightLowerNetId,
      grilleLocation,
      netWidthProviderTop,
      netWidthProviderLower,
      netWidthProviderSide,
      idFacade,
      manufacturerFacadeId,
      colorFacadeId,
      materialSupplierFacade,
      materialFacade,
      formFacade,
      thicknessFacade,
      typeOfCoatingFacade,
      colorFacade,
      colorFacadeHex,
      colorFacadeImage,
      coatingFacadeHex,
      coatingFacadeImage,
      reliefFacadeImage,
      colorFacadeReverseHex,
      colorFacadeReverseImage,
      gapId,
      gapName,
      numberOfSticks,
      idYard,
      manufacturerYardId,
      colorYardId,
      materialSupplierYard,
      materialYard,
      formYard,
      thicknessYard,
      typeOfCoatingYard,
      colorYard,
      colorYardHex,
      colorYardImage,
      coatingYardHex,
      coatingYardImage,
      reliefYardImage,
      priceRetail,
      priceDealer,
    }

    const modelIdForLoad = String(
      apiData.modelId != null && apiData.modelId !== ''
        ? apiData.modelId
        : (w.modelId.value ?? ''),
    )
    if (import.meta.env.DEV && modelIdForLoad === '2') {
      console.info('[type2-drawing] API get-data', {
        idFacade: apiData.idFacade,
        colorFacade: apiData.colorFacade,
        colorFacadeHex: apiData.colorFacadeHex,
        colorFacadeImage: apiData.colorFacadeImage,
      })
    }
    applyWicketApiPayloadForModel(modelIdForLoad, apiData, refMap)
    if (import.meta.env.DEV && modelIdForLoad === '2') {
      console.info('[type2-drawing] Pinia after loadFromApi', {
        idFacade: idFacade.value,
        colorFacade: colorFacade.value,
        colorFacadeHex: colorFacadeHex.value,
        colorFacadeImage: colorFacadeImage.value,
      })
    }

    // Когда additionalPenId задан, цвет хранится в penColor — синхронизируем additionalPenColor
    if (additionalPenId.value != null && penColor.value && !additionalPenColor.value) {
      additionalPenColor.value = penColor.value
    }

    // Прогресс мастера: reachedStep из API; при уже рассчитанной цене — последний шаг page12.
    const apiVisited = Array.isArray(apiData.visitedPages)
      ? (apiData.visitedPages as string[])
      : []
    const apiActive =
      typeof apiData.activePage === 'string' && apiData.activePage
        ? apiData.activePage
        : 'page1'
    const hasPrice =
      (priceRetail.value !== null && priceRetail.value !== '' && String(priceRetail.value).trim() !== '')
      || (apiData.priceRetail !== null && apiData.priceRetail !== undefined && String(apiData.priceRetail).trim() !== '')

    let active = apiActive
    if (hasPrice) {
      active = laterWizardStep(active, 'page12')
    } else if (apiVisited.length === 0) {
      active = computeProgressFromState(apiData).activePage
    }

    const computedProgress = computeProgressFromState(apiData)
    const shouldStartFromFirstPage = modelIdForLoad === '2'
    w.activePage.value = shouldStartFromFirstPage ? 'page1' : active
    w.visitedPages.value =
      apiVisited.length > 0
        ? mergeVisitedPages(visitedPagesUpTo(active, apiVisited), computedProgress.visitedPages)
        : computedProgress.visitedPages

    // Восстанавливаем блоки сводки из загруженных данных
    rebuildSummaryBlocks()
  }

  /** Собирает блоки сводки из текущего состояния (для редактирования и синхронизации). */
  function rebuildSummaryBlocks() {
    const blocks: CalcBlock[] = []

    // Вариант изготовления
    blocks.push({
      blockName: 'Вариант изготовления',
      params: [
        { name: 'Материал заполнения', value: providesMaterial.value },
        { name: 'Краска', value: providesPaint.value },
        { name: 'Окраска каркаса', value: doesPaintingFrame.value },
        { name: 'Сборка', value: doesAssembly.value },
      ],
    })

    // Заполнение
    const fillParams: CalcBlock['params'] = [
      { name: 'Сторона заполнения', value: fillSide.value },
      { name: 'Материал заполнения (фасад)', value: materialFacadeGlob.value },
    ]
    if (fillSide.value === 'Две стороны') {
      fillParams.push({ name: 'Материал заполнения (двор)', value: materialYardGlob.value ?? '' })
    }
    blocks.push({ blockName: 'Заполнение', params: fillParams })

    // Заполнение (фасад) — сайдинг или профлист
    if (idFacade.value || materialFacade.value) {
      const isProfnastil = materialFacadeGlob.value === 'Профлист'
      blocks.push({
        blockName: 'Заполнение (фасад)',
        params: isProfnastil
          ? [
              { name: 'Производитель материала', value: materialSupplierFacade.value },
              { name: 'Материал', value: materialFacade.value },
              { name: 'Толщина листа', value: thicknessFacade.value },
              { name: 'Тип покрытия', value: typeOfCoatingFacade.value },
              { name: 'Цвет', value: colorFacade.value },
            ]
          : [
              { name: 'Производитель материала', value: materialSupplierFacade.value },
              { name: 'Материал', value: materialFacade.value },
              { name: 'Форма', value: formFacade.value },
              { name: 'Тип покрытия', value: typeOfCoatingFacade.value },
              { name: 'Цвет', value: colorFacade.value },
            ],
      })
    }

    // Заполнение (двор) — только при "Две стороны"
    if (fillSide.value === 'Две стороны' && (idYard.value || materialYard.value)) {
      const isProfnastil = materialYardGlob.value === 'Профлист'
      blocks.push({
        blockName: 'Заполнение (двор)',
        params: isProfnastil
          ? [
              { name: 'Производитель материала', value: materialSupplierYard.value },
              { name: 'Материал', value: materialYard.value },
              { name: 'Толщина листа', value: thicknessYard.value },
              { name: 'Тип покрытия', value: typeOfCoatingYard.value },
              { name: 'Цвет', value: colorYard.value },
            ]
          : [
              { name: 'Производитель материала', value: materialSupplierYard.value },
              { name: 'Материал', value: materialYard.value },
              { name: 'Форма', value: formYard.value },
              { name: 'Тип покрытия', value: typeOfCoatingYard.value },
              { name: 'Цвет', value: colorYard.value },
            ],
      })
    }

    // Столбы / вариант открытия / перемычка
    const stolbParams: CalcBlock['params'] = [
      { name: 'Наличие столбов', value: nalichieStolbovName.value },
    ]
    if (hasStolby.value === 1 && stolbName.value) {
      stolbParams.push({ name: 'Сортамент столбов', value: stolbName.value })
    }
    if (openingOptionName.value) {
      stolbParams.push({ name: 'Вариант открытия', value: openingOptionName.value })
    }
    if (peremichkaPolozheniyeName.value) {
      stolbParams.push({ name: 'Положение перемычки', value: peremichkaPolozheniyeName.value })
    }
    if (peremichkaSortamentName.value) {
      stolbParams.push({ name: 'Сортамент перемычки', value: peremichkaSortamentName.value })
    }
    blocks.push({ blockName: 'Столбы / вариант открытия / перемычка', params: stolbParams })

    // Тип щита
    const shieldParams: CalcBlock['params'] = [
      { name: 'Тип щита', value: shieldType.value },
    ]
    if (colorShieldName.value) {
      shieldParams.push({ name: 'Цвет рамы', value: colorShieldName.value })
    }
    if (shieldType.value === 'Тип_3' && heightTopPart.value && heightTopPart.value !== '0') {
      shieldParams.push({ name: 'Высота верхней части', value: heightTopPart.value })
    }
    if ((shieldType.value === 'Тип_2' || shieldType.value === 'Тип_3') && heightLowerPart.value && heightLowerPart.value !== '0') {
      shieldParams.push({ name: 'Высота нижней части', value: heightLowerPart.value })
    }
    if (shieldType.value === 'Тип_4') {
      if (widthSidePart.value && widthSidePart.value !== '0') {
        shieldParams.push({ name: 'Ширина боковой части', value: widthSidePart.value })
      }
      if (grilleLocation.value) {
        shieldParams.push({ name: 'Расположение решётки', value: grilleLocation.value })
      }
    }
    blocks.push({ blockName: 'Тип щита', params: shieldParams })

    // Расположение полотна
    blocks.push({
      blockName: 'Расположение полотна',
      params: [{ name: 'Расположение полотна', value: raspolozheniyePolotna.value }],
    })

    // Проем
    if (widthProyema.value || heightProyema.value || clearanceProyema.value) {
      blocks.push({
        blockName: 'Проем',
        params: [
          { name: 'Ширина', value: widthProyema.value },
          { name: 'Высота', value: heightProyema.value },
          { name: 'Просвет', value: clearanceProyema.value },
          { name: 'Состояние проема', value: sostoyaniyeProyema.value },
        ],
      })
    }

    // Замок
    const lockParams: CalcBlock['params'] = [
      { name: 'Замок есть/нет', value: isThereLockName.value },
    ]
    if (isThereLock.value === 1) {
      lockParams.push({ name: 'Замок предоставляет', value: providesLock.value })
      lockParams.push({ name: 'Врезку замка выполняет', value: lockInstaller.value })
      lockParams.push({ name: 'Кабель для э/м замка', value: isThereCable.value })
      lockParams.push({ name: 'Тип замка', value: typeLock.value || '' })
      if (lockPenId.value != null) {
        lockParams.push({ name: 'Цвет ручки', value: lockPenColor.value })
      }
    }
    blocks.push({ blockName: 'Замок', params: lockParams })

    // Дополнительная ручка (скоба)
    const penParams: CalcBlock['params'] = [
      { name: 'Дополнительная ручка', value: isTherePenName.value },
    ]
    if (isTherePen.value === 1) {
      penParams.push({ name: 'Ручку предоставляет', value: penProvided.value })
      penParams.push({ name: 'Ручку устанавливает', value: penInstalled.value })
      if (penProvided.value === 'Предоставляет изготовитель') {
        if (additionalPenId.value != null && additionalPenMarking.value) {
          penParams.push({ name: 'Модель ручки', value: additionalPenMarking.value })
        }
        penParams.push({ name: 'Цвет ручки', value: additionalPenColor.value || penColor.value })
      }
    }
    blocks.push({ blockName: 'Дополнительная ручка (скоба)', params: penParams })

    // Доводчик / Отбойник / СКУД
    for (const [key, label] of [['doorCloser', 'Доводчик'], ['bumper', 'Отбойник'], ['skud', 'СКУД']] as const) {
      const ad = addons.value[key]
      const p: CalcBlock['params'] = [{ name: label, value: ad.isThere === 1 ? 'Будет' : 'Не будет' }]
      if (ad.isThere === 1) {
        p.push({ name: 'Предоставляет', value: ad.provided })
        p.push({ name: 'Устанавливает', value: ad.installed })
        if (ad.provided === 'Предоставляет изготовитель') {
          if (key === 'skud' && ad.itemIds.length > 0) {
            const skudItems = addonItems.value.skud
            const selectedMarkings = ad.itemIds
              .map(id => skudItems.find(i => i.id === id)?.name)
              .filter(Boolean)
            if (selectedMarkings.length > 0) {
              p.push({ name: 'Модели', value: selectedMarkings.join(', ') })
            }
          } else if (ad.itemId != null && ad.marking) {
            p.push({ name: 'Модель', value: ad.marking })
          }
        }
      }
      blocks.push({ blockName: label, params: p })
    }

    // Клиент
    blocks.push({
      blockName: 'Клиент',
      params: [
        { name: 'Название расчета', value: calculationName.value },
        { name: 'Имя', value: clientName.value },
        { name: 'Фамилия', value: clientLastName.value },
        { name: 'Отчество', value: clientSurname.value },
        { name: 'Телефон', value: clientPhone.value },
        { name: 'Эл. почта', value: clientEmail.value },
        { name: 'Адрес', value: clientAddress.value },
        { name: 'Комментарий', value: clientComment.value },
      ],
    })

    // Цена
    if (priceDealer.value || priceRetail.value) {
      blocks.push({
        blockName: 'Цена',
        params: [
          { name: 'Дилерская цена', value: String(priceDealer.value) },
          { name: 'Рек. розн. цена', value: String(priceRetail.value) },
        ],
      })
    }

    data.value = blocks
    document.dispatchEvent(new Event('dataUpdated'))
  }

  return {
    data,
    providesMaterial,
    providesPaint,
    doesPaintingFrame,
    doesAssembly,
    fillSide,
    materialFacadeGlob,
    materialYardGlob,
    nalichieStolbovName,
    hasStolby,
    stolbId,
    stolbName,
    openingOptionName,
    openingOptionId,
    openingOptionPathPhoto,
    peremichkaPolozheniyeId,
    peremichkaPolozheniyeName,
    assortmentJumperId,
    peremichkaSortamentName,
    calculationName,
    clientName,
    clientLastName,
    clientSurname,
    clientPhone,
    clientEmail,
    clientAddress,
    clientComment,
    countryCode,
    isTherePenName,
    isTherePen,
    penProvided,
    penInstalled,
    penColor,
    penColorId,
    additionalPenMarking,
    additionalPenId,
    additionalPenColor,
    typeLock,
    lockSetId,
    lockPenId,
    lockPenColor,
    lockPenColorId,
    lockComponentIds,
    lockComponentsInstalled,
    isThereLockName,
    isThereLock,
    providesLock,
    lockInstaller,
    isThereCable,
    widthProyema,
    heightProyema,
    clearanceProyema,
    sostoyaniyeProyema,
    raspolozheniyePolotna,
    shieldType,
    colorShieldId,
    colorShieldName,
    colorShieldHex,
    heightTopPart,
    heightLowerPart,
    widthSidePart,
    assortmentSideGrilleNetId,
    sideGrilleNetImage,
    lowerGrilleNetImage,
    upperGrilleNetImage,
    assortmentHeightUpperNetId,
    assortmentHeightLowerNetId,
    grilleLocation,
    netWidthProviderTop,
    netWidthProviderLower,
    netWidthProviderSide,
    idFacade,
    manufacturerFacadeId,
    colorFacadeId,
    materialSupplierFacade,
    materialFacade,
    formFacade,
    thicknessFacade,
    typeOfCoatingFacade,
    colorFacade,
    colorFacadeHex,
    colorFacadeImage,
    coatingFacadeHex,
    coatingFacadeImage,
    reliefFacadeImage,
    colorFacadeReverseHex,
    colorFacadeReverseImage,
    gapId,
    gapName,
    numberOfSticks,
    idYard,
    manufacturerYardId,
    colorYardId,
    materialSupplierYard,
    materialYard,
    formYard,
    thicknessYard,
    typeOfCoatingYard,
    colorYard,
    colorYardHex,
    colorYardImage,
    coatingYardHex,
    coatingYardImage,
    reliefYardImage,
    priceRetail,
    priceDealer,
    fieldsFilled,
    isFillSectionIncomplete,
    updateOrCreateBlock,
    removeAllBlocksExcept,
    updatePriceBlock,
    loadFromApi,
    resetFormFields,
    addons,
    addonItems,
    availableSections,
    accessoryCompositionLockVersion,
    applyAccessoryComposition,
    getAccessorySelections,
    replaceAccessorySelectionIds,
    setAccessorySelections,
    setAccessoryGroupProvided,
    setAccessoryGroupInstalled,
    clearAccessorySelections,
    beginAccessorySave,
    isCurrentAccessorySave,
  }
})
