/** Логика навигации по шагам формы Type1. Вынесена для тестирования. */

import { linearNext, linearPrev } from './wicketAddonNav'
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

export function getNextPage(from: string, state: Type1NavState): string | null {
  switch (from) {
    case 'page2':
      return facadeMaterialDetailPage(state)
    case 'page2_facade_siding':
    case 'page2_facade_profnastil':
      if (state.fillSide === 'Одна сторона') return 'page5'
      return state.materialYardGlob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page2_yard_siding':
    case 'page2_yard_profnastil':
      return 'page5'
    case 'page9':
      // Замок есть + предоставляет изготовитель → выбор комплекта; иначе → ручка (пропуск)
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page10'
    case 'page_lock_type':
      return 'page10'
    default:
      return linearNext(from, state)
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
      if (state.fillSide === 'Одна сторона') {
        return facadeMaterialDetailPage(state)
      }
      return state.materialYardGlob === 'Профлист' ? 'page2_yard_profnastil' : 'page2_yard_siding'
    case 'page_lock_type':
      return 'page9'
    case 'page10':
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page9'
    default:
      return linearPrev(from, state)
  }
}
