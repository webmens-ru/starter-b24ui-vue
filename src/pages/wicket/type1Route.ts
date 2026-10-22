import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import {
  fillingSection,
  openingSection,
  standardTailSections,
} from './wicketRouteSections'

function facadePage(state: WicketSharedNavState): string {
  if (state.modelId === '1') return 'page2_facade_siding'
  return state.materialFacadeGlob === 'Профлист'
    ? 'page2_facade_profnastil'
    : 'page2_facade_siding'
}

function yardPage(state: WicketSharedNavState): string {
  return state.materialYardGlob === 'Профлист'
    ? 'page2_yard_profnastil'
    : 'page2_yard_siding'
}

const fill = fillingSection(
  [
    'page2',
    'page2_facade_siding',
    'page2_facade_profnastil',
    'page2_yard_siding',
    'page2_yard_profnastil',
  ],
  (from, state) => {
    if (from === 'page2') return facadePage(state)
    if (from.startsWith('page2_facade_') && state.fillSide === 'Две стороны') {
      return yardPage(state)
    }
    return undefined
  },
  (from, state) => {
    if (from.startsWith('page2_facade_')) return 'page2'
    if (from.startsWith('page2_yard_')) return facadePage(state)
    return undefined
  },
  state => state.fillSide === 'Две стороны' ? yardPage(state) : facadePage(state),
)

export const type1Route = defineWicketRoute([
  openingSection(),
  fill,
  ...standardTailSections(),
])

export type Type1NavState = WicketSharedNavState
export const getNextPage = type1Route.next
export const getPrevPage = type1Route.prev
