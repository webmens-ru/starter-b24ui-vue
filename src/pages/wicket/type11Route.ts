import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type11Route = defineWicketRoute([
  openingSection(),
  fixedFillingSection('page2_facade_profnastil'),
  ...standardTailSections(),
])
export type Type11NavState = WicketSharedNavState
export type type11NavState = WicketSharedNavState
export const getNextPage = type11Route.next
export const getPrevPage = type11Route.prev
