import { ref, computed } from 'vue'

export interface CalcBlock {
  blockName: string
  params: { name: string; value: string }[]
}

// Глобальное реактивное состояние (singleton — общее для всех компонентов)
const modelId    = ref<string | number>('')
const number     = ref<string | number>('')
const productType = ref<string>('')
const model      = ref<string>('')

const activePage   = ref<string>('page1')
const visitedPages = ref<string[]>([])
const data         = ref<CalcBlock[]>([])

// Поля шага "Вариант изготовления"
const provides_material    = ref<string>('Предоставляет изготовитель')
const provides_paint       = ref<string>('Предоставляет изготовитель')
const does_painting_frame  = ref<string>('Выполняет изготовитель')
const does_assembly        = ref<string>('Выполняет изготовитель')

// Поля шага "Заполнение"
const fill_side            = ref<string>('Одна сторона')
const material_facade_glob = ref<string>('Сайдинг')
const material_yard_glob   = ref<string | null>(null)

// Поля шага "Столбы / Вариант открытия / Перемычка"
const nalichie_stolbov_name       = ref<string>('Со столбами')
const nalichie_stolbov_id         = ref<number>(1)
const stolb_id                    = ref<string | number>('')
const stolb_name                  = ref<string>('')
const opening_option_name         = ref<string>('')
const opening_option_id           = ref<number | null>(null)
const opening_option_path_photo   = ref<string>('')
const peremichka_polozheniye_id   = ref<string>('')
const peremichka_polozheniye_name = ref<string>('')
const peremichka_sortament_id     = ref<string | number | null>(null)
const peremichka_sortament_name   = ref<string | null>(null)

// Поля шага "Клиент"
const calculation_name  = ref<string>('')
const client_name       = ref<string>('')
const client_last_name  = ref<string>('')
const client_surname    = ref<string>('')
const client_phone      = ref<string>('')
const client_email      = ref<string>('')
const client_address    = ref<string>('')
const client_comment    = ref<string>('')
const country_code      = ref<string>('+7')

// Поля шага "Ручка" (дополнительная ручка / скоба)
const is_there_pen_name   = ref<string>('Не будет')
const is_there_pen_id     = ref<number>(0)
const pen_provided        = ref<string>('Предоставляет изготовитель')
const pen_installed       = ref<string>('Устанавливает изготовитель')
const pen_color           = ref<string>('Черная')
const additional_pen_id     = ref<number | null>(null)
const additional_pen_color  = ref<string>('')
const additional_pen_marking = ref<string>('')

// Поля шага "Тип замка" и ручки в комплекте
const type_lock      = ref<string>('Тип_1')
const lock_set_id    = ref<number | null>(null)
const lock_pen_id    = ref<number | null>(null)
const lock_pen_color = ref<string>('Черная')

// Поля шага "Замок"
const is_there_lock_name = ref<string>('Есть')
const is_there_lock_id   = ref<number>(1)
const provides_lock      = ref<string>('Предоставляет изготовитель')
const lock_installer     = ref<string>('Выполняет изготовитель')
const is_there_cable     = ref<string>('Изготовитель устанавливает')

// Поля шага "Проем"
const width_proyema      = ref<string>('')
const height_proyema     = ref<string>('')
const clearance_proyema  = ref<string>('')
const sostoyaniye_proyema = ref<string>('Готов')

// Поля шага "Расположение полотна"
const raspolozheniye_polotna = ref<string>('Вертикально')

// Поля шага "Тип щита"
const shield_type       = ref<string>('Тип_1')
const color_shield_id   = ref<string | number>('')
const color_shield_name = ref<string>('')
const height_top_part   = ref<string>('0')
const height_lower_part = ref<string>('0')
const width_side_part         = ref<string>('0')
const assortment_side_grille_net_id = ref<string | number | null>(null)
const assortment_height_upper_net_id = ref<string | number | null>(null)
const assortment_height_lower_net_id = ref<string | number | null>(null)
const grille_location         = ref<string>('Возле петель')
const net_width_provider_top  = ref<string>('executor')
const net_width_provider_lower = ref<string>('executor')
const net_width_provider_side  = ref<string>('executor')

