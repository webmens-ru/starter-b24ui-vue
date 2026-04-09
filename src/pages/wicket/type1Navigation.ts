/** Логика навигации по шагам формы Type1. Вынесена для тестирования. */

import { WICKET_MENU_ITEMS } from './wicketMenuConfig'
import type { WicketSharedNavState } from './wicketNavTypes'

/** Состояние навигации типа 1 (совпадает с общим контрактом; см. `facadeMaterialDetailPage`). */
export type Type1NavState = WicketSharedNavState

/** Страница выбора позиции фасада: у типа 1 всегда сайдинг. */
function facadeMaterialDetailPage(state: Type1NavState): 'page2_facade_siding' | 'page2_facade_profnastil' {
  if (state.modelId === '1') {
    return 'page2_facade_siding'
  }
  return state.materialFacadeGlob === 'Профлист' ? 'page2_facade_profnastil' : 'page2_facade_siding'
}

const MENU_ITEMS = WICKET_MENU_ITEMS

export function getNextPage(from: string, state: Type1NavState): string | null {
  switch (from) {
    case 'page2':
      return facadeMaterialDetailPage(state)
    case 'page2_facade_siding':
    case 'page2_facade_profnastil':
      if (state.fill_side === 'Одна сторона') return 'page5'
      return state.materialYardGlob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page2_yard_siding':
    case 'page2_yard_profnastil':
      return 'page5'
    case 'page9':
      // Замок есть + предоставляет изготовитель → выбор комплекта; иначе → ручка (пропуск)
      if (state.is_there_lock_id === 1 && state.providesLock !== 'Предоставляет заказчик') {
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
      return facadeMaterialDetailPage(state)
    case 'page5':
      if (state.fill_side === 'Одна сторона') {
        return facadeMaterialDetailPage(state)
      }
      return state.materialYardGlob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page_lock_type':
      return 'page9'
    case 'page10':
      if (state.is_there_lock_id === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page9'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx > 0 ? MENU_ITEMS[idx - 1].page : null
    }
  }
}
