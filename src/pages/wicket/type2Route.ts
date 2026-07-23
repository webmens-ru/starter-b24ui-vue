import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import {
  fixedFillingSection,
  manufacturingSection,
  openingSection,
  standardTailSections,
} from './wicketRouteSections'

export const type2Route = defineWicketRoute([
  manufacturingSection(),
  openingSection(),
  fixedFillingSection('page2_facade_profnastil', 'page2_yard_profnastil'),
  ...standardTailSections(),
])

export type Type2NavState = WicketSharedNavState
export const getNextPage = type2Route.next
export const getPrevPage = type2Route.prev
