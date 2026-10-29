import { isPaintingComplete } from './wicketStepProgress'
import { defineStore, storeToRefs } from 'pinia'
import { ref, computed, onScopeDispose, watch } from 'vue'
import { isParticipantRole, participantRoleLabel } from '../../app/participantRoles'
import { fillingMaterialGroupLabel } from '../../app/fillingMaterialGroups'
import { fillingSideCountLabel, isFillingSideCount, type FillingSideCountSelection } from '../../app/fillingSideCounts'
import { fillingOrientationLabel, isFillingOrientation, type FillingOrientationSelection } from '../../app/fillingOrientations'
import type { CalcBlock } from './types'
import type { PipeProfile, PipeProfileProblem } from '../../app/api/pipeProfiles'
import type { FillingDrawingProfile, FillingDrawingProfileProblem } from '../../app/api/fillingDrawingProfiles'
import type { JumperPlacement, JumperPlacementProblem } from '../../app/api/jumperProperties'
import type {
  WicketAccessoryCompositionResponse,
  WicketAccessoryRole,
  WicketAccessorySelectionPayload,
  OpeningOrientation,
  OpeningOrientationProblem,
} from '../../app/api/wicket.types'
import { useWicketWizardStore } from './wicketWizardStore'
import { applyWicketApiPayloadForModel } from './wicketLoadApiByModel'
import { laterWizardStep, mergeVisitedPages, visitedPagesUpTo } from './wicketStepProgress'
import { onWicketProductRowLockVersionAdvanced } from '../../app/api/wicketProductRowLockVersion'
import { frameSubtypeCapabilities } from '../../components/wicket/frameSubtype'
import { frameSubtypeLabel, isFrameSubtypeCode, type FrameSubtypeSelection } from '../../app/frameSubtypes'
import { grilleSideLabel, type GrilleSideSelection } from '../../app/grilleSides'
import { optionPresenceLabel, presenceFromLockSetId, type OptionPresenceSelection } from '../../app/optionPresence'
import { normalizeSummaryBlocks } from '../../app/summaryCodes'

const RETIRED_STANDALONE_PAGE_IDS = new Set([
  'page_lock_components',
  'page_door_closer',
  'page_bumper',
  'page_skud',
])

const RETIRED_WICKET_PAGES: Record<string, string> = {
  page1: 'page7',
  page11: 'page12',
}

