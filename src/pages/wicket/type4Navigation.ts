/** Логика навигации по шагам формы калитки типа 4 (ламель, 2-сторонний).
 *  Материал заполнения всегда «Ламель» — единственный вариант, поэтому
 *  page2 безусловно ведёт на page2_facade_lamel.
 */

import { linearNext, linearPrev } from './wicketAddonNav'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type4NavState = WicketSharedNavState

export function getNextPage(from: string, state: Type4NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_lamel'
    case 'page2_facade_lamel':
      if (state.fillSide === 'Одна сторона') return 'page5'
      return 'page2_yard_lamel'
    case 'page2_yard_lamel':
      return 'page5'
    case 'page9':
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

export function getPrevPage(from: string, state: Type4NavState): string | null {
  switch (from) {
    case 'page2_facade_lamel':
      return 'page2'
    case 'page2_yard_lamel':
      return 'page2_facade_lamel'
    case 'page5':
      if (state.fillSide === 'Одна сторона') {
        return 'page2_facade_lamel'
      }
      return 'page2_yard_lamel'
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
