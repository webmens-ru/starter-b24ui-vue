import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type3NavState } from './type3Navigation'

function state(overrides: Partial<Type3NavState> = {}): Type3NavState {
  return {
    modelId: '3',
    materialFacadeGlob: 'Штакетник',
    fillSide: 'Одна сторона',
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    ...overrides,
  }
}

describe('type3Navigation', () => {
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (всегда штакетник)', () => {
      it('page2 → page2_facade_fence', () => {
        expect(getNextPage('page2', state())).toBe('page2_facade_fence')
      })
    })

    describe('page2_facade_fence → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_fence', state({ fillSide: 'Одна сторона' }))).toBe('page5')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getNextPage('page2_facade_fence', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Штакетник',
        }))).toBe('page2_yard_fence')
      })
    })

    describe('page2_yard_fence → page5', () => {
      it('yard_fence → page5', () => {
        expect(getNextPage('page2_yard_fence', state())).toBe('page5')
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
      it('page2_facade_fence → page2', () => {
        expect(getPrevPage('page2_facade_fence', state())).toBe('page2')
      })
    })

    describe('yard → facade', () => {
      it('page2_yard_fence → page2_facade_fence', () => {
        expect(getPrevPage('page2_yard_fence', state())).toBe('page2_facade_fence')
      })
    })

    describe('page5 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_fence', () => {
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона' }))).toBe('page2_facade_fence')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Штакетник',
        }))).toBe('page2_yard_fence')
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
