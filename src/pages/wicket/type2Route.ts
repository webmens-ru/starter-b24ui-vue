import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute } from './wicketRoute'
import {
  fillingSection,
  manufacturingSection,
  openingSection,
  standardTailSections,
} from './wicketRouteSections'

function facadePage(state: WicketSharedNavState): string {
  return state.materialFacadeGlob === 'Сайдинг'
    ? 'page2_facade_siding'
    : 'page2_facade_profnastil'
}

function yardPage(state: WicketSharedNavState): string {
  return state.materialYardGlob === 'Сайдинг'
    ? 'page2_yard_siding'
    : 'page2_yard_profnastil'
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

export const type2Route = defineWicketRoute([
  manufacturingSection(),
  openingSection(),
  fill,
  ...standardTailSections(),
])

export type Type2NavState = WicketSharedNavState
export const getNextPage = type2Route.next
export const getPrevPage = type2Route.prev
