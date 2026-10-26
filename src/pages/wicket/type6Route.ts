import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, openingSection, postsSection, standardTailSections } from './wicketRouteSections'

export const type6Route = defineWicketRoute([
  openingSection(),
  postsSection(),
  fixedFillingSection('page2_facade_zhalyuzi'),
  ...standardTailSections(),
])
export type Type6NavState = WicketSharedNavState
export const getNextPage = type6Route.next
export const getPrevPage = type6Route.prev
