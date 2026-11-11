import type { WicketSharedNavState } from './wicketNavTypes'
import { defineWicketRoute, type WicketRouteDefinition } from './wicketRoute'
import {
  canvasSection,
  fillingSection,
  openingSection, postsSection,
  standardTailSections,
} from './wicketRouteSections'

const needsTrim = (state: WicketSharedNavState): boolean => state.fillSide === 2 && Number(state.gapName) > 0

const baseRoute = defineWicketRoute([
  openingSection(),
  postsSection(),
  canvasSection(),
  fillingSection(
    ['page2', 'page2_facade_fence', 'page2_facade_fence_laying', 'page2_yard_fence', 'page2_yard_fence_trim'],
    (from, state) => {
      if (from === 'page2') return 'page2_facade_fence'
      if (from === 'page2_facade_fence') return 'page2_facade_fence_laying'
      if (from === 'page2_facade_fence_laying' && state.fillSide === 2) return 'page2_yard_fence'
      if (from === 'page2_yard_fence' && needsTrim(state)) return 'page2_yard_fence_trim'
      return undefined
    },
    from => {
      if (from === 'page2_facade_fence') return 'page2'
      if (from === 'page2_facade_fence_laying') return 'page2_facade_fence'
      if (from === 'page2_yard_fence_trim') return 'page2_yard_fence'
      if (from === 'page2_yard_fence') return 'page2_facade_fence_laying'
      return undefined
    },
    state => needsTrim(state) ? 'page2_yard_fence_trim' : state.fillSide === 2 ? 'page2_yard_fence' : 'page2_facade_fence_laying',
  ),
  ...standardTailSections(),
])

const filling = baseRoute.sections.find(section => section.menu.page === 'page2')!
const validateMaterials = filling.validate
filling.validate = state => {
  const materials = validateMaterials(state)
  if (!materials.valid || state.fillSide === 0) return materials
  const validGap = (mode: unknown, gap: number | null | undefined) =>
    gap != null && Number.isInteger(gap) && (mode === 'butt' ? gap === 0 : (mode === 'gap' || mode == null) && gap >= 10 && gap <= 99)
  if (!validGap(state.layingFacadeCode, state.gapName)) return { valid: false, errors: ['Не выбран способ укладки фасада и зазор'] }
  const yardGap = state.layingYardCode == null ? state.gapName : state.gapYardMm
  if (state.fillSide === 2 && (!validGap(state.layingYardCode, yardGap) || yardGap !== state.gapName
    || (state.layingYardCode != null && state.layingFacadeCode != null && state.layingYardCode !== state.layingFacadeCode)
    || (state.gapName! > 0 && Number(state.thicknessFacade) !== Number(state.thicknessYard)))) return { valid: false, errors: ['Материал и укладка двора должны соответствовать фасаду'] }
  if (needsTrim(state) && state.yardTrimCode !== 'none' && state.yardTrimCode !== 'edge') return { valid: false, errors: ['Не выбрана подрезка планок двора'] }
  return materials
}
export const type3Route: WicketRouteDefinition = {
  ...baseRoute,
  canNavigate: (_from, to, state) => {
    const targetIndex = baseRoute.sections.findIndex(section => section.pages.includes(to))
    return targetIndex <= baseRoute.sections.indexOf(filling) || filling.validate(state).valid
  },
}

export type Type3NavState = WicketSharedNavState
export const getNextPage = type3Route.next
export const getPrevPage = type3Route.prev
