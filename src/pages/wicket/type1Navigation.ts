/** Логика навигации по шагам формы Type1. Вынесена для тестирования. */

export interface Type1NavState {
  material_facade_glob: string
  fill_side: string
  material_yard_glob: string | null
  is_there_lock_id: number
  /** Кто предоставляет замок. При "Предоставляет заказчик" шаг выбора комплекта пропускается */
  provides_lock: string
}

const MENU_ITEMS = [
  { url: 'manufacturing-option', page: 'page1', label: 'Вариант изготовления' },
  { url: 'fill-side', page: 'page2', label: 'Заполнение' },
  { url: 'stolb-variant-otkritiya-peremichka-2', page: 'page5', label: 'Столбы / Вариант открытия / Перемычка' },
  { url: 'shield-type', page: 'page3', label: 'Тип щита' },
  { url: 'raspolozheniye-polotna', page: 'page6', label: 'Расположение полотна' },
  { url: 'razmery-proyema', page: 'page7', label: 'Проем' },
  { url: 'is-there-lock', page: 'page9', label: 'Комплект замка' },
  { url: 'pen', page: 'page10', label: 'Дополнительная ручка' },
  { url: 'client', page: 'page11', label: 'Клиент' },
  { url: 'end', page: 'page12', label: 'Рассчитать' },
]

export function getNextPage(from: string, state: Type1NavState): string | null {
  switch (from) {
    case 'page2':
      return state.material_facade_glob === 'Профлист' ? 'page2_facade_profnastil' : 'page2_facade_siding'
    case 'page2_facade_siding':
    case 'page2_facade_profnastil':
      if (state.fill_side === 'Одна сторона') return 'page5'
      return state.material_yard_glob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page2_yard_siding':
    case 'page2_yard_profnastil':
      return 'page5'
    case 'page9':
      // Замок есть + предоставляет изготовитель → выбор комплекта; иначе → ручка (пропуск)
      if (state.is_there_lock_id === 1 && state.provides_lock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page10'
    case 'page_lock_type':
      return 'page10'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx !== -1 && idx < MENU_ITEMS.length - 1 ? MENU_ITEMS[idx + 1].page : null
    }
  }
}

export function getPrevPage(from: string, state: Type1NavState): string | null {
  switch (from) {
    case 'page2_facade_siding':
    case 'page2_facade_profnastil':
      return 'page2'
    case 'page2_yard_siding':
    case 'page2_yard_profnastil':
      return state.material_facade_glob === 'Профлист' ? 'page2_facade_profnastil' : 'page2_facade_siding'
    case 'page5':
      if (state.fill_side === 'Одна сторона') {
        return state.material_facade_glob === 'Профлист' ? 'page2_facade_profnastil' : 'page2_facade_siding'
      }
      return state.material_yard_glob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page_lock_type':
      return 'page9'
    case 'page10':
      if (state.is_there_lock_id === 1 && state.provides_lock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page9'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx > 0 ? MENU_ITEMS[idx - 1].page : null
    }
  }
}
