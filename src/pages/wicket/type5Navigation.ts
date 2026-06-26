/** Логика навигации по шагам формы калитки типа 5 (SP сайдинг, 2-сторонний).
 *  Материал заполнения всегда «SP сайдинг» — единственный вариант, поэтому
 *  page2 безусловно ведёт на page2_facade_sp.
 */

import { linearNext, linearPrev } from './wicketAddonNav'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type5NavState = WicketSharedNavState

export function getNextPage(from: string, state: Type5NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_sp'
    case 'page2_facade_sp':
      if (state.fillSide === 'Одна сторона') return 'page5'
      return 'page2_yard_sp'
    case 'page2_yard_sp':
      return 'page5'
    case 'page9':
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page10'
    case 'page_lock_type':
      return 'page_lock_components'
    case 'page_lock_components':
      return 'page10'
    default:
      return linearNext(from, state)
  }
}

export function getPrevPage(from: string, state: Type5NavState): string | null {
  switch (from) {
    case 'page2_facade_sp':
      return 'page2'
    case 'page2_yard_sp':
      return 'page2_facade_sp'
    case 'page5':
      if (state.fillSide === 'Одна сторона') {
        return 'page2_facade_sp'
      }
      return 'page2_yard_sp'
    case 'page_lock_type':
      return 'page9'
    case 'page10':
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_components'
      }
      return 'page9'
    default:
      return linearPrev(from, state)
  }
}
