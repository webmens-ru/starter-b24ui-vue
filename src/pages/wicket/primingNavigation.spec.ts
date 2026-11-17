import { describe, it, expect } from 'vitest'
import { type1Route } from './type1Route'
import { type2Route } from './type2Route'
import { type3Route } from './type3Route'
import { type4Route } from './type4Route'
import { type5Route } from './type5Route'
import { type6Route } from './type6Route'
import { type7Route } from './type7Route'
import { type8Route } from './type8Route'
import { type9Route } from './type9Route'
import { type10Route } from './type10Route'
import { type11Route } from './type11Route'
import type { WicketSharedNavState } from './wicketNavTypes'

describe('primer internal painting step', () => {
  it.each([type1Route, type2Route, type3Route, type4Route, type5Route, type6Route, type7Route, type8Route, type9Route, type10Route, type11Route])('keeps one painting section and navigates through its primer page', route => {
    const state: WicketSharedNavState = {
      modelId: '1',
      fillSide: 0,
      materialFacadeGlob: null,
      materialYardGlob: null,
      isThereLock: null,
      providesLock: 'manufacturer',
      availableSections: [],
    }
    expect(route.next('page_painting', state)).toBe('page_priming')
    expect(route.next('page_priming', state)).toBe('page9')
    expect(route.prev('page_priming', state)).toBe('page_painting')
    expect(route.prev('page9', state)).toBe('page_priming')
    expect(route.menu(state).filter(item => item.page === 'page_painting')).toHaveLength(1)
    expect(route.menu(state).some(item => item.page === 'page_priming')).toBe(false)
  })
})
