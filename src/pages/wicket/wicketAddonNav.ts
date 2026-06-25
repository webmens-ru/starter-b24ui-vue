/** Линейный обход меню с пропуском недоступных furniture-разделов. */
import { WICKET_MENU_ITEMS } from './wicketMenuConfig'
import type { WicketSharedNavState } from './wicketNavTypes'

const ADDON_PAGES = ['page_door_closer', 'page_bumper', 'page_skud']

/** Меню без addon-страниц, недоступных для текущего типа. */
export function effectiveMenu(state: WicketSharedNavState) {
  const avail = state.availableSections ?? []
  return WICKET_MENU_ITEMS.filter(m => !ADDON_PAGES.includes(m.page) || avail.includes(m.page))
}

export function linearNext(from: string, state: WicketSharedNavState): string | null {
  const menu = effectiveMenu(state)
  const i = menu.findIndex(m => m.page === from)
  return i !== -1 && i < menu.length - 1 ? menu[i + 1].page : null
}

export function linearPrev(from: string, state: WicketSharedNavState): string | null {
  const menu = effectiveMenu(state)
  const i = menu.findIndex(m => m.page === from)
  return i > 0 ? menu[i - 1].page : null
}
