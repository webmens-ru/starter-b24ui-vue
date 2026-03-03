import { ref } from 'vue'

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

// Поля шага "Ручка"
const is_there_pen_name = ref<string>('Не будет')
const is_there_pen_id   = ref<number>(0)
const pen_provided      = ref<string>('Предоставляет изготовитель')
const pen_installed     = ref<string>('Устанавливает изготовитель')
const pen_color         = ref<string>('Черная')

// Поля шага "Тип замка"
const type_lock = ref<string>('Тип_1')

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
const width_side_part   = ref<string>('0')
const grille_location   = ref<string>('Возле петель')

// Поля шага "Заполнение (фасад)"
const id_facade                = ref<string | number>('')
const material_supplier_facade = ref<string>('')
const material_facade          = ref<string>('')
const form_facade              = ref<string>('')
const type_of_coating_facade   = ref<string>('')
const color_facade             = ref<string>('')

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

  function updatePriceBlock(dealer: string | number, retail: string | number) {
    price_dealer.value = dealer
    price_retail.value = retail
    updateOrCreateBlock('Цена', [
      { name: 'Дилерская цена', value: String(dealer) },
      { name: 'Рек. розн. цена', value: String(retail) },
    ])
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
    type_lock,
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
    grille_location,
    id_facade,
    material_supplier_facade,
    material_facade,
    form_facade,
    type_of_coating_facade,
    color_facade,
    price_retail,
    price_dealer,
    fields_filled,
    setActivePage,
    isPageAccessible,
    updateOrCreateBlock,
    removeAllBlocksExcept,
    updatePriceBlock,
  }
}
