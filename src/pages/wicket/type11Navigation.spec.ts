import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type type11NavState, type11Route } from './type11Route'

function state(overrides: Partial<type11NavState> = {}): type11NavState {
  return {
    modelId: '11',
    materialFacadeGlob: 'profnastil',
    fillSide: 1,
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type11Navigation', () => {
  describe('getNextPage', () => {
    it('page2 → page2_facade_profnastil', () => {
      expect(getNextPage('page2', state())).toBe('page2_facade_profnastil')
    })
    it('page2_facade_profnastil → page6 (всегда одна сторона)', () => {
      expect(getNextPage('page2_facade_profnastil', state())).toBe('page6')
    })
    it('Замок есть + изготовитель → page_lock_type', () => {
      expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'manufacturer' }))).toBe('page_lock_type')
    })
    it('Замок есть + заказчик → page10', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'customer' }))).toBe('page10')
    })
    it('Замок нет → page10', () => {
      expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
    })
    it('удалённый page1 отсутствует в маршруте', () => {
      expect(getNextPage('page1', state())).toBeNull()
    })
    it('page5 → page2', () => {
      expect(getNextPage('page5', state())).toBe('page2')
    })
    it('page_lock_type → page10', () => {
      expect(getNextPage('page_lock_type', state())).toBe('page10')
    })
    it('page12 → null', () => {
      expect(getNextPage('page12', state())).toBeNull()
    })
  })

  describe('getPrevPage', () => {
    it('page2_facade_profnastil → page2', () => {
      expect(getPrevPage('page2_facade_profnastil', state())).toBe('page2')
    })
    it('page6 → page2_facade_profnastil', () => {
      expect(getPrevPage('page6', state())).toBe('page2_facade_profnastil')
    })
    it('page_lock_type → page9', () => {
      expect(getPrevPage('page_lock_type', state())).toBe('page9')
    })
    it('page10, замок есть + изготовитель → page_lock_type', () => {
      expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'manufacturer' }))).toBe('page_lock_type')
    })
    it('page10, замок есть + заказчик → page9', () => {
        expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'customer' }))).toBe('page9')
    })
    it('page10, замок нет → page9', () => {
      expect(getPrevPage('page10', state({ isThereLock: 0 }))).toBe('page9')
    })
    it('page2 → page5', () => {
      expect(getPrevPage('page2', state())).toBe('page5')
    })
    it('первый шаг page7 → null', () => {
      expect(getPrevPage('page7', state())).toBeNull()
    })
  })

  it('исключает самостоятельные аксессуары из меню и переходов', () => {
    const menuPages = type11Route.menu(state()).map(item => item.page)

    expect(menuPages).not.toEqual(expect.arrayContaining([
      'page_lock_components', 'page_door_closer', 'page_bumper', 'page_skud',
    ]))
    expect(menuPages).toEqual(expect.arrayContaining(['page9', 'page10']))
    expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
    expect(getNextPage('page_lock_type', state())).toBe('page10')
    expect(getPrevPage('page10', state())).toBe('page_lock_type')
    expect(getNextPage('page10', state())).toBe('page_cover_strip')
    expect(getPrevPage('page12', state())).toBe('page_cover_strip')
    expect(menuPages).not.toContain('page11')
  })
})
