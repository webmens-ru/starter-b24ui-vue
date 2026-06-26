/** Логика навигации по шагам формы калитки типа 6. Автономна от type2Navigation.
 *  Type6 поддерживает только жалюзи и только одну сторону (без двора).
 */

import { linearNext, linearPrev } from './wicketAddonNav'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type6NavState = WicketSharedNavState

export function getNextPage(from: string, state: Type6NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_zhalyuzi'
    case 'page2_facade_zhalyuzi':
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

export function getPrevPage(from: string, state: Type6NavState): string | null {
  switch (from) {
    case 'page2_facade_zhalyuzi':
      return 'page2'
    case 'page5':
      return 'page2_facade_zhalyuzi'
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
