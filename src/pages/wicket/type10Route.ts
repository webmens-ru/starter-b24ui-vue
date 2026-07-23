import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { fixedFillingSection, manufacturingSection, openingSection, standardTailSections } from './wicketRouteSections'

export const type10Route = defineWicketRoute([
  manufacturingSection(),
  openingSection(),
  fixedFillingSection('page2_facade_profnastil'),
  ...standardTailSections(),
])
export type Type10NavState = WicketSharedNavState
export type type10NavState = WicketSharedNavState
export const getNextPage = type10Route.next
export const getPrevPage = type10Route.prev
