/** Логика навигации по шагам формы калитки типа 7. Автономна от type2Navigation.
 *  Type7 поддерживает только SP сайдинг и только одну сторону (без двора).
 */

import { WICKET_MENU_ITEMS } from './wicketMenuConfig'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type7NavState = WicketSharedNavState

const MENU_ITEMS = WICKET_MENU_ITEMS

export function getNextPage(from: string, state: Type7NavState): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade_sp'
    case 'page2_facade_sp':
      return 'page5'
    case 'page9':
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
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

export function getPrevPage(from: string, state: Type7NavState): string | null {
  switch (from) {
    case 'page2_facade_sp':
      return 'page2'
    case 'page5':
      return 'page2_facade_sp'
    case 'page_lock_type':
      return 'page9'
    case 'page10':
      if (state.isThereLock === 1 && state.providesLock !== 'Предоставляет заказчик') {
        return 'page_lock_type'
      }
      return 'page9'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx > 0 ? MENU_ITEMS[idx - 1].page : null
    }
  }
}
