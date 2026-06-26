import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type5NavState } from './type5Navigation'

function state(overrides: Partial<Type5NavState> = {}): Type5NavState {
  return {
    modelId: '5',
    materialFacadeGlob: 'SP сайдинг',
    fillSide: 'Одна сторона',
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type5Navigation', () => {
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (всегда SP сайдинг)', () => {
      it('page2 → page2_facade_sp', () => {
        expect(getNextPage('page2', state())).toBe('page2_facade_sp')
      })
    })

    describe('page2_facade_sp → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_sp', state({ fillSide: 'Одна сторона' }))).toBe('page5')
      })
      it('Две стороны → page2_yard_sp', () => {
        expect(getNextPage('page2_facade_sp', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'SP сайдинг',
        }))).toBe('page2_yard_sp')
      })
    })

    describe('page2_yard_sp → page5', () => {
      it('yard_sp → page5', () => {
        expect(getNextPage('page2_yard_sp', state())).toBe('page5')
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
      it('page_lock_type → page_lock_components → page10', () => {
        expect(getNextPage('page_lock_type', state())).toBe('page_lock_components')
      })
      it('page12 → null', () => {
        expect(getNextPage('page12', state())).toBeNull()
      })
    })
  })

  describe('getPrevPage — обратная навигация', () => {
    describe('facade → page2', () => {
      it('page2_facade_sp → page2', () => {
        expect(getPrevPage('page2_facade_sp', state())).toBe('page2')
      })
    })

    describe('yard → facade', () => {
      it('page2_yard_sp → page2_facade_sp', () => {
        expect(getPrevPage('page2_yard_sp', state())).toBe('page2_facade_sp')
      })
    })

    describe('page5 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_sp', () => {
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона' }))).toBe('page2_facade_sp')
      })
      it('Две стороны → page2_yard_sp', () => {
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'SP сайдинг',
        }))).toBe('page2_yard_sp')
      })
    })

    describe('page10 / page_lock_type → page9', () => {
      it('page_lock_type → page9', () => {
        expect(getPrevPage('page_lock_type', state())).toBe('page9')
      })
      it('page10, замок есть + изготовитель → page_lock_type', () => {
        expect(getPrevPage('page10', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_components')
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