// Поля шага "Заполнение (фасад)"
const id_facade                = ref<string | number>('')
const material_supplier_facade = ref<string>('')
const material_facade          = ref<string>('')
const form_facade              = ref<string>('')
const thickness_facade         = ref<string>('')
const type_of_coating_facade   = ref<string>('')
const color_facade             = ref<string>('')

// Поля шага "Заполнение (двор)"
const id_yard                = ref<string | number>('')
const material_supplier_yard = ref<string>('')
const material_yard          = ref<string>('')
const form_yard              = ref<string>('')
const thickness_yard         = ref<string>('')
const type_of_coating_yard   = ref<string>('')
const color_yard             = ref<string>('')

// Цена
const price_retail  = ref<string | number>('')
const price_dealer  = ref<string | number>('')
const fields_filled = ref<number>(0)

export function useCalculation() {
  function setActivePage(page: string) {
    if (!visitedPages.value.includes(page)) {
      visitedPages.value.push(page)
    }
    activePage.value = page
    document.dispatchEvent(new Event('updatedActivePage'))
  }

  function isPageAccessible(page: string) {
    return visitedPages.value.includes(page) || activePage.value === page
  }

  /** Раздел «Заполнение» неполный: сброшен материал или не выбран материал двора при «Две стороны». */
  const isFillSectionIncomplete = computed(() => {
    const hasFacade = id_facade.value != null && String(id_facade.value).trim() !== ''
    const needYard = fill_side.value === 'Две стороны'
    const hasYard = id_yard.value != null && String(id_yard.value).trim() !== ''
    return !hasFacade || (needYard && !hasYard)
  })

  /** Базовый payload для saveWicketData: order_id, model_id, reached_step, visited_pages */
  function getBaseSavePayload(): { order_id: number; model_id: string | number; reached_step: string; visited_pages: string } {
    return {
      order_id: Number(number.value),
      model_id: modelId.value,
      reached_step: activePage.value,
      visited_pages: JSON.stringify(visitedPages.value),
    }
  }

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

  /** Сброс состояния для нового расчёта (при переходе на страницу выбора типа изделия). */
  function reset() {
    data.value = []
    visitedPages.value = []
    activePage.value = 'page1'
    number.value = ''
    productType.value = ''
    model.value = ''
    modelId.value = ''
    price_retail.value = ''
    price_dealer.value = ''
    provides_material.value = 'Предоставляет изготовитель'
    provides_paint.value = 'Предоставляет изготовитель'
    does_painting_frame.value = 'Выполняет изготовитель'
    does_assembly.value = 'Выполняет изготовитель'
    fill_side.value = 'Одна сторона'
    material_facade_glob.value = 'Сайдинг'
    material_yard_glob.value = null
    nalichie_stolbov_name.value = 'Со столбами'
    nalichie_stolbov_id.value = 1
    stolb_id.value = ''
    stolb_name.value = ''
    opening_option_name.value = ''
    opening_option_id.value = null
    opening_option_path_photo.value = ''
    peremichka_polozheniye_id.value = ''
    peremichka_polozheniye_name.value = ''
    peremichka_sortament_id.value = null
    peremichka_sortament_name.value = null
    calculation_name.value = ''
    client_name.value = ''
    client_last_name.value = ''
    client_surname.value = ''
    client_phone.value = ''
    client_email.value = ''
    client_address.value = ''
    client_comment.value = ''
    country_code.value = '+7'
    is_there_pen_name.value = 'Не будет'
    is_there_pen_id.value = 0
    pen_provided.value = 'Предоставляет изготовитель'
    pen_installed.value = 'Устанавливает изготовитель'
    pen_color.value = 'Черная'
    additional_pen_id.value = null
    additional_pen_color.value = ''
    additional_pen_marking.value = ''
    type_lock.value = 'Тип_1'
    lock_set_id.value = null
    lock_pen_id.value = null
    lock_pen_color.value = 'Черная'
    is_there_lock_name.value = 'Есть'
    is_there_lock_id.value = 1
    provides_lock.value = 'Предоставляет изготовитель'
    lock_installer.value = 'Выполняет изготовитель'
    is_there_cable.value = 'Изготовитель устанавливает'
    width_proyema.value = ''
    height_proyema.value = ''
    clearance_proyema.value = ''
    sostoyaniye_proyema.value = 'Готов'
    raspolozheniye_polotna.value = 'Вертикально'
    shield_type.value = 'Тип_1'
    color_shield_id.value = ''
    color_shield_name.value = ''
    height_top_part.value = '0'
    height_lower_part.value = '0'
    width_side_part.value = '0'
    assortment_side_grille_net_id.value = null
    assortment_height_upper_net_id.value = null
    assortment_height_lower_net_id.value = null
    grille_location.value = 'Возле петель'
    net_width_provider_top.value = 'executor'
    net_width_provider_lower.value = 'executor'
    net_width_provider_side.value = 'executor'
    id_facade.value = ''
    material_supplier_facade.value = ''
    material_facade.value = ''
    form_facade.value = ''
    thickness_facade.value = ''
    type_of_coating_facade.value = ''
    color_facade.value = ''
    id_yard.value = ''
    material_supplier_yard.value = ''
    material_yard.value = ''
    form_yard.value = ''
    thickness_yard.value = ''
    type_of_coating_yard.value = ''
    color_yard.value = ''
    document.dispatchEvent(new Event('dataUpdated'))
  }

  function updatePriceBlock(dealer: string | number, retail: string | number) {
    price_dealer.value = dealer
    price_retail.value = retail
    updateOrCreateBlock('Цена', [
      { name: 'Дилерская цена', value: String(dealer) },
      { name: 'Рек. розн. цена', value: String(retail) },
    ])
  }

  /**
   * Вычисляет visitedPages и activePage по текущему состоянию ref'ов.
   * Используется при пустом visitedPages из API (старые заказы).
   * Логика повторяет BaseModel::isStepCompleted / getReachedStepProgress.
   */
  function computeProgressFromState(apiData?: Record<string, unknown>): { visitedPages: string[]; activePage: string } {
    const stepOrder = ['page1', 'page2', 'page3', 'page5', 'page6', 'page7', 'page9', 'page10', 'page11', 'page12']
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
          completed = notEmpty(provides_material.value) && notEmpty(provides_paint.value) && notEmpty(does_painting_frame.value)
          break
        case 'page2':
          completed = notEmpty(fill_side.value) || !!(id_facade.value && String(id_facade.value)) || !!(id_yard.value && String(id_yard.value))
          break
        case 'page3':
          completed = notEmpty(shield_type.value)
          break
        case 'page5':
          completed = opening_option_id.value != null && (Number(opening_option_id.value) || 0) > 0
          break
        case 'page6':
          completed = notEmpty(raspolozheniye_polotna.value)
          break
        case 'page7':
          completed = numGt(width_proyema.value as string | number, 0) && numGt(height_proyema.value as string | number, 0)
          break
        case 'page9':
          completed = is_there_lock_id.value !== null
          break
        case 'page10':
          completed = is_there_pen_id.value !== null
          break
        case 'page11': {
          const snap = apiData?.client_snapshot
          const hasSnapshot = snap != null && String(snap).trim() !== ''
          const hasClient = notEmpty(client_name.value) || notEmpty(client_phone.value) || notEmpty(client_email.value) || notEmpty(client_address.value)
          completed = hasSnapshot || hasClient
          break
        }
        case 'page12':
          completed = notEmpty(price_retail.value)
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
    const refMap: Record<string, { value: unknown }> = {
      order_id: number,
      orderId: number,
      product_type: productType,
      model,
      provides_material,
      provides_paint,
      does_painting_frame,
      does_assembly,
      fill_side,
      material_facade_glob,
      material_yard_glob,
      nalichie_stolbov_name,
      nalichie_stolbov_id,
      stolb_id,
      stolb_name,
      opening_option_name,
      opening_option_id,
      opening_option_path_photo,
      peremichka_polozheniye_id,
      peremichka_polozheniye_name,
      peremichka_sortament_id,
      peremichka_sortament_name,
      calculation_name,
      client_name,
      client_last_name,
      client_surname,
      client_phone,
      client_email,
      client_address,
      client_comment,
      country_code,
      is_there_pen_name,
      is_there_pen_id,
      pen_provided,
      pen_installed,
      pen_color,
      additional_pen_id,
      additional_pen_color,
      additional_pen_marking,
      type_lock,
      lock_set_id,
      lock_pen_id,
      lock_pen_color,
      is_there_lock_name,
      is_there_lock_id,
      provides_lock,
      lock_installer,
      is_there_cable,
      width_proyema,
      height_proyema,
      clearance_proyema,
      sostoyaniye_proyema,
      raspolozheniye_polotna,
      shield_type,
      color_shield_id,
      color_shield_name,
      height_top_part,
      height_lower_part,
      width_side_part,
      assortment_side_grille_net_id,
      assortment_height_upper_net_id,
      assortment_height_lower_net_id,
      grille_location,
      net_width_provider_top,
      net_width_provider_lower,
      net_width_provider_side,
      // Обратная совместимость: до миграции API может вернуть assortment_grille_net_id
      assortment_grille_net_id: assortment_side_grille_net_id,
      id_facade,
      material_supplier_facade,
      material_facade,
      form_facade,
      thickness_facade,
      type_of_coating_facade,
      color_facade,
      id_yard,
      material_supplier_yard,
      material_yard,
      form_yard,
      thickness_yard,
      type_of_coating_yard,
      color_yard,
      price_retail,
      price_dealer,
    }

    // Поля, которые должны быть строго числами (используются в сравнении с числовыми value radio-кнопок)
    const numericKeys = new Set([
      'nalichie_stolbov_id',
      'opening_option_id',
      'is_there_pen_id',
      'is_there_lock_id',
      'lock_pen_id',
      'lock_set_id',
      'additional_pen_id',
    ])

    // Значения по умолчанию для страниц, которые ещё не заполнены (когда API возвращает null или '')
    const fieldDefaults: Record<string, string | number | null> = {
      provides_material:   'Предоставляет изготовитель',
      provides_paint:      'Предоставляет изготовитель',
      does_painting_frame: 'Выполняет изготовитель',
      does_assembly:       'Выполняет изготовитель',
      fill_side:           'Одна сторона',
      material_facade_glob:'Сайдинг',
      nalichie_stolbov_name: 'Со столбами',
      nalichie_stolbov_id:  1,
      raspolozheniye_polotna: 'Вертикально',
      sostoyaniye_proyema: 'Готов',
      shield_type:        'Тип_1',
      grille_location:    'Возле петель',
      net_width_provider_top:  'executor',
      net_width_provider_lower: 'executor',
      net_width_provider_side:  'executor',
      height_top_part:    '0',
      height_lower_part:  '0',
      width_side_part:    '0',
      is_there_lock_name:  'Есть',
      is_there_lock_id:    1,
      provides_lock:      'Предоставляет изготовитель',
      lock_installer:     'Выполняет изготовитель',
      is_there_cable:     'Изготовитель устанавливает',
      type_lock:          'Тип_1',
      lock_set_id:        null,
      lock_pen_color:      'Черная',
      is_there_pen_name:   'Не будет',
      is_there_pen_id:     0,
      pen_provided:       'Предоставляет изготовитель',
      pen_installed:      'Устанавливает изготовитель',
      pen_color:          'Черная',
      additional_pen_id:     null,
      additional_pen_color:  '',
      additional_pen_marking: '',
      country_code:       '+7',
    }

    function set(key: string, val: unknown) {
      if (val === undefined) return
      let v: unknown
      // order_id — ID заказа (int), для number можно хранить как число или строку
      if (key === 'order_id' || key === 'orderId') {
        v = val != null ? (typeof val === 'number' ? val : Number(val) || val) : ''
      } else if (numericKeys.has(key)) {
        if (val === null || val === '') {
          v = key in fieldDefaults ? fieldDefaults[key] : null
        } else {
          const n = Number(val)
          v = isNaN(n) ? val : n
        }
      } else if (key === 'material_yard_glob' && val === null) {
        v = null
      } else if (key in fieldDefaults && (val === null || val === '')) {
        v = fieldDefaults[key]
      } else if (val === null) {
        v = ''
      } else {
        v = val
      }
      const r = refMap[key]
      if (r) (r as { value: unknown }).value = v
    }

    for (const [key, value] of Object.entries(apiData)) {
      set(key, value)
    }

    // Когда additional_pen_id задан, цвет хранится в pen_color — синхронизируем additional_pen_color
    if (additional_pen_id.value != null && pen_color.value && !additional_pen_color.value) {
      additional_pen_color.value = pen_color.value
    }

    // При редактировании — только этапы, до которых пользователь уже дошёл
    const apiVisited = Array.isArray(apiData.visitedPages) ? apiData.visitedPages : []
    if (apiVisited.length > 0) {
      visitedPages.value = [...apiVisited]
      if (typeof apiData.activePage === 'string' && apiData.activePage) {
        activePage.value = apiData.activePage
        if (!visitedPages.value.includes(apiData.activePage)) {
          visitedPages.value = [...visitedPages.value, apiData.activePage]
        }
      }
    } else {
      const progress = computeProgressFromState(apiData)
      visitedPages.value = progress.visitedPages
      activePage.value = progress.activePage
    }

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
        { name: 'Материал заполнения', value: provides_material.value },
        { name: 'Краска', value: provides_paint.value },
        { name: 'Окраска каркаса', value: does_painting_frame.value },
        { name: 'Сборка', value: does_assembly.value },
      ],
    })

    // Заполнение
    const fillParams: CalcBlock['params'] = [
      { name: 'Сторона заполнения', value: fill_side.value },
      { name: 'Материал заполнения (фасад)', value: material_facade_glob.value },
    ]
    if (fill_side.value === 'Две стороны') {
      fillParams.push({ name: 'Материал заполнения (двор)', value: material_yard_glob.value ?? '' })
    }
    blocks.push({ blockName: 'Заполнение', params: fillParams })

    // Заполнение (фасад) — сайдинг или профлист
    if (id_facade.value || material_facade.value) {
      const isProfnastil = material_facade_glob.value === 'Профлист'
      blocks.push({
        blockName: 'Заполнение (фасад)',
        params: isProfnastil
          ? [
              { name: 'Производитель материала', value: material_supplier_facade.value },
              { name: 'Материал', value: material_facade.value },
              { name: 'Толщина листа', value: thickness_facade.value },
              { name: 'Тип покрытия', value: type_of_coating_facade.value },
              { name: 'Цвет', value: color_facade.value },
            ]
          : [
              { name: 'Производитель материала', value: material_supplier_facade.value },
              { name: 'Материал', value: material_facade.value },
              { name: 'Форма', value: form_facade.value },
              { name: 'Тип покрытия', value: type_of_coating_facade.value },
              { name: 'Цвет', value: color_facade.value },
            ],
      })
    }

    // Заполнение (двор) — только при "Две стороны"
    if (fill_side.value === 'Две стороны' && (id_yard.value || material_yard.value)) {
      const isProfnastil = material_yard_glob.value === 'Профлист'
      blocks.push({
        blockName: 'Заполнение (двор)',
        params: isProfnastil
          ? [
              { name: 'Производитель материала', value: material_supplier_yard.value },
              { name: 'Материал', value: material_yard.value },
              { name: 'Толщина листа', value: thickness_yard.value },
              { name: 'Тип покрытия', value: type_of_coating_yard.value },
              { name: 'Цвет', value: color_yard.value },
            ]
          : [
              { name: 'Производитель материала', value: material_supplier_yard.value },
              { name: 'Материал', value: material_yard.value },
              { name: 'Форма', value: form_yard.value },
              { name: 'Тип покрытия', value: type_of_coating_yard.value },
              { name: 'Цвет', value: color_yard.value },
            ],
      })
    }

    // Столбы / вариант открытия / перемычка
    const stolbParams: CalcBlock['params'] = [
      { name: 'Наличие столбов', value: nalichie_stolbov_name.value },
    ]
    if (nalichie_stolbov_id.value === 1 && stolb_name.value) {
      stolbParams.push({ name: 'Сортамент столбов', value: stolb_name.value })
    }
    if (opening_option_name.value) {
      stolbParams.push({ name: 'Вариант открытия', value: opening_option_name.value })
    }
    if (peremichka_polozheniye_name.value) {
      stolbParams.push({ name: 'Положение перемычки', value: peremichka_polozheniye_name.value })
    }
    if (peremichka_sortament_name.value) {
      stolbParams.push({ name: 'Сортамент перемычки', value: peremichka_sortament_name.value })
    }
    blocks.push({ blockName: 'Столбы / вариант открытия / перемычка', params: stolbParams })

    // Тип щита
    const shieldParams: CalcBlock['params'] = [
      { name: 'Тип щита', value: shield_type.value },
    ]
    if (color_shield_name.value) {
      shieldParams.push({ name: 'Цвет рамы', value: color_shield_name.value })
    }
    if (shield_type.value === 'Тип_3' && height_top_part.value && height_top_part.value !== '0') {
      shieldParams.push({ name: 'Высота верхней части', value: height_top_part.value })
    }
    if ((shield_type.value === 'Тип_2' || shield_type.value === 'Тип_3') && height_lower_part.value && height_lower_part.value !== '0') {
      shieldParams.push({ name: 'Высота нижней части', value: height_lower_part.value })
    }
    if (shield_type.value === 'Тип_4') {
      if (width_side_part.value && width_side_part.value !== '0') {
        shieldParams.push({ name: 'Ширина боковой части', value: width_side_part.value })
      }
      if (grille_location.value) {
        shieldParams.push({ name: 'Расположение решётки', value: grille_location.value })
      }
    }
    blocks.push({ blockName: 'Тип щита', params: shieldParams })

    // Расположение полотна
    blocks.push({
      blockName: 'Расположение полотна',
      params: [{ name: 'Расположение полотна', value: raspolozheniye_polotna.value }],
    })

    // Проем
    if (width_proyema.value || height_proyema.value || clearance_proyema.value) {
      blocks.push({
        blockName: 'Проем',
        params: [
          { name: 'Ширина', value: width_proyema.value },
          { name: 'Высота', value: height_proyema.value },
          { name: 'Просвет', value: clearance_proyema.value },
          { name: 'Состояние проема', value: sostoyaniye_proyema.value },
        ],
      })
    }

    // Замок
    const lockParams: CalcBlock['params'] = [
      { name: 'Замок есть/нет', value: is_there_lock_name.value },
    ]
    if (is_there_lock_id.value === 1) {
      lockParams.push({ name: 'Замок предоставляет', value: provides_lock.value })
      lockParams.push({ name: 'Врезку замка выполняет', value: lock_installer.value })
      lockParams.push({ name: 'Кабель для э/м замка', value: is_there_cable.value })
      lockParams.push({ name: 'Тип замка', value: type_lock.value || '' })
      if (lock_pen_id.value != null) {
        lockParams.push({ name: 'Цвет ручки', value: lock_pen_color.value })
      }
    }
    blocks.push({ blockName: 'Замок', params: lockParams })

    // Дополнительная ручка (скоба)
    const penParams: CalcBlock['params'] = [
      { name: 'Дополнительная ручка', value: is_there_pen_name.value },
    ]
    if (is_there_pen_id.value === 1) {
      penParams.push({ name: 'Ручку предоставляет', value: pen_provided.value })
      penParams.push({ name: 'Ручку устанавливает', value: pen_installed.value })
      if (pen_provided.value === 'Предоставляет изготовитель') {
        if (additional_pen_id.value != null && additional_pen_marking.value) {
          penParams.push({ name: 'Модель ручки', value: additional_pen_marking.value })
        }
        penParams.push({ name: 'Цвет ручки', value: additional_pen_color.value || pen_color.value })
      }
    }
    blocks.push({ blockName: 'Дополнительная ручка (скоба)', params: penParams })

    // Клиент
    blocks.push({
      blockName: 'Клиент',
      params: [
        { name: 'Название расчета', value: calculation_name.value },
        { name: 'Имя', value: client_name.value },
        { name: 'Фамилия', value: client_last_name.value },
        { name: 'Отчество', value: client_surname.value },
        { name: 'Телефон', value: client_phone.value },
        { name: 'Эл. почта', value: client_email.value },
        { name: 'Адрес', value: client_address.value },
        { name: 'Комментарий', value: client_comment.value },
      ],
    })

    // Цена
    if (price_dealer.value || price_retail.value) {
      blocks.push({
        blockName: 'Цена',
        params: [
          { name: 'Дилерская цена', value: String(price_dealer.value) },
          { name: 'Рек. розн. цена', value: String(price_retail.value) },
        ],
      })
    }

    data.value = blocks
    document.dispatchEvent(new Event('dataUpdated'))
  }

  return {
    modelId,
    number,
    productType,
    model,
    activePage,
    visitedPages,
    data,
    provides_material,
    provides_paint,
    does_painting_frame,
    does_assembly,
    fill_side,
    material_facade_glob,
    material_yard_glob,
    nalichie_stolbov_name,
    nalichie_stolbov_id,
    stolb_id,
    stolb_name,
    opening_option_name,
    opening_option_id,
    opening_option_path_photo,
    peremichka_polozheniye_id,
    peremichka_polozheniye_name,
    peremichka_sortament_id,
    peremichka_sortament_name,
    calculation_name,
    client_name,
    client_last_name,
    client_surname,
    client_phone,
    client_email,
    client_address,
    client_comment,
    country_code,
    is_there_pen_name,
    is_there_pen_id,
    pen_provided,
    pen_installed,
    pen_color,
    additional_pen_id,
    additional_pen_color,
    additional_pen_marking,
    type_lock,
    lock_set_id,
    lock_pen_id,
    lock_pen_color,
    is_there_lock_name,
    is_there_lock_id,
    provides_lock,
    lock_installer,
    is_there_cable,
    width_proyema,
    height_proyema,
    clearance_proyema,
    sostoyaniye_proyema,
    raspolozheniye_polotna,
    shield_type,
    color_shield_id,
    color_shield_name,
    height_top_part,
    height_lower_part,
    width_side_part,
    assortment_side_grille_net_id,
    assortment_height_upper_net_id,
    assortment_height_lower_net_id,
    grille_location,
    net_width_provider_top,
    net_width_provider_lower,
    net_width_provider_side,
    id_facade,
    material_supplier_facade,
    material_facade,
    form_facade,
    thickness_facade,
    type_of_coating_facade,
    color_facade,
    id_yard,
    material_supplier_yard,
    material_yard,
    form_yard,
    thickness_yard,
    type_of_coating_yard,
    color_yard,
    price_retail,
    price_dealer,
    fields_filled,
    setActivePage,
    isPageAccessible,
    isFillSectionIncomplete,
    getBaseSavePayload,
    updateOrCreateBlock,
    removeAllBlocksExcept,
    updatePriceBlock,
    loadFromApi,
    reset,
  }
}
