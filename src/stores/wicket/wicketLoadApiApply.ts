import { parseOpeningSelection } from '../../components/wicket/openingOrientation'
import { parseJumperSelection, parsePostsSelection } from '../../app/api/jumperProperties'
import { parsePipeProfileDescriptor } from '../../app/api/pipeProfiles'
import { parseFillingDrawingDescriptor } from '../../app/api/fillingDrawingProfiles'
import { isPositiveSafeInteger, parsePositiveDecimalId } from '../../app/positiveDecimalId'
import { participantRoleFields } from '../../app/participantRoles'
import { readParticipantRole } from '../../app/api/legacyParticipantRoles'
import { readFillingMaterialGroup } from '../../app/api/legacyFillingMaterialGroups'
import { readFillingSideCount } from '../../app/api/legacyFillingSideCounts'
import { readFillingOrientation } from '../../app/api/legacyFillingOrientations'
import { readFrameSubtype } from '../../app/api/legacyFrameSubtypes'
import { readGrilleSide } from '../../app/api/legacyGrilleSides'
import { readPenPresence } from '../../app/api/legacyOptionPresence'
import { optionPresenceLabel } from '../../app/optionPresence'

/**
 * Маппинг полей ответа get-data в ref'ы формы калитки.
 * Разделено от Pinia-стора, чтобы при расхождении типов 1/2 вынести ветвление по modelId.
 */

/** Поля, которые должны быть строго числами (сравнение с value radio). */
export const WICKET_API_NUMERIC_KEYS = new Set([
  'profileTypeFacadeId',
  'profileTypeYardId',
  'typeOfCoatingFacadeId',
  'typeOfCoatingYardId',
  'sidingFormFacadeId',
  'sidingFormYardId',
  'productRowId',
  'openingOptionId',
  'isThereLock',
  'lockPenId',
  'lockSetId',
  'additionalPenId',
  'lockPenColorId',
  'penColorId',
  'primerId',
  'paintId',
  'paintColorId',
  'assortmentSideGrilleNetId',
  'assortmentHeightUpperNetId',
  'assortmentHeightLowerNetId',
  'gapId',
  'gapName',
  'numberOfSticks',
])

/** Поля, которые приходят из API как JSON-массив ID. */
export const WICKET_API_ARRAY_KEYS = new Set([
  'lockComponentIds',
])

/** Состав комплектующих загружается только из canonical composition API. */
export const WICKET_LEGACY_ACCESSORY_KEYS = new Set([
  'isThereLock',
  'isThereLockName',
  'lockComponentIds',
  'lockComponentsInstalled',
  'isThereDoorCloser',
  'doorCloserId',
  'doorCloserProvided',
  'doorCloserInstalled',
  'isThereBumper',
  'bumperId',
  'bumperProvided',
  'bumperInstalled',
  'isThereSkud',
  'skudId',
  'skudIds',
  'skudProvided',
  'skudInstalled',
])

/** Клиент принадлежит заказу; старые поля в ответе калитки намеренно игнорируются. */
export const WICKET_LEGACY_CLIENT_KEYS = new Set([
  'calculationName',
  'clientName',
  'clientLastName',
  'clientSurname',
  'clientPhone',
  'clientEmail',
  'clientAddress',
  'clientComment',
  'countryCode',
])

const WICKET_NET_PROVIDER_KEYS = new Set([
  'netWidthProviderTop',
  'netWidthProviderLower',
  'netWidthProviderSide',
])

export const WICKET_API_FIELD_DEFAULTS: Record<string, string | number | null> = {
  providesMaterial: 'manufacturer',
  providesPaint: 'manufacturer',
  providesPrimer: 'manufacturer',
  doesPaintingFrame: 'manufacturer',
  doesAssembly: 'manufacturer',
  nalichieStolbovName: 'Со столбами',
  sostoyaniyeProyema: 'Готов',
  netWidthProviderTop: 'executor',
  netWidthProviderLower: 'executor',
  netWidthProviderSide: 'executor',
  heightTopPart: '0',
  heightLowerPart: '0',
  widthSidePart: '0',
  isThereLockName: 'Есть',
  isThereLock: 1,
  providesLock: 'manufacturer',
  lockInstaller: 'manufacturer',
  typeLock: 'Тип_1',
  lockSetId: null,
  lockPenColor: '',
  lockPenColorId: null,
  penProvided: 'manufacturer',
  penInstalled: 'manufacturer',
  penColor: '',
  penColorId: null,
  additionalPenId: null,
  additionalPenColor: '',
  additionalPenMarking: '',
  colorShieldHex: '',
}

type RefLike = { value: unknown }

/**
 * Записывает пары ключ/значение из API в refMap (общий контракт type1/type2).
 * При расхождении полей по типу — оборачивать вызов в маппер по `modelId` в сторе.
 */
