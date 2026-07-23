import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, manufacturingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type7Route = defineWicketRoute([
  manufacturingSection(),
  openingSection(),
  fixedFillingSection('page2_facade_sp'),
  ...standardTailSections(),
])
export type Type7NavState = WicketSharedNavState
export const getNextPage = type7Route.next
export const getPrevPage = type7Route.prev
