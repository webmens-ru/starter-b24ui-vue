/**
 * Маппинг полей ответа get-data в ref'ы формы калитки.
 * Разделено от Pinia-стора, чтобы при расхождении типов 1/2 вынести ветвление по model_id.
 */

/** Поля, которые должны быть строго числами (сравнение с value radio). */
export const WICKET_API_NUMERIC_KEYS = new Set([
  'nalichie_stolbov_id',
  'opening_option_id',
  'is_there_pen_id',
  'is_there_lock_id',
  'lock_pen_id',
  'lock_set_id',
  'additional_pen_id',
])

export const WICKET_API_FIELD_DEFAULTS: Record<string, string | number | null> = {
  provides_material: 'Предоставляет изготовитель',
  provides_paint: 'Предоставляет изготовитель',
  does_painting_frame: 'Выполняет изготовитель',
  does_assembly: 'Выполняет изготовитель',
  fill_side: 'Одна сторона',
  material_facade_glob: 'Сайдинг',
  nalichie_stolbov_name: 'Со столбами',
  nalichie_stolbov_id: 1,
  raspolozheniye_polotna: 'Вертикально',
  sostoyaniye_proyema: 'Готов',
  shield_type: 'Тип_1',
  grille_location: 'Возле петель',
  net_width_provider_top: 'executor',
  net_width_provider_lower: 'executor',
  net_width_provider_side: 'executor',
  height_top_part: '0',
  height_lower_part: '0',
  width_side_part: '0',
  is_there_lock_name: 'Есть',
  is_there_lock_id: 1,
  provides_lock: 'Предоставляет изготовитель',
  lock_installer: 'Выполняет изготовитель',
  is_there_cable: 'Изготовитель устанавливает',
  type_lock: 'Тип_1',
  lock_set_id: null,
  lock_pen_color: 'Черная',
  is_there_pen_name: 'Не будет',
  is_there_pen_id: 0,
  pen_provided: 'Предоставляет изготовитель',
  pen_installed: 'Устанавливает изготовитель',
  pen_color: 'Черная',
  additional_pen_id: null,
  additional_pen_color: '',
  additional_pen_marking: '',
  country_code: '+7',
}

type RefLike = { value: unknown }

/**
 * Записывает пары ключ/значение из API в refMap (общий контракт type1/type2).
 * При расхождении полей по типу — оборачивать вызов в маппер по `model_id` в сторе.
 */
export function applyWicketApiFieldMappings(
  apiData: Record<string, unknown>,
  refMap: Record<string, RefLike>,
): void {
  function set(key: string, val: unknown) {
    if (val === undefined) return
    let v: unknown
    if (key === 'order_id' || key === 'orderId') {
      v = val != null ? (typeof val === 'number' ? val : Number(val) || val) : ''
    } else if (WICKET_API_NUMERIC_KEYS.has(key)) {
      if (val === null || val === '') {
        v = key in WICKET_API_FIELD_DEFAULTS ? WICKET_API_FIELD_DEFAULTS[key] : null
      } else {
        const n = Number(val)
        v = isNaN(n) ? val : n
      }
    } else if (key === 'material_yard_glob' && val === null) {
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
