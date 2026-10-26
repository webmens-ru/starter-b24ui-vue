import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import {
  fixedFillingSection,
  openingSection, postsSection,
  standardTailSections,
} from './wicketRouteSections'

export const type3Route = defineWicketRoute([
  openingSection(),
  postsSection(),
  fixedFillingSection('page2_facade_fence', 'page2_yard_fence'),
  ...standardTailSections(),
])

export type Type3NavState = WicketSharedNavState
export const getNextPage = type3Route.next
export const getPrevPage = type3Route.prev
