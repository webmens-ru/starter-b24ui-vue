/** Логика навигации по шагам формы калитки типа 3 (штакетник, 2-сторонний).
 *  Материал заполнения всегда «Штакетник» — единственный вариант, поэтому
 *  page2 безусловно ведёт на page2_facade_fence.
 */

import { linearNext, linearPrev } from './wicketAddonNav'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type3NavState = WicketSharedNavState

export function getNextPage(from: string, state: Type3NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_fence'
    case 'page2_facade_fence':
      if (state.fillSide === 'Одна сторона') return 'page5'
      return 'page2_yard_fence'
    case 'page2_yard_fence':
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

export function getPrevPage(from: string, state: Type3NavState): string | null {
  switch (from) {
    case 'page2_facade_fence':
      return 'page2'
    case 'page2_yard_fence':
      return 'page2_facade_fence'
    case 'page5':
      if (state.fillSide === 'Одна сторона') {
        return 'page2_facade_fence'
      }
      return 'page2_yard_fence'
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
