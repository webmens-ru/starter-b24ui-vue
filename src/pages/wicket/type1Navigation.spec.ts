import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type1NavState } from './type1Navigation'

function state(overrides: Partial<Type1NavState> = {}): Type1NavState {
  return {
    modelId: '2',
    material_facade_glob: 'Сайдинг',
    fill_side: 'Одна сторона',
    material_yard_glob: null,
    is_there_lock_id: 1,
    provides_lock: 'Предоставляет изготовитель',
    ...overrides,
  }
}

describe('type1Navigation', () => {
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (материал фасада)', () => {
      it('Сайдинг → page2_facade_siding', () => {
        expect(getNextPage('page2', state({ material_facade_glob: 'Сайдинг' }))).toBe('page2_facade_siding')
      })
      it('Профлист → page2_facade_profnastil', () => {
        expect(getNextPage('page2', state({ material_facade_glob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: даже при Профлист в данных — только page2_facade_siding (фасад только сайдинг)', () => {
        expect(getNextPage('page2', state({ modelId: '1', material_facade_glob: 'Профлист' }))).toBe('page2_facade_siding')
      })
    })

    describe('page2_facade_* → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_siding', state({ fill_side: 'Одна сторона' }))).toBe('page5')
        expect(getNextPage('page2_facade_profnastil', state({ fill_side: 'Одна сторона' }))).toBe('page5')
      })
      it('Две стороны + Сайдинг двор → page2_yard_siding', () => {
        expect(getNextPage('page2_facade_siding', state({
          fill_side: 'Две стороны',
          material_yard_glob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
      })
      it('Две стороны + Профлист двор → page2_yard_profnastil', () => {
        expect(getNextPage('page2_facade_siding', state({
          fill_side: 'Две стороны',
          material_yard_glob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
        expect(getNextPage('page2_facade_profnastil', state({
          fill_side: 'Две стороны',
          material_yard_glob: 'Профлист',
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
        expect(getNextPage('page9', state({ is_there_lock_id: 1, provides_lock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
      })
      it('Замок есть + заказчик → page10 (пропуск выбора комплекта)', () => {
        expect(getNextPage('page9', state({ is_there_lock_id: 1, provides_lock: 'Предоставляет заказчик' }))).toBe('page10')
      })
      it('Замок нет (id=0) → page10 напрямую', () => {
        expect(getNextPage('page9', state({ is_there_lock_id: 0 }))).toBe('page10')
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
      it('page2_facade_siding → page2', () => {
        expect(getPrevPage('page2_facade_siding', state())).toBe('page2')
      })
      it('page2_facade_profnastil → page2', () => {
        expect(getPrevPage('page2_facade_profnastil', state())).toBe('page2')
      })
    })

    describe('yard → facade (по материалу)', () => {
      it('page2_yard_siding, facade=Сайдинг → page2_facade_siding', () => {
        expect(getPrevPage('page2_yard_siding', state({ material_facade_glob: 'Сайдинг' }))).toBe('page2_facade_siding')
      })
      it('page2_yard_profnastil, facade=Профлист → page2_facade_profnastil', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ material_facade_glob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: с yard → всегда page2_facade_siding', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ modelId: '1', material_facade_glob: 'Профлист' }))).toBe('page2_facade_siding')
      })
    })

    describe('page5 → facade или yard (по fill_side)', () => {
      it('Одна сторона → page2_facade_*', () => {
        expect(getPrevPage('page5', state({ fill_side: 'Одна сторона', material_facade_glob: 'Сайдинг' }))).toBe('page2_facade_siding')
        expect(getPrevPage('page5', state({ fill_side: 'Одна сторона', material_facade_glob: 'Профлист' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: одна сторона → всегда page2_facade_siding', () => {
        expect(getPrevPage('page5', state({ modelId: '1', fill_side: 'Одна сторона', material_facade_glob: 'Профлист' }))).toBe('page2_facade_siding')
      })
      it('Две стороны → page2_yard_*', () => {
        expect(getPrevPage('page5', state({
          fill_side: 'Две стороны',
          material_yard_glob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
        expect(getPrevPage('page5', state({
          fill_side: 'Две стороны',
          material_yard_glob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page10 / page_lock_type → page9', () => {
      it('page_lock_type → page9', () => {
        expect(getPrevPage('page_lock_type', state())).toBe('page9')
      })
      it('page10, замок есть + изготовитель → page_lock_type', () => {
        expect(getPrevPage('page10', state({ is_there_lock_id: 1, provides_lock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
      })
      it('page10, замок есть + заказчик → page9 (пропуск page_lock_type)', () => {
        expect(getPrevPage('page10', state({ is_there_lock_id: 1, provides_lock: 'Предоставляет заказчик' }))).toBe('page9')
      })
      it('page10, замок нет → page9', () => {
        expect(getPrevPage('page10', state({ is_there_lock_id: 0 }))).toBe('page9')
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
