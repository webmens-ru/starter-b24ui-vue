import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type8Route = defineWicketRoute([
  openingSection(),
  fixedFillingSection('page2_facade_sheet'),
  ...standardTailSections(),
])
export type Type8NavState = WicketSharedNavState
export const getNextPage = type8Route.next
export const getPrevPage = type8Route.prev