/** Поля формы и сводка калитки (отдельно от сессии мастера `wicket-wizard`). */
export const useWicketFormStore = defineStore('wicket-form', () => {
  const data = ref<CalcBlock[]>([])

// Поставщики материала и краски, исполнитель окраски и legacy-сборка
const providesMaterial    = ref<string>('manufacturer')
const providesPaint       = ref<string>('manufacturer')
const providesPrimer = ref<string>('manufacturer')
const doesPaintingFrame  = ref<string>('manufacturer')
const doesAssembly        = ref<string>('manufacturer')
const participantRoleProblems = ref<Record<string, unknown> | null>(null)

// Поля шага "Заполнение"
const fillingSaveBlocked = ref(false)
const fillSide            = ref<FillingSideCountSelection>(1)
watch(fillSide, () => normalizeFillingPaintingPerformer(), { flush: 'sync' })
const materialFacadeGlob = ref<string | null>('siding')
const materialYardGlob   = ref<string | null>(null)
const fillingProfileFacade = ref<FillingDrawingProfile | null>(null)
const fillingProfileFacadeProblem = ref<FillingDrawingProfileProblem | null>(null)
const fillingProfileYard = ref<FillingDrawingProfile | null>(null)
const fillingProfileYardProblem = ref<FillingDrawingProfileProblem | null>(null)

// Поля шага "Столбы / Вариант открытия / Перемычка"
const nalichieStolbovName       = ref<string>('Со столбами')
const hasStolby                  = ref<0 | 1 | null>(null)
const postsPresenceProblem = ref<JumperPlacementProblem | null>(null)
const jumperPlacement = ref<JumperPlacement | null>(null)
const jumperPlacementProblem = ref<JumperPlacementProblem | null>(null)
const stolbId                    = ref<string | number>('')
const postProfile = ref<PipeProfile | null>(null)
const postProfileProblem = ref<PipeProfileProblem | null>(null)
const jumperProfile = ref<PipeProfile | null>(null)
const jumperProfileProblem = ref<PipeProfileProblem | null>(null)
const stolbName                  = ref<string>('')
const openingOptionName         = ref<string>('')
const openingOptionId           = ref<number | null>(null)
const openingOrientation = ref<OpeningOrientation | null>(null)
const openingOrientationProblem = ref<OpeningOrientationProblem | null>(null)
const openingOptionPathPhoto   = ref<string>('')
const peremichkaPolozheniyeId   = ref<string>('')
const peremichkaPolozheniyeName = ref<string>('')
const assortmentJumperId        = ref<string | number | null>(null)
const peremichkaSortamentName   = ref<string | null>(null)

// Поля шага "Ручка" (дополнительная ручка / скоба)
const isTherePenName   = ref<string>('Не будет')
const isTherePen       = ref<OptionPresenceSelection>(0)
const penProvided        = ref<string>('manufacturer')
const penInstalled       = ref<string>('manufacturer')
const penColor           = ref<string>('')
const penColorId         = ref<number | null>(null)
const additionalPenSidesConfigured = ref<number>(0)
const additionalPenStreetId = ref<number | null>(null)
const additionalPenStreetColorId = ref<number | null>(null)
const additionalPenYardId = ref<number | null>(null)
const additionalPenYardColorId = ref<number | null>(null)
const additionalPenStreetMarking = ref<string>('')
const additionalPenYardMarking = ref<string>('')
const additionalPenStreetColorName = ref<string>('')
const additionalPenYardColorName = ref<string>('')
const additionalPenId     = ref<number | null>(null)
const additionalPenColor  = ref<string>('')
const additionalPenMarking = ref<string>('')

// Поля furniture-разделов (доводчик/отбойник/скуд)
type AddonKey = 'doorCloser' | 'bumper' | 'skud'
interface AddonState { isThere: number; provided: string; installed: string; itemId: number | null; marking: string; itemIds: number[] }
function emptyAddon(): AddonState {
  return { isThere: 0, provided: 'manufacturer', installed: 'manufacturer', itemId: null, marking: '', itemIds: [] }
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
const stopRootVersionSync = onWicketProductRowLockVersionAdvanced((advance) => {
  const wizard = useWicketWizardStore()
  const isCurrentContext = wizard.orderId === advance.context.orderId
    && wizard.productRowId === advance.context.productRowId
    && String(wizard.modelId) === advance.context.modelId
  if (
    isCurrentContext
    && accessoryCompositionLockVersion.value === advance.expectedLockVersion
  ) {
    accessoryCompositionLockVersion.value = advance.lockVersion
  }
})
onScopeDispose(stopRootVersionSync)
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

// Поля шага "Замок"
const isThereLockName = ref<string>('Есть')
const isThereLock     = ref<OptionPresenceSelection>(1)
const providesLock      = ref<string>('manufacturer')
const lockInstaller     = ref<string>('manufacturer')
const lockComponentsProvided = ref<string>('manufacturer')
const lockComponentsInstalled = ref<string>('manufacturer')

// Поля шага "Проем"
const widthProyema      = ref<string>('')
const heightProyema     = ref<string>('')
const clearanceProyema  = ref<string>('')
const sostoyaniyeProyema = ref<string>('Готов')

// Поля шага "Расположение полотна"
const raspolozheniyePolotna = ref<FillingOrientationSelection>('vertical')

// Поля шага "Тип щита"
const shieldType       = ref<FrameSubtypeSelection>('noNet')
const doesPaintingFrameCode = computed(() => isParticipantRole(doesPaintingFrame.value) ? doesPaintingFrame.value : null)
const providesPaintCode = computed(() => isParticipantRole(providesPaint.value) ? providesPaint.value : null)
const providesPrimerCode = computed(() => isParticipantRole(providesPrimer.value) ? providesPrimer.value : null)
const paintName = ref('')
const paintId = ref<number | null>(null)
const colorShieldId = paintId
const paintColorId = ref<number | null>(null)
const paintSelectionUnavailable = ref(false)
const savedPaintId = ref<number | null>(null)
const savedPaintColorId = ref<number | null>(null)
const paintSelection = ref<{ isFixedColor: boolean; requiresColorNote: boolean; isPaintAvailable: boolean } | null>(null)
const colorShieldName = ref<string>('')
const colorShieldHex  = ref<string>('')
const colorShieldNote = ref<string>('')
const primerId = ref<number | null>(null)
const primerName = ref<string>('')
const heightTopPart   = ref<string>('0')
const heightLowerPart = ref<string>('0')
const widthSidePart         = ref<string>('0')
const assortmentSideGrilleNetId = ref<string | number | null>(null)
const sideGrilleNetImage = ref<string>('')
const lowerGrilleNetImage = ref<string>('')
const upperGrilleNetImage = ref<string>('')
const assortmentHeightUpperNetId = ref<string | number | null>(null)
const assortmentHeightLowerNetId = ref<string | number | null>(null)
const grilleLocation         = ref<GrilleSideSelection>('hinge')
const netWidthProviderTop  = ref<string>('executor')
const netWidthProviderLower = ref<string>('executor')
const netWidthProviderSide  = ref<string>('executor')

// Поля шага "Заполнение (фасад)"
const idFacade                = ref<string | number>('')
const materialSelectionProblems = ref<Array<{ side: 'facade' | 'yard'; reason: string; message: string }>>([])
const profileTypeFacadeId = ref<number | null>(null)
const typeOfCoatingFacadeId = ref<number | null>(null)
const sidingFormFacadeId = ref<number | null>(null)
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
const reliefFacadeAlongMode = ref<'stretch' | 'repeat'>('stretch')
const reliefFacadeAcrossMode = ref<'stretch' | 'repeat'>('repeat')
const reliefYardAlongMode = ref<'stretch' | 'repeat'>('stretch')
const reliefYardAcrossMode = ref<'stretch' | 'repeat'>('repeat')
const reliefFacadeImage       = ref<string>('')
const colorFacadeReverseHex   = ref<string>('')
const colorFacadeReverseImage = ref<string>('')
const gapId                    = ref<number | null>(null)
const gapName                  = ref<number | null>(null)
const numberOfSticks           = ref<number | null>(null)

// Поля шага "Заполнение (двор)"
const idYard                = ref<string | number>('')
const profileTypeYardId = ref<number | null>(null)
const typeOfCoatingYardId = ref<number | null>(null)
const sidingFormYardId = ref<number | null>(null)
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
    if (fillSide.value === 0) return false
    const hasFacade = idFacade.value != null && String(idFacade.value).trim() !== ''
    const needYard = fillSide.value === 2
    const hasYard = idYard.value != null && String(idYard.value).trim() !== ''
    return !isFillingSideCount(fillSide.value) || !hasFacade || (needYard && !hasYard)
  })

  function setCodedBlock(blockCode: string, blockName: string, params: Array<{ paramCode: string; name: string; value: string }>): void {
    const block = data.value.find(item => item.blockCode === blockCode)
    if (block) { block.blockName = blockName; block.params = params }
    else data.value.push({ blockCode, blockName, params })
  }

  function updateOrCreateBlock(blockCode: string, params: CalcBlock['params'], blockName: string) {
    data.value = normalizeSummaryBlocks(data.value)
    const block = data.value.find(b => b.blockCode === blockCode)
    if (block) {
      block.blockName = blockName
      block.params = params
    } else {
      data.value.push({ blockCode, blockName, params })
    }
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function buildLockSummaryParams(): CalcBlock['params'] {
    const params: CalcBlock['params'] = [
      { paramCode: 'presence', name: 'Замок есть/нет', value: optionPresenceLabel(isThereLock.value, 'lock') },
    ]
    if (isThereLock.value === 1) {
      params.push({ paramCode: 'lockProvider', name: 'Замок предоставляет', value: participantRoleLabel('provide', providesLock.value) })
      params.push({ paramCode: 'lockInstaller', name: 'Врезку замка выполняет', value: participantRoleLabel('perform', lockInstaller.value) })
      params.push({ paramCode: 'lockType', name: 'Тип замка', value: providesLock.value === 'customer' ? 'Комплект заказчика' : typeLock.value || '' })
    }
    return params
  }

  function rebuildLockSummaryBlock(): void {
    updateOrCreateBlock('lock', buildLockSummaryParams(), 'Замок')
  }

  function removeAllBlocksExcept(allowedBlockCodes: string[]) {
    data.value = data.value.filter(b => b.blockCode !== undefined && allowedBlockCodes.includes(b.blockCode))
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function resetFacadeFilling(): void {
    fillingProfileFacade.value = null
    fillingProfileFacadeProblem.value = null
    profileTypeFacadeId.value = null
    typeOfCoatingFacadeId.value = null
    sidingFormFacadeId.value = null
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
    reliefFacadeAlongMode.value = 'stretch'
    reliefFacadeAcrossMode.value = 'repeat'
    colorFacadeReverseHex.value = ''
    colorFacadeReverseImage.value = ''
    gapId.value = null
    gapName.value = null
    numberOfSticks.value = null
  }

  function resetYardFilling(): void {
    fillingProfileYard.value = null
    fillingProfileYardProblem.value = null
    profileTypeYardId.value = null
    typeOfCoatingYardId.value = null
    sidingFormYardId.value = null
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
    reliefYardAlongMode.value = 'stretch'
    reliefYardAcrossMode.value = 'repeat'
  }

  function clearFilling(): void {
    resetFacadeFilling()
    resetYardFilling()
    materialFacadeGlob.value = null
    materialYardGlob.value = null
    raspolozheniyePolotna.value = null
    materialSelectionProblems.value = []
    data.value = data.value.filter(block => !['fillingFacade', 'fillingYard', 'fillingOrientation'].includes(block.blockCode ?? ''))
  }

  /** Сброс полей формы (сессия заказа/шагов — в `wicket-wizard`). */
  function resetFormFields() {
    materialSelectionProblems.value = []
    fillingSaveBlocked.value = false
    data.value = []
    priceRetail.value = ''
    priceDealer.value = ''
    providesMaterial.value = 'manufacturer'
    providesPaint.value = 'manufacturer'
    providesPrimer.value = 'manufacturer'
    doesPaintingFrame.value = 'manufacturer'
    doesAssembly.value = 'manufacturer'
    participantRoleProblems.value = null
    fillSide.value = 1
    materialFacadeGlob.value = 'siding'
    materialYardGlob.value = null
    nalichieStolbovName.value = 'Со столбами'
    hasStolby.value = null
    postsPresenceProblem.value = null
    jumperPlacement.value = null
    jumperPlacementProblem.value = null
    stolbId.value = ''
    postProfile.value = null
    fillingProfileFacade.value = null
    fillingProfileFacadeProblem.value = null
    fillingProfileYard.value = null
    fillingProfileYardProblem.value = null
    postProfileProblem.value = null
    jumperProfile.value = null
    jumperProfileProblem.value = null
    stolbName.value = ''
    openingOptionName.value = ''
    openingOptionId.value = null
    openingOrientation.value = null
    openingOrientationProblem.value = null
    openingOptionPathPhoto.value = ''
    peremichkaPolozheniyeId.value = ''
    peremichkaPolozheniyeName.value = ''
    assortmentJumperId.value = null
    peremichkaSortamentName.value = null
    isTherePenName.value = 'Не будет'
    isTherePen.value = 0
    penProvided.value = 'manufacturer'
    penInstalled.value = 'manufacturer'
    penColor.value = ''
    penColorId.value = null
    additionalPenSidesConfigured.value = 0
    additionalPenStreetId.value = null
    additionalPenStreetColorId.value = null
    additionalPenYardId.value = null
    additionalPenYardColorId.value = null
    additionalPenStreetMarking.value = ''
    additionalPenYardMarking.value = ''
    additionalPenStreetColorName.value = ''
    additionalPenYardColorName.value = ''
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
    lockComponentsProvided.value = 'manufacturer'
    lockComponentsInstalled.value = 'manufacturer'
    isThereLockName.value = 'Есть'
    isThereLock.value = 1
    providesLock.value = 'manufacturer'
    lockInstaller.value = 'manufacturer'
    widthProyema.value = ''
    heightProyema.value = ''
    clearanceProyema.value = ''
    sostoyaniyeProyema.value = 'Готов'
    raspolozheniyePolotna.value = 'vertical'
    shieldType.value = 'noNet'
    paintName.value = ''
    paintId.value = null
    paintColorId.value = null
    paintSelectionUnavailable.value = false
    savedPaintId.value = null
    savedPaintColorId.value = null
    paintSelection.value = null
    colorShieldName.value = ''
    colorShieldHex.value = ''
    colorShieldNote.value = ''
    primerId.value = null
    primerName.value = ''
    heightTopPart.value = '0'
    heightLowerPart.value = '0'
    widthSidePart.value = '0'
    assortmentSideGrilleNetId.value = null
    sideGrilleNetImage.value = ''
    lowerGrilleNetImage.value = ''
    upperGrilleNetImage.value = ''
    assortmentHeightUpperNetId.value = null
    assortmentHeightLowerNetId.value = null
    grilleLocation.value = 'hinge'
    netWidthProviderTop.value = 'executor'
    netWidthProviderLower.value = 'executor'
    netWidthProviderSide.value = 'executor'
    resetFacadeFilling()
    resetYardFilling()
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function updatePriceBlock(dealer: string | number, retail: string | number) {
    priceDealer.value = dealer
    priceRetail.value = retail
    updateOrCreateBlock('price', [
      { paramCode: 'dealerPrice', name: 'Дилерская цена', value: String(dealer) },
      { paramCode: 'retailPrice', name: 'Рек. розн. цена', value: String(retail) },
    ], 'Цена')
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
    state.provided = !first || first.providedByManufacturer
      ? 'manufacturer'
      : 'customer'
    state.installed = !first || selections.some(selection => selection.installedByManufacturer)
      ? 'manufacturer'
      : 'customer'
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
    const hasLockComponents = lockSelections.length > 0
    lockComponentsProvided.value = !hasLockComponents || lockSelections.some(selection => selection.providedByManufacturer)
      ? 'manufacturer'
      : 'customer'
    lockComponentsInstalled.value = !hasLockComponents || lockSelections.some(selection => selection.installedByManufacturer)
      ? 'manufacturer'
      : 'customer'
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
    const stepOrder = modelId === '2'
      ? [
          'page7',
          'page5',
          'page2',
          'page2_facade_profnastil',
          'page6',
          'page3',
          'page_painting',
          'page9',
          'page_lock_type',
          'page10',
          'page12',
        ]
      : ['page7', 'page5', 'page2', 'page6', 'page3', 'page_painting', 'page9', 'page10', 'page12']
    const visited: string[] = []
    let active = 'page7'

    function notEmpty(v: unknown): boolean {
      return v != null && String(v).trim() !== ''
    }
    function numGt(key: string | number, n: number): boolean {
      const v = typeof key === 'number' ? key : Number(key)
      return !isNaN(v) && v > n
    }

    for (const pageId of stepOrder) {
      if (fillSide.value === 0 && (pageId === 'page6' || pageId.startsWith('page2_'))) continue
      let completed = false
      switch (pageId) {
        case 'page2':
          completed = isFillingSideCount(fillSide.value)
          break
        case 'page2_facade_profnastil':
          completed = !!(idFacade.value && String(idFacade.value))
          break
        case 'page3':
          completed = isFrameSubtypeCode(shieldType.value)
          break
        case 'page_painting':
          completed = isPaintingComplete({ performerCode: doesPaintingFrameCode.value, paintId: paintId.value, paintColorId: paintColorId.value, selection: paintSelection.value, note: colorShieldNote.value, unavailable: paintSelectionUnavailable.value, savedPaintId: savedPaintId.value, savedPaintColorId: savedPaintColorId.value })
          break
        case 'page5':
          completed = openingOptionId.value != null && (Number(openingOptionId.value) || 0) > 0
          break
        case 'page6':
          completed = isFillingOrientation(raspolozheniyePolotna.value)
          break
        case 'page7':
          completed = numGt(widthProyema.value as string | number, 0) && numGt(heightProyema.value as string | number, 0)
          break
        case 'page9':
          completed = isThereLock.value !== null
          break
        case 'page_lock_type':
          completed = isThereLock.value !== 1 || providesLock.value === 'customer' || lockSetId.value != null
          break
        case 'page10':
          completed = isTherePen.value !== null
          break
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

  function normalizeFillingPaintingPerformer(): void {
    if ((fillSide.value !== 1 && fillSide.value !== 2) || doesPaintingFrame.value !== 'customer') return
    doesPaintingFrame.value = 'manufacturer'
    data.value = data.value.map(block => block.blockCode !== 'painting' ? block : {
      ...block, params: block.params.map(param => param.paramCode !== 'paintingPerformer' ? param : {
        ...param, value: participantRoleLabel('perform', 'manufacturer'),
      }),
    })
  }

  /** Заполняет состояние из ответа API get-data (редактирование расчёта). */
  function loadFromApi(apiData: Record<string, unknown>) {
    materialSelectionProblems.value = []
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
      providesPrimer,
      participantRoleProblems,
      doesPaintingFrame,
      doesAssembly,
      fillSide,
      materialFacadeGlob,
      materialYardGlob,
      fillingProfileFacade,
      fillingProfileFacadeProblem,
      fillingProfileYard,
      fillingProfileYardProblem,
      nalichieStolbovName,
      hasStolby,
      postsPresenceProblem,
      jumperPlacement,
      jumperPlacementProblem,
      stolbId,
      postProfile,
      postProfileProblem,
      jumperProfile,
      jumperProfileProblem,
      stolbName,
      openingOptionName,
      openingOptionId,
      openingOrientation,
      openingOrientationProblem,
      openingOptionPathPhoto,
      peremichkaPolozheniyeId,
      peremichkaPolozheniyeName,
      assortmentJumperId,
      peremichkaSortamentName,
      isTherePenName,
      isTherePen,
      penProvided,
      penInstalled,
      penColor,
      penColorId,
      additionalPenSidesConfigured,
      additionalPenStreetId,
      additionalPenStreetColorId,
      additionalPenYardId,
      additionalPenYardColorId,
      additionalPenStreetMarking,
      additionalPenYardMarking,
      additionalPenStreetColorName,
      additionalPenYardColorName,
      additionalPenId,
      additionalPenColor,
      additionalPenMarking,
      typeLock,
      lockSetId,
      lockPenId,
      lockPenColor,
      lockPenColorId,
    lockComponentIds,
    lockComponentsProvided,
    lockComponentsInstalled,
      isThereLockName,
      isThereLock,
      providesLock,
      lockInstaller,
      widthProyema,
      heightProyema,
      clearanceProyema,
      sostoyaniyeProyema,
      raspolozheniyePolotna,
      shieldType,
      paintName, paintId, paintColorId, paintSelectionUnavailable, paintSelection,
      colorShieldId,
      colorShieldName,
      colorShieldHex,
      colorShieldNote,
      primerId,
      primerName,
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
      materialSelectionProblems,
      profileTypeFacadeId,
      typeOfCoatingFacadeId,
      sidingFormFacadeId,
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
      reliefFacadeAlongMode,
      reliefFacadeAcrossMode,
      colorFacadeReverseHex,
      colorFacadeReverseImage,
      gapId,
      gapName,
      numberOfSticks,
      idYard,
      profileTypeYardId,
      typeOfCoatingYardId,
      sidingFormYardId,
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
      reliefYardAlongMode,
      reliefYardAcrossMode,
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
    fillingSaveBlocked.value = false
    applyWicketApiPayloadForModel(modelIdForLoad, apiData, refMap)
    normalizeFillingPaintingPerformer()
    if (fillSide.value === 0) clearFilling()
    savedPaintId.value = paintId.value
    savedPaintColorId.value = paintColorId.value
    for (const key of [
      'manufacturerFacadeId',
      'colorFacadeId',
      'manufacturerYardId',
      'colorYardId',
    ] as const) {
      if (apiData[key] === null || apiData[key] === '') {
        refMap[key].value = null
      }
    }
    isThereLock.value = providesLock.value === 'customer' ? 1 : presenceFromLockSetId(lockSetId.value)
    isThereLockName.value = optionPresenceLabel(isThereLock.value, 'lock')
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
          .map(page => RETIRED_WICKET_PAGES[page] ?? page)
          .filter(page => !RETIRED_STANDALONE_PAGE_IDS.has(page))
      : []
    const savedActive =
      typeof apiData.activePage === 'string' && apiData.activePage
        ? apiData.activePage
        : typeof apiData.reachedStep === 'string' && apiData.reachedStep
          ? apiData.reachedStep
          : 'page7'
    const replacementPage = RETIRED_WICKET_PAGES[savedActive]
    const apiActive = replacementPage ?? savedActive
    const hasPrice =
      (priceRetail.value !== null && priceRetail.value !== '' && String(priceRetail.value).trim() !== '')
      || (apiData.priceRetail !== null && apiData.priceRetail !== undefined && String(apiData.priceRetail).trim() !== '')

    const computedProgress = computeProgressFromState(apiData)
    let active = RETIRED_STANDALONE_PAGE_IDS.has(apiActive)
      ? computedProgress.activePage
      : apiActive
    if (hasPrice) {
      active = laterWizardStep(active, 'page12')
    } else if (apiVisited.length === 0 && !replacementPage) {
      active = computedProgress.activePage
    }

    if (fillSide.value === 0 && (active === 'page6' || active.startsWith('page2_'))) active = 'page3'
    const shouldStartFromFirstPage = modelIdForLoad === '2' && !replacementPage
    w.activePage.value = shouldStartFromFirstPage ? 'page7' : active
    w.visitedPages.value =
      apiVisited.length > 0 || replacementPage
        ? mergeVisitedPages(visitedPagesUpTo(active, apiVisited), computedProgress.visitedPages)
        : computedProgress.visitedPages

    if (fillSide.value === 0) w.visitedPages.value = w.visitedPages.value.filter(page => page !== 'page6' && !page.startsWith('page2_'))

    // Восстанавливаем блоки сводки из загруженных данных
    rebuildSummaryBlocks()
  }

  /** Собирает блоки сводки из текущего состояния (для редактирования и синхронизации). */
  function rebuildSummaryBlocks() {
    const blocks: CalcBlock[] = []

    // Заполнение
    const fillParams: CalcBlock['params'] = [
      { paramCode: 'fillingProvider', name: 'Материал заполнения', value: participantRoleLabel('provide', providesMaterial.value) },
      { paramCode: 'sideCount', name: 'Сторона заполнения', value: fillingSideCountLabel(fillSide.value) },
      { paramCode: 'facadeGroup', name: 'Материал заполнения (фасад)', value: fillingMaterialGroupLabel(materialFacadeGlob.value) },
    ]
    if (fillSide.value === 2) {
      fillParams.push({ paramCode: 'yardGroup', name: 'Материал заполнения (двор)', value: fillingMaterialGroupLabel(materialYardGlob.value) })
    }
    if (fillSide.value === 0) fillParams.splice(0, fillParams.length, { paramCode: 'sideCount', name: 'Сторона заполнения', value: fillingSideCountLabel(0) })
    blocks.push({ blockCode: 'filling', blockName: 'Заполнение', params: fillParams })

    // Заполнение (фасад) — сайдинг или профлист
    if (fillSide.value !== 0 && (idFacade.value || materialFacade.value)) {
      const isProfnastil = materialFacadeGlob.value === 'profnastil'
      blocks.push({
        blockCode: 'fillingFacade', blockName: 'Заполнение (фасад)',
        params: isProfnastil
          ? [
              { paramCode: 'materialManufacturer', name: 'Производитель материала', value: materialSupplierFacade.value },
              { paramCode: 'material', name: 'Материал', value: materialFacade.value },
              { paramCode: 'sheetThickness', name: 'Толщина листа', value: thicknessFacade.value },
              { paramCode: 'coating', name: 'Тип покрытия', value: typeOfCoatingFacade.value },
              { paramCode: 'color', name: 'Цвет', value: colorFacade.value },
            ]
          : [
              { paramCode: 'materialManufacturer', name: 'Производитель материала', value: materialSupplierFacade.value },
              { paramCode: 'material', name: 'Материал', value: materialFacade.value },
              { paramCode: 'form', name: 'Форма', value: formFacade.value },
              { paramCode: 'coating', name: 'Тип покрытия', value: typeOfCoatingFacade.value },
              { paramCode: 'color', name: 'Цвет', value: colorFacade.value },
            ],
      })
    }

    // Заполнение (двор) — только при "Две стороны"
    if (fillSide.value === 2 && (idYard.value || materialYard.value)) {
      const isProfnastil = materialYardGlob.value === 'profnastil'
      blocks.push({
        blockCode: 'fillingYard', blockName: 'Заполнение (двор)',
        params: isProfnastil
          ? [
              { paramCode: 'materialManufacturer', name: 'Производитель материала', value: materialSupplierYard.value },
              { paramCode: 'material', name: 'Материал', value: materialYard.value },
              { paramCode: 'sheetThickness', name: 'Толщина листа', value: thicknessYard.value },
              { paramCode: 'coating', name: 'Тип покрытия', value: typeOfCoatingYard.value },
              { paramCode: 'color', name: 'Цвет', value: colorYard.value },
            ]
          : [
              { paramCode: 'materialManufacturer', name: 'Производитель материала', value: materialSupplierYard.value },
              { paramCode: 'material', name: 'Материал', value: materialYard.value },
              { paramCode: 'form', name: 'Форма', value: formYard.value },
              { paramCode: 'coating', name: 'Тип покрытия', value: typeOfCoatingYard.value },
              { paramCode: 'color', name: 'Цвет', value: colorYard.value },
            ],
      })
    }

    // Столбы / вариант открытия / перемычка
    const stolbParams: CalcBlock['params'] = [
      { paramCode: 'postsPresence', name: 'Наличие столбов', value: nalichieStolbovName.value },
    ]
    if (hasStolby.value === 1 && stolbName.value) {
      stolbParams.push({ paramCode: 'postProfile', name: 'Сортамент столбов', value: stolbName.value })
    }
    if (openingOptionName.value) {
      stolbParams.push({ paramCode: 'openingOption', name: 'Вариант открытия', value: openingOptionName.value })
    }
    if (peremichkaPolozheniyeName.value) {
      stolbParams.push({ paramCode: 'jumperPlacement', name: 'Положение перемычки', value: peremichkaPolozheniyeName.value })
    }
    if (peremichkaSortamentName.value) {
      stolbParams.push({ paramCode: 'jumperProfile', name: 'Сортамент перемычки', value: peremichkaSortamentName.value })
    }
    blocks.push({ blockCode: 'postsOpeningJumper', blockName: 'Столбы / вариант открытия / перемычка', params: stolbParams })

    // Расположение полотна
    if (fillSide.value !== 0) blocks.push({
      blockCode: 'fillingOrientation', blockName: 'Расположение полотна',
      params: [{ paramCode: 'fillingOrientation', name: 'Расположение полотна', value: fillingOrientationLabel(raspolozheniyePolotna.value) }],
    })

    // Тип щита
    const shieldParams: CalcBlock['params'] = [
      { paramCode: 'frameSubtype', name: 'Тип щита', value: frameSubtypeLabel(shieldType.value) },
    ]
    const shieldCapabilities = frameSubtypeCapabilities(shieldType.value)
    if (shieldCapabilities.top && heightTopPart.value && heightTopPart.value !== '0') {
      shieldParams.push({ paramCode: 'upperHeight', name: 'Высота верхней части', value: heightTopPart.value })
    }
    if (shieldCapabilities.lower && heightLowerPart.value && heightLowerPart.value !== '0') {
      shieldParams.push({ paramCode: 'lowerHeight', name: 'Высота нижней части', value: heightLowerPart.value })
    }
    if (shieldCapabilities.side) {
      if (widthSidePart.value && widthSidePart.value !== '0') {
        shieldParams.push({ paramCode: 'sideWidth', name: 'Ширина боковой части', value: widthSidePart.value })
      }
      if (grilleLocation.value) {
        shieldParams.push({ paramCode: 'grilleSide', name: 'Расположение решётки', value: grilleSideLabel(grilleLocation.value) })
      }
    }
    blocks.push({ blockCode: 'frameSubtype', blockName: 'Тип щита', params: shieldParams })

    const paintingParams: CalcBlock['params'] = [
      { paramCode: 'paintProvider', name: 'Поставщик краски', value: participantRoleLabel('provide', providesPaint.value) },
      { paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: participantRoleLabel('perform', doesPaintingFrame.value) },
    ]
    if (paintName.value) paintingParams.push({ paramCode: 'paintProduct', name: 'Краска', value: paintName.value })
    if (colorShieldName.value) paintingParams.push({ paramCode: 'color', name: 'Цвет рамы', value: colorShieldName.value })
    if (colorShieldNote.value) paintingParams.push({ paramCode: 'paintNote', name: 'Примечание к цвету краски', value: colorShieldNote.value })
    if (primerName.value) paintingParams.push(
      { paramCode: 'primer', name: 'Грунтовка', value: primerName.value },
      { paramCode: 'primerProvider', name: 'Поставщик грунтовки', value: participantRoleLabel('provide', providesPrimer.value) },
    )
    blocks.push({ blockCode: 'painting', blockName: 'Окраска', params: paintingParams })

    // Проем
    if (widthProyema.value || heightProyema.value || clearanceProyema.value) {
      blocks.push({
        blockCode: 'opening', blockName: 'Проем',
        params: [
          { paramCode: 'width', name: 'Ширина', value: widthProyema.value },
          { paramCode: 'height', name: 'Высота', value: heightProyema.value },
          { paramCode: 'clearance', name: 'Просвет', value: clearanceProyema.value },
          { paramCode: 'openingCondition', name: 'Состояние проема', value: sostoyaniyeProyema.value },
        ],
      })
    }

    // Замок
    blocks.push({ blockCode: 'lock', blockName: 'Замок', params: buildLockSummaryParams() })

    // Дополнительная ручка
    const penParams: CalcBlock['params'] = [
      { paramCode: 'presence', name: 'Дополнительная ручка', value: optionPresenceLabel(isTherePen.value, 'optional') },
    ]
    if (isTherePen.value === 1) {
      penParams.push({ paramCode: 'penProvider', name: 'Ручку предоставляет', value: participantRoleLabel('provide', penProvided.value) })
      penParams.push({ paramCode: 'penInstaller', name: 'Ручку устанавливает', value: participantRoleLabel('install', penInstalled.value) })
      if (additionalPenSidesConfigured.value !== 1 && penProvided.value === 'manufacturer') {
        if (additionalPenId.value != null && additionalPenMarking.value) {
          penParams.push({ paramCode: 'penModel', name: 'Модель ручки', value: additionalPenMarking.value })
        }
        penParams.push({ paramCode: 'penColor', name: 'Цвет ручки', value: additionalPenColor.value || penColor.value })
      }
    }
    if (additionalPenSidesConfigured.value === 1) {
      penParams.push({ paramCode: 'streetPenModel', name: 'Ручка с улицы', value: additionalPenStreetId.value == null ? 'Не требуется' : additionalPenStreetMarking.value })
      if (additionalPenStreetId.value != null) penParams.push({ paramCode: 'streetPenColor', name: 'Цвет ручки с улицы', value: additionalPenStreetColorName.value })
      penParams.push({ paramCode: 'yardPenModel', name: 'Ручка со двора', value: additionalPenYardId.value == null ? 'Не требуется' : additionalPenYardMarking.value })
      if (additionalPenYardId.value != null) penParams.push({ paramCode: 'yardPenColor', name: 'Цвет ручки со двора', value: additionalPenYardColorName.value })
    }
    blocks.push({ blockCode: 'additionalPen', blockName: 'Дополнительная ручка', params: penParams })

    // Цена
    if (priceDealer.value || priceRetail.value) {
      blocks.push({
        blockCode: 'price', blockName: 'Цена',
        params: [
          { paramCode: 'dealerPrice', name: 'Дилерская цена', value: String(priceDealer.value) },
          { paramCode: 'retailPrice', name: 'Рек. розн. цена', value: String(priceRetail.value) },
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
    providesPrimer,
    participantRoleProblems,
    doesPaintingFrame,
    doesAssembly,
    fillSide,
    materialFacadeGlob,
    materialYardGlob,
    nalichieStolbovName,
    hasStolby,
    postsPresenceProblem,
    jumperPlacement,
    jumperPlacementProblem,
    stolbId,
    postProfile,
    fillingProfileFacade,
    fillingProfileFacadeProblem,
    fillingProfileYard,
    fillingProfileYardProblem,
    postProfileProblem,
    jumperProfile,
    jumperProfileProblem,
    stolbName,
    openingOptionName,
    openingOptionId,
    openingOrientation,
    openingOrientationProblem,
    openingOptionPathPhoto,
    peremichkaPolozheniyeId,
    peremichkaPolozheniyeName,
    assortmentJumperId,
    peremichkaSortamentName,
    isTherePenName,
    isTherePen,
    penProvided,
    penInstalled,
    penColor,
    penColorId,
    additionalPenMarking,
    additionalPenSidesConfigured,
    additionalPenStreetId,
    additionalPenStreetColorId,
    additionalPenYardId,
    additionalPenYardColorId,
    additionalPenStreetMarking,
    additionalPenYardMarking,
    additionalPenStreetColorName,
    additionalPenYardColorName,
    additionalPenId,
    additionalPenColor,
    typeLock,
    lockSetId,
    lockPenId,
    lockPenColor,
    lockPenColorId,
    lockComponentIds,
    lockComponentsProvided,
    lockComponentsInstalled,
    isThereLockName,
    isThereLock,
    providesLock,
    lockInstaller,
    widthProyema,
    heightProyema,
    clearanceProyema,
    sostoyaniyeProyema,
    raspolozheniyePolotna,
    shieldType,
    doesPaintingFrameCode, providesPaintCode, providesPrimerCode,
    paintName, paintId, paintColorId, paintSelectionUnavailable, paintSelection,
    colorShieldId,
    colorShieldName,
    colorShieldHex,
    colorShieldNote,
    primerId,
    primerName,
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
    materialSelectionProblems,
    profileTypeFacadeId,
    typeOfCoatingFacadeId,
    sidingFormFacadeId,
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
    reliefFacadeAlongMode,
    reliefFacadeAcrossMode,
    colorFacadeReverseHex,
    colorFacadeReverseImage,
    gapId,
    gapName,
    numberOfSticks,
    idYard,
    profileTypeYardId,
    typeOfCoatingYardId,
    sidingFormYardId,
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
    reliefYardAlongMode,
    reliefYardAcrossMode,
    priceRetail,
    priceDealer,
    fieldsFilled,
    isFillSectionIncomplete,
    setCodedBlock,
    updateOrCreateBlock,
    rebuildLockSummaryBlock,
    removeAllBlocksExcept,
    updatePriceBlock,
    loadFromApi,
    fillingSaveBlocked,
    clearFilling,
    resetFacadeFilling,
    resetYardFilling,
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
