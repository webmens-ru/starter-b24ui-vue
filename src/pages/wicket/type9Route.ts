import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import { canvasSection, fixedFillingSection, openingSection, postsSection, standardTailSections } from './wicketRouteSections'

export const type9Route = defineWicketRoute([
  openingSection(),
  postsSection(),
  canvasSection(),
  fixedFillingSection('page2_facade_profnastil'),
  ...standardTailSections(),
])
export type Type9NavState = WicketSharedNavState
export const getNextPage = type9Route.next
export const getPrevPage = type9Route.prev
