import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { shieldSection, canvasSection, fixedFillingSection, openingSection, postsSection, standardTailSections } from './wicketRouteSections'

export const type4Route = defineWicketRoute([
  openingSection(),
  postsSection(),
  shieldSection(),
  canvasSection(),
  fixedFillingSection('page2_facade_lamel'),
  ...standardTailSections(),
])
export type Type4NavState = WicketSharedNavState
export const getNextPage = type4Route.next
export const getPrevPage = type4Route.prev
