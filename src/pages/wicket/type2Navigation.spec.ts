import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type2NavState } from './type2Navigation'

function state(overrides: Partial<Type2NavState> = {}): Type2NavState {
  return {
    modelId: '2',
    materialFacadeGlob: 'Профлист',
    fillSide: 'Одна сторона',
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type2Navigation', () => {
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (всегда профнастил)', () => {
      it('page2 → page2_facade_profnastil', () => {
        expect(getNextPage('page2', state())).toBe('page2_facade_profnastil')
      })
    })

    describe('page2_facade_profnastil → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_profnastil', state({ fillSide: 'Одна сторона' }))).toBe('page5')
      })
      it('Две стороны → page2_yard_profnastil', () => {
        expect(getNextPage('page2_facade_profnastil', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page2_yard_profnastil → page5', () => {
      it('yard_profnastil → page5', () => {
        expect(getNextPage('page2_yard_profnastil', state())).toBe('page5')
      })
    })

    describe('page9 → lock или page10 (замок)', () => {
      it('Замок есть + изготовитель → page_lock_type', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
      })
      it('Замок есть + заказчик → page10 (пропуск выбора комплекта)', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page10')
      })
      it('Замок нет (id=0) → page10 напрямую', () => {
        expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
      })
    })

    describe('линейная последовательность', () => {
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
  })

  describe('getPrevPage — обратная навигация', () => {
    describe('facade → page2', () => {
      it('page2_facade_profnastil → page2', () => {
        expect(getPrevPage('page2_facade_profnastil', state())).toBe('page2')
      })
    })

    describe('yard → facade', () => {
      it('page2_yard_profnastil → page2_facade_profnastil', () => {
        expect(getPrevPage('page2_yard_profnastil', state())).toBe('page2_facade_profnastil')
      })
    })

    describe('page5 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_profnastil', () => {
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона' }))).toBe('page2_facade_profnastil')
      })
      it('Две стороны → page2_yard_profnastil', () => {
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page10 / page_lock_type → page9', () => {
      it('page_lock_type → page9', () => {
        expect(getPrevPage('page_lock_type', state())).toBe('page9')
      })
      it('page10, замок есть + изготовитель → page_lock_type', () => {
        expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
      })
      it('page10, замок есть + заказчик → page9 (пропуск page_lock_type)', () => {
        expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page9')
      })
      it('page10, замок нет → page9', () => {
        expect(getPrevPage('page10', state({ isThereLock: 0 }))).toBe('page9')
      })
    })

    describe('линейная последовательность', () => {
      it('page2 → page1', () => {
        expect(getPrevPage('page2', state())).toBe('page1')
      })
      it('page1 → null', () => {
        expect(getPrevPage('page1', state())).toBeNull()
      })
    })
  })
})
