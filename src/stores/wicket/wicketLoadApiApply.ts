import { parseOpeningSelection } from '../../components/wicket/openingOrientation'
import { parseJumperSelection, parsePostsSelection } from '../../app/api/jumperProperties'
import { parsePipeProfileDescriptor } from '../../app/api/pipeProfiles'
import { isPositiveSafeInteger, parsePositiveDecimalId } from '../../app/positiveDecimalId'

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
  'isTherePen',
  'isThereLock',
  'lockPenId',
  'lockSetId',
  'additionalPenId',
  'lockPenColorId',
  'penColorId',
  'primerId',
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
  providesMaterial: 'Предоставляет изготовитель',
  providesPaint: 'Предоставляет изготовитель',
  providesPrimer: 'Предоставляет изготовитель',
  doesPaintingFrame: 'Выполняет изготовитель',
  doesAssembly: 'Выполняет изготовитель',
  fillSide: 'Одна сторона',
  materialFacadeGlob: 'Сайдинг',
  nalichieStolbovName: 'Со столбами',
  raspolozheniyePolotna: 'Вертикально',
  sostoyaniyeProyema: 'Готов',
  shieldType: 'Тип_1',
  grilleLocation: 'Возле петель',
  netWidthProviderTop: 'executor',
  netWidthProviderLower: 'executor',
  netWidthProviderSide: 'executor',
  heightTopPart: '0',
  heightLowerPart: '0',
  widthSidePart: '0',
  isThereLockName: 'Есть',
  isThereLock: 1,
  providesLock: 'Предоставляет изготовитель',
  lockInstaller: 'Выполняет изготовитель',
  typeLock: 'Тип_1',
  lockSetId: null,
  lockPenColor: '',
  lockPenColorId: null,
  isTherePenName: 'Не будет',
  isTherePen: 0,
  penProvided: 'Предоставляет изготовитель',
  penInstalled: 'Устанавливает изготовитель',
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
    if (key === 'orderId' || key === 'productRowId') {
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

  for (const [key, value] of Object.entries(apiData)) {
    if (key === 'postProfile' || key === 'postProfileProblem'
      || key === 'jumperProfile' || key === 'jumperProfileProblem') continue
    if (key === 'openingOrientation' || key === 'openingOrientationProblem') continue
    if (key === 'hasStolby' || key === 'postsPresenceProblem'
      || key === 'jumperPlacement' || key === 'jumperPlacementProblem') continue
    if (WICKET_LEGACY_ACCESSORY_KEYS.has(key) || WICKET_LEGACY_CLIENT_KEYS.has(key)) continue
    set(key, value)
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
}
