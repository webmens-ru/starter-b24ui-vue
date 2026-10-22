import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type4Route = defineWicketRoute([
  openingSection(),
  fixedFillingSection('page2_facade_lamel', 'page2_yard_lamel'),
  ...standardTailSections(),
])
export type Type4NavState = WicketSharedNavState
export const getNextPage = type4Route.next
export const getPrevPage = type4Route.prev