export function applyWicketApiFieldMappings(
  apiData: Record<string, unknown>,
  refMap: Record<string, RefLike>,
): void {
  function set(key: string, val: unknown) {
    if (val === undefined) return
    let v: unknown
    if (key === 'paintId' || key === 'paintColorId') {
      const id = Number(val)
      v = Number.isSafeInteger(id) && id > 0 ? id : null
    } else if (key === 'lockSetId') {
      const parsed = parsePositiveDecimalId(val)
      v = val === null || val === '' ? null
        : isPositiveSafeInteger(val) ? val
          : parsed.kind === 'valid' ? parsed.value : val
    } else if (key === 'orderId' || key === 'productRowId') {
      v = val != null && val !== '' ? Number(val) : null
    } else if (WICKET_API_ARRAY_KEYS.has(key)) {
      if (Array.isArray(val)) {
        v = val.map(Number).filter(Number.isFinite)
      } else if (typeof val === 'string' && val.trim() !== '') {
        try {
          const parsed = JSON.parse(val)
          v = Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
        } catch {
          v = []
        }
      } else {
        v = []
      }
    } else if (WICKET_API_NUMERIC_KEYS.has(key)) {
      if (val === null || val === '') {
        v = key in WICKET_API_FIELD_DEFAULTS ? WICKET_API_FIELD_DEFAULTS[key] : null
      } else {
        const n = Number(val)
        v = isNaN(n) ? val : n
      }
    } else if (WICKET_NET_PROVIDER_KEYS.has(key) && (val === null || val === '')) {
      v = ''
    } else if (key === 'materialYardGlob' && val === null) {
      v = null
    } else if (key in WICKET_API_FIELD_DEFAULTS && (val === null || val === '')) {
      v = WICKET_API_FIELD_DEFAULTS[key]
    } else if (val === null) {
      v = ''
    } else {
      v = val
    }
    const r = refMap[key]
    if (r) r.value = v
  }

  set('paintId', Object.prototype.hasOwnProperty.call(apiData, 'paintId') ? apiData.paintId : apiData.colorShieldId ?? null)
  if (refMap.paintName) refMap.paintName.value = typeof apiData.paintName === 'string' ? apiData.paintName : ''
  set('paintColorId', apiData.paintColorId ?? null)
  set('paintSelectionUnavailable', Boolean(Number(apiData.paintSelectionUnavailable)))
  if (refMap.paintSelection) {
    const selection = apiData.paintSelection as Record<string, unknown> | null | undefined
    refMap.paintSelection.value = selection ? { isFixedColor: Boolean(Number(selection.isFixedColor)), requiresColorNote: Boolean(Number(selection.requiresColorNote)), isPaintAvailable: Boolean(Number(selection.isPaintAvailable)) } : null
  }
  for (const [key, value] of Object.entries(apiData)) {
    if (['paintId', 'paintColorId', 'colorShieldId', 'paintSelection', 'paintSelectionUnavailable'].includes(key)) continue
    if (key === 'isTherePen' || key === 'isTherePenName') continue
    if (key === 'grilleLocation' || key === 'grilleSideCode' || key === 'grilleSideProblem') continue
    if (key === 'shieldType' || key === 'frameSubtypeCode' || key === 'frameSubtypeProblem') continue
    if (key === 'raspolozheniyePolotna' || key === 'fillingOrientationCode' || key === 'fillingOrientationProblem') continue
    if (key === 'fillSide' || key === 'fillingSideCount' || key === 'fillingSideCountProblem') continue
    if (key === 'materialFacadeGlob' || key === 'materialYardGlob'
      || key === 'materialFacadeGroupCode' || key === 'materialYardGroupCode' || key === 'fillingGroupProblems') continue
    if (participantRoleFields.some(field => key === field || key === `${field}Code`)) continue
    if (key === 'fillingProfileFacade' || key === 'fillingProfileFacadeProblem'
      || key === 'fillingProfileYard' || key === 'fillingProfileYardProblem') continue
    if (key === 'postProfile' || key === 'postProfileProblem'
      || key === 'jumperProfile' || key === 'jumperProfileProblem') continue
    if (key === 'openingOrientation' || key === 'openingOrientationProblem') continue
    if (key === 'hasStolby' || key === 'postsPresenceProblem'
      || key === 'jumperPlacement' || key === 'jumperPlacementProblem') continue
    if (WICKET_LEGACY_ACCESSORY_KEYS.has(key) || WICKET_LEGACY_CLIENT_KEYS.has(key)) continue
    set(key, value)
  }
  if (refMap.isTherePen && (Object.prototype.hasOwnProperty.call(apiData, 'isTherePen')
    || Object.prototype.hasOwnProperty.call(apiData, 'isTherePenName'))) {
    const presence = readPenPresence(apiData)
    refMap.isTherePen.value = presence
    if (refMap.isTherePenName) refMap.isTherePenName.value = optionPresenceLabel(presence, 'optional')
  }
  if (refMap.grilleLocation && (Object.prototype.hasOwnProperty.call(apiData, 'grilleLocation')
    || Object.prototype.hasOwnProperty.call(apiData, 'grilleSideCode'))) {
    refMap.grilleLocation.value = readGrilleSide(apiData)
  }
  if (refMap.shieldType && (Object.prototype.hasOwnProperty.call(apiData, 'shieldType')
    || Object.prototype.hasOwnProperty.call(apiData, 'frameSubtypeCode'))) {
    refMap.shieldType.value = readFrameSubtype(apiData)
  }
  if (refMap.raspolozheniyePolotna && (Object.prototype.hasOwnProperty.call(apiData, 'raspolozheniyePolotna')
    || Object.prototype.hasOwnProperty.call(apiData, 'fillingOrientationCode'))) {
    refMap.raspolozheniyePolotna.value = readFillingOrientation(apiData)
  }
  for (const field of participantRoleFields) {
    if (refMap[field] && (Object.prototype.hasOwnProperty.call(apiData, field) || Object.prototype.hasOwnProperty.call(apiData, `${field}Code`))) {
      refMap[field].value = readParticipantRole(apiData, field)
    }
  }
  if (refMap.fillSide && (Object.prototype.hasOwnProperty.call(apiData, 'fillSide')
    || Object.prototype.hasOwnProperty.call(apiData, 'fillingSideCount'))) {
    refMap.fillSide.value = readFillingSideCount(apiData)
  }
  for (const side of ['facade', 'yard'] as const) {
    const prefix = side === 'facade' ? 'materialFacade' : 'materialYard'
    const field = `${prefix}Glob`
    if (refMap[field] && (Object.prototype.hasOwnProperty.call(apiData, field)
      || Object.prototype.hasOwnProperty.call(apiData, `${prefix}GroupCode`))) {
      refMap[field].value = readFillingMaterialGroup(apiData, side)
    }
  }
  const openingReference = Object.prototype.hasOwnProperty.call(apiData, 'openingOptionId')
    ? apiData.openingOptionId : refMap.openingOptionId?.value
  const selection = parseOpeningSelection(openingReference, apiData.openingOrientation, apiData.openingOrientationProblem)
  for (const [key, value] of Object.entries(selection)) {
    if (refMap[key]) refMap[key].value = value
  }
  const jumperReference = Object.prototype.hasOwnProperty.call(apiData, 'peremichkaPolozheniyeId')
    ? apiData.peremichkaPolozheniyeId : refMap.peremichkaPolozheniyeId?.value
  const properties = {
    ...parseJumperSelection(jumperReference, apiData.jumperPlacement, apiData.jumperPlacementProblem),
    ...parsePostsSelection(apiData.hasStolby, apiData.postsPresenceProblem),
  }
  for (const [key, value] of Object.entries(properties)) {
    if (refMap[key]) refMap[key].value = value
  }
  const postUsed = properties.postsPresenceProblem === null && properties.hasStolby !== null
    ? properties.hasStolby === 1 : null
  const jumperUsed = properties.jumperPlacementProblem === null && properties.jumperPlacement !== null
    ? properties.jumperPlacement !== 'none' : null
  for (const [prefix, fk, used] of [
    ['post', 'stolbId', postUsed],
    ['jumper', 'assortmentJumperId', jumperUsed],
  ] as const) {
    // Validate the original FK, never its general numeric mapping or a caption.
    const rawId = apiData[fk]
    const validId = isPositiveSafeInteger(rawId) || parsePositiveDecimalId(rawId).kind === 'valid'
    const missingId = rawId === null || rawId === undefined || rawId === ''
    const descriptor = used === true && !validId
      ? { profile: null, profileProblem: missingId
        ? { code: 'missing', message: 'Необходимо выбрать трубу.' }
        : { code: 'invalid', message: 'Некорректный идентификатор выбранной трубы.' } }
      : parsePipeProfileDescriptor(apiData[`${prefix}Profile`], apiData[`${prefix}ProfileProblem`], used)
    if (refMap[`${prefix}Profile`]) refMap[`${prefix}Profile`].value = descriptor.profile
    if (refMap[`${prefix}ProfileProblem`]) refMap[`${prefix}ProfileProblem`].value = descriptor.profileProblem
  }
  for (const side of ['Facade', 'Yard'] as const) {
    const rawId = apiData[`id${side}`]
    const validId = isPositiveSafeInteger(rawId) || parsePositiveDecimalId(rawId).kind === 'valid'
    const absent = rawId === null || rawId === undefined || rawId === ''
    let descriptor = absent ? { profile: null, problem: null }
      : validId ? parseFillingDrawingDescriptor(apiData[`fillingProfile${side}`], apiData[`fillingProfile${side}Problem`])
        : parseFillingDrawingDescriptor(undefined, null)
    if (validId && descriptor.profile === null && descriptor.problem === null) {
      descriptor = { profile: null, problem: { code: 'missing', message: 'Для выбранного материала не настроен профиль отрисовки.' } }
    }
    if (refMap[`fillingProfile${side}`]) refMap[`fillingProfile${side}`].value = descriptor.profile
    if (refMap[`fillingProfile${side}Problem`]) refMap[`fillingProfile${side}Problem`].value = descriptor.problem
  }
}
