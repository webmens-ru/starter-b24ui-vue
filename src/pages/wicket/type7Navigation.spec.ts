import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type7NavState, type7Route } from './type7Route'

function state(overrides: Partial<Type7NavState> = {}): Type7NavState {
  return {
    modelId: '7',
    materialFacadeGlob: 'Сайдинг',
    fillSide: 'Одна сторона',
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type7Navigation', () => {
  describe('getNextPage', () => {
    it('page2 → page2_facade_sp', () => {
      expect(getNextPage('page2', state())).toBe('page2_facade_sp')
    })
    it('page2_facade_sp → page5 (всегда одна сторона)', () => {
      expect(getNextPage('page2_facade_sp', state())).toBe('page5')
    })
    it('Замок есть + изготовитель → page_lock_type', () => {
      expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
    })
    it('Замок есть + заказчик → page10', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page_lock_type')
    })
    it('Замок нет → page10', () => {
      expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
    })
    it('page1 → page7', () => {
      expect(getNextPage('page1', state())).toBe('page7')
    })
    it('page5 → page6', () => {
      expect(getNextPage('page5', state())).toBe('page6')
    })
    it('page_lock_type → page10', () => {
      expect(getNextPage('page_lock_type', state())).toBe('page10')
    })
    it('page12 → null', () => {
      expect(getNextPage('page12', state())).toBeNull()
    })
  })

  describe('getPrevPage', () => {
    it('page2_facade_sp → page2', () => {
      expect(getPrevPage('page2_facade_sp', state())).toBe('page2')
    })
    it('page5 → page2_facade_sp', () => {
      expect(getPrevPage('page5', state())).toBe('page2_facade_sp')
    })
    it('page_lock_type → page9', () => {
      expect(getPrevPage('page_lock_type', state())).toBe('page9')
    })
    it('page10, замок есть + изготовитель → page_lock_type', () => {
      expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
    })
    it('page10, замок есть + заказчик → page_lock_type', () => {
        expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page_lock_type')
    })
    it('page10, замок нет → page9', () => {
      expect(getPrevPage('page10', state({ isThereLock: 0 }))).toBe('page9')
    })
    it('page2 → page7', () => {
      expect(getPrevPage('page2', state())).toBe('page7')
    })
    it('page1 → null', () => {
      expect(getPrevPage('page1', state())).toBeNull()
    })
  })

  it('исключает самостоятельные аксессуары из меню и переходов', () => {
    const menuPages = type7Route.menu(state()).map(item => item.page)

    expect(menuPages).not.toEqual(expect.arrayContaining([
      'page_lock_components', 'page_door_closer', 'page_bumper', 'page_skud',
    ]))
    expect(menuPages).toEqual(expect.arrayContaining(['page9', 'page10']))
    expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
    expect(getNextPage('page_lock_type', state())).toBe('page10')
    expect(getPrevPage('page10', state())).toBe('page_lock_type')
    expect(getNextPage('page10', state())).toBe('page12')
    expect(getPrevPage('page12', state())).toBe('page10')
    expect(menuPages).not.toContain('page11')
  })
})
