import type { InjectionKey } from 'vue'
import type { WicketSharedNavState } from './wicketNavTypes'

export interface WicketMenuItem {
  url: string
  page: string
  label: string
}

export interface SectionValidation {
  valid: boolean
  errors: string[]
}

type InternalTransition = (
  from: string,
  state: WicketSharedNavState,
) => string | null | undefined

export interface WicketRouteSection {
  menu: WicketMenuItem
  pages: string[]
  visible: (state: WicketSharedNavState) => boolean
  validate: (state: WicketSharedNavState) => SectionValidation
  next?: InternalTransition
  prev?: InternalTransition
  last?: (state: WicketSharedNavState) => string
}

export interface WicketRouteDefinition {
  canNavigate?: (from: string, to: string, state: WicketSharedNavState) => boolean
  sections: WicketRouteSection[]
  menu: (state: WicketSharedNavState) => WicketMenuItem[]
  validations: (state: WicketSharedNavState) => Map<string, SectionValidation>
  next: (from: string, state: WicketSharedNavState) => string | null
  prev: (from: string, state: WicketSharedNavState) => string | null
}

export const WICKET_ROUTE_KEY: InjectionKey<WicketRouteDefinition> = Symbol('wicket-route')

export function defineWicketRoute(sections: WicketRouteSection[]): WicketRouteDefinition {
  function visibleSections(state: WicketSharedNavState): WicketRouteSection[] {
    return sections.filter(section => section.visible(state))
  }

  function findSectionIndex(
    visible: WicketRouteSection[],
    page: string,
  ): number {
    return visible.findIndex(section => section.pages.includes(page))
  }

  return {
    sections,
    canNavigate: (_from, to, state) => {
      if (state.modelId !== '3' || !state.fillingNeedsRecalculation) return true
      const filling = sections.findIndex(section => section.pages.includes('page2'))
      const destination = sections.findIndex(section => section.pages.includes(to))
      return destination <= filling
    },
    menu: state => visibleSections(state).map(section => section.menu),
    validations: state => new Map(
      visibleSections(state).map(section => [section.menu.page, section.validate(state)]),
    ),
    next(from, state) {
      const visible = visibleSections(state)
      const index = findSectionIndex(visible, from)
      if (index < 0) return null
      const internal = visible[index]?.next?.(from, state)
      if (internal !== undefined) return internal
      return visible[index + 1]?.menu.page ?? null
    },
    prev(from, state) {
      const visible = visibleSections(state)
      const index = findSectionIndex(visible, from)
      if (index < 0) return null
      const internal = visible[index]?.prev?.(from, state)
      if (internal !== undefined) return internal
      const previous = visible[index - 1]
      return previous ? (previous.last?.(state) ?? previous.menu.page) : null
    },
  }
}
