import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, manufacturingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type4Route = defineWicketRoute([
  manufacturingSection(),
  openingSection(),
  fixedFillingSection('page2_facade_lamel', 'page2_yard_lamel'),
  ...standardTailSections(),
])
export type Type4NavState = WicketSharedNavState
export const getNextPage = type4Route.next
export const getPrevPage = type4Route.prev
