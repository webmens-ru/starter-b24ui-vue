/** Логика навигации по шагам формы калитки типа 5 (SP сайдинг, 2-сторонний).
 *  Материал заполнения всегда «SP сайдинг» — единственный вариант, поэтому
 *  page2 безусловно ведёт на page2_facade_sp.
 */

import { WICKET_MENU_ITEMS } from './wicketMenuConfig'
import type { WicketSharedNavState } from './wicketNavTypes'

export type Type5NavState = WicketSharedNavState

const MENU_ITEMS = WICKET_MENU_ITEMS

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
      return 'page10'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx !== -1 && idx < MENU_ITEMS.length - 1 ? MENU_ITEMS[idx + 1].page : null
    }
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
        return 'page_lock_type'
      }
      return 'page9'
    default: {
      const idx = MENU_ITEMS.findIndex(m => m.page === from)
      return idx > 0 ? MENU_ITEMS[idx - 1].page : null
    }
  }
}
