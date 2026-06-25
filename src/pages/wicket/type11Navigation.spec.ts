import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type type11NavState } from './type11Navigation'

function state(overrides: Partial<type11NavState> = {}): type11NavState {
  return {
    modelId: '11',
    materialFacadeGlob: 'Профлист',
    fillSide: 'Одна сторона',
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
    it('page2_facade_profnastil → page5 (всегда одна сторона)', () => {
      expect(getNextPage('page2_facade_profnastil', state())).toBe('page5')
    })
    it('Замок есть + изготовитель → page_lock_type', () => {
      expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
    })
    it('Замок есть + заказчик → page10', () => {
      expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page10')
    })
    it('Замок нет → page10', () => {
      expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
    })
    it('page1 → page2', () => {
      expect(getNextPage('page1', state())).toBe('page2')
    })
    it('page5 → page3', () => {
      expect(getNextPage('page5', state())).toBe('page3')
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
    it('page5 → page2_facade_profnastil', () => {
      expect(getPrevPage('page5', state())).toBe('page2_facade_profnastil')
    })
    it('page_lock_type → page9', () => {
      expect(getPrevPage('page_lock_type', state())).toBe('page9')
    })
    it('page10, замок есть + изготовитель → page_lock_type', () => {
      expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
    })
    it('page10, замок есть + заказчик → page9', () => {
      expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page9')
    })
    it('page10, замок нет → page9', () => {
      expect(getPrevPage('page10', state({ isThereLock: 0 }))).toBe('page9')
    })
    it('page2 → page1', () => {
      expect(getPrevPage('page2', state())).toBe('page1')
    })
    it('page1 → null', () => {
      expect(getPrevPage('page1', state())).toBeNull()
    })
  })
})
