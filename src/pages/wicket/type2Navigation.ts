/** Логика навигации по шагам формы калитки типа 2. Автономна от type1Navigation.
 *  Type2 поддерживает только профнастил (сайдинг отсутствует).
 */

import { linearNext, linearPrev } from './wicketAddonNav'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type2NavState = WicketSharedNavState

export function getNextPage(from: string, state: Type2NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_profnastil'
    case 'page2_facade_profnastil':
      if (state.fillSide === 'Одна сторона') return 'page5'
      return 'page2_yard_profnastil'
    case 'page2_yard_profnastil':
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

export function getPrevPage(from: string, state: Type2NavState): string | null {
  switch (from) {
    case 'page2_facade_profnastil':
      return 'page2'
    case 'page2_yard_profnastil':
      return 'page2_facade_profnastil'
    case 'page5':
      if (state.fillSide === 'Одна сторона') {
        return 'page2_facade_profnastil'
      }
      return 'page2_yard_profnastil'
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
