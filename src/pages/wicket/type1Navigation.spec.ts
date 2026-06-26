import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type1NavState } from './type1Navigation'

function state(overrides: Partial<Type1NavState> = {}): Type1NavState {
  return {
    modelId: '2',
    materialFacadeGlob: 'Сайдинг',
    fillSide: 'Одна сторона',
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type1Navigation', () => {
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (материал фасада)', () => {
      it('Сайдинг → page2_facade_siding', () => {
        expect(getNextPage('page2', state({ materialFacadeGlob: 'Сайдинг' }))).toBe('page2_facade_siding')
      })
      it('Профлист → page2_facade_profnastil', () => {
        expect(getNextPage('page2', state({ materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: даже при Профлист в данных — только page2_facade_siding (фасад только сайдинг)', () => {
        expect(getNextPage('page2', state({ modelId: '1', materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_siding')
      })
    })

    describe('page2_facade_* → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_siding', state({ fillSide: 'Одна сторона' }))).toBe('page5')
        expect(getNextPage('page2_facade_profnastil', state({ fillSide: 'Одна сторона' }))).toBe('page5')
      })
      it('Две стороны + Сайдинг двор → page2_yard_siding', () => {
        expect(getNextPage('page2_facade_siding', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
      })
      it('Две стороны + Профлист двор → page2_yard_profnastil', () => {
        expect(getNextPage('page2_facade_siding', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
        expect(getNextPage('page2_facade_profnastil', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page2_yard_* → page5', () => {
      it('yard_siding → page5', () => {
        expect(getNextPage('page2_yard_siding', state())).toBe('page5')
      })
      it('yard_profnastil → page5', () => {
        expect(getNextPage('page2_yard_profnastil', state())).toBe('page5')
      })
    })

    describe('page9 → lock или page10 (замок)', () => {
      it('Замок есть (id=1) + изготовитель → page_lock_type', () => {
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
      it('page_lock_type → page_lock_components', () => {
        expect(getNextPage('page_lock_type', state())).toBe('page_lock_components')
      })
      it('page_lock_components → page10', () => {
        expect(getNextPage('page_lock_components', state())).toBe('page10')
      })
      it('page12 → null', () => {
        expect(getNextPage('page12', state())).toBeNull()
      })
    })
  })

  describe('getPrevPage — обратная навигация', () => {
    describe('facade → page2', () => {
      it('page2_facade_siding → page2', () => {
        expect(getPrevPage('page2_facade_siding', state())).toBe('page2')
      })
      it('page2_facade_profnastil → page2', () => {
        expect(getPrevPage('page2_facade_profnastil', state())).toBe('page2')
      })
    })

    describe('yard → facade (по материалу)', () => {
      it('page2_yard_siding, facade=Сайдинг → page2_facade_siding', () => {
        expect(getPrevPage('page2_yard_siding', state({ materialFacadeGlob: 'Сайдинг' }))).toBe('page2_facade_siding')
      })
      it('page2_yard_profnastil, facade=Профлист → page2_facade_profnastil', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: с yard → всегда page2_facade_siding', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ modelId: '1', materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_siding')
      })
    })

    describe('page5 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_*', () => {
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона', materialFacadeGlob: 'Сайдинг' }))).toBe('page2_facade_siding')
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона', materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: одна сторона → всегда page2_facade_siding', () => {
        expect(getPrevPage('page5', state({ modelId: '1', fillSide: 'Одна сторона', materialFacadeGlob: 'Профлист' }))).toBe('page2_facade_siding')
      })
      it('Две стороны → page2_yard_*', () => {
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page10 / page_lock_components → page_lock_type / page9', () => {
      it('page_lock_components → page_lock_type', () => {
        expect(getPrevPage('page_lock_components', state())).toBe('page_lock_type')
      })
      it('page_lock_type → page9', () => {
        expect(getPrevPage('page_lock_type', state())).toBe('page9')
      })
      it('page10, замок есть + изготовитель → page_lock_components', () => {
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

  describe('furniture-разделы (динамическая видимость)', () => {
    it('page10 → первый доступный addon (все доступны)', () => {
      expect(getNextPage('page10', state())).toBe('page_door_closer')
    })
    it('page10 → page11 (client), когда addon-разделов нет', () => {
      expect(getNextPage('page10', state({ availableSections: [] }))).toBe('page11')
    })
    it('page10 → page_bumper, когда доступен только bumper', () => {
      expect(getNextPage('page10', state({ availableSections: ['page_bumper'] }))).toBe('page_bumper')
    })
    it('page11 (client).prev → последний доступный addon', () => {
      expect(getPrevPage('page11', state({ availableSections: ['page_skud'] }))).toBe('page_skud')
    })
  })
})
