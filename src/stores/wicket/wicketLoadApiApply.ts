/**
 * Маппинг полей ответа get-data в ref'ы формы калитки.
 * Разделено от Pinia-стора, чтобы при расхождении типов 1/2 вынести ветвление по modelId.
 */

/** Поля, которые должны быть строго числами (сравнение с value radio). */
export const WICKET_API_NUMERIC_KEYS = new Set([
  'hasStolby',
  'openingOptionId',
  'isTherePen',
  'isThereLock',
  'lockPenId',
  'lockSetId',
  'additionalPenId',
  'lockPenColorId',
  'penColorId',
])

/** Поля, которые приходят из API как JSON-массив ID. */
export const WICKET_API_ARRAY_KEYS = new Set([
  'lockComponentIds',
])

export const WICKET_API_FIELD_DEFAULTS: Record<string, string | number | null> = {
  providesMaterial: 'Предоставляет изготовитель',
  providesPaint: 'Предоставляет изготовитель',
  doesPaintingFrame: 'Выполняет изготовитель',
  doesAssembly: 'Выполняет изготовитель',
  fillSide: 'Одна сторона',
  materialFacadeGlob: 'Сайдинг',
  nalichieStolbovName: 'Со столбами',
  hasStolby: 1,
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
  isThereCable: 'Изготовитель устанавливает',
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
  countryCode: '+7',
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
    if (key === 'orderId') {
      v = val != null ? (typeof val === 'number' ? val : Number(val) || val) : ''
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
    set(key, value)
  }
}
