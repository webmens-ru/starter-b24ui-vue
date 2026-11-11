import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { shieldSection, canvasSection, fixedFillingSection, openingSection, postsSection, standardTailSections } from './wicketRouteSections'

export const type5Route = defineWicketRoute([
  openingSection(),
  postsSection(),
  shieldSection(),
  canvasSection(),
  fixedFillingSection('page2_facade_sp', 'page2_yard_sp'),
  ...standardTailSections(),
])
export type Type5NavState = WicketSharedNavState
export const getNextPage = type5Route.next
export const getPrevPage = type5Route.prev
