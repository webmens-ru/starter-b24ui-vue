import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type1NavState, type1Route } from './type1Route'

function state(overrides: Partial<Type1NavState> = {}): Type1NavState {
  return {
    modelId: '2',
    materialFacadeGlob: 'siding',
    fillSide: 1,
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
    ...overrides,
  }
}

describe('type1Navigation', () => {
  it.each([null, '', 'unknown', 'sheet'])('does not choose a material family for unresolved group %s', materialFacadeGlob => {
    expect(getNextPage('page2', state({ materialFacadeGlob }))).toBe('page2')
    expect(getNextPage('page2_facade_siding', state({ fillSide: 2, materialYardGlob: materialFacadeGlob }))).toBe('page2')
  })
  describe('getNextPage — все ветки переключений', () => {
    describe('page2 → facade (материал фасада)', () => {
      it('Сайдинг → page2_facade_siding', () => {
        expect(getNextPage('page2', state({ materialFacadeGlob: 'siding' }))).toBe('page2_facade_siding')
      })
      it('Профлист → page2_facade_profnastil', () => {
        expect(getNextPage('page2', state({ materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: даже при Профлист в данных — только page2_facade_siding (фасад только сайдинг)', () => {
        expect(getNextPage('page2', state({ modelId: '1', materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_siding')
      })
    })

    describe('page2_facade_* → yard или page6 (сторона заполнения)', () => {
      it('Одна сторона → page6 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_siding', state({ fillSide: 1 }))).toBe('page6')
        expect(getNextPage('page2_facade_profnastil', state({ fillSide: 1 }))).toBe('page6')
      })
      it('Две стороны + Сайдинг двор → page2_yard_siding', () => {
        expect(getNextPage('page2_facade_siding', state({
          fillSide: 2,
          materialYardGlob: 'siding',
        }))).toBe('page2_yard_siding')
      })
      it('Две стороны + Профлист двор → page2_yard_profnastil', () => {
        expect(getNextPage('page2_facade_siding', state({
          fillSide: 2,
          materialYardGlob: 'profnastil',
        }))).toBe('page2_yard_profnastil')
        expect(getNextPage('page2_facade_profnastil', state({
          fillSide: 2,
          materialYardGlob: 'profnastil',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page2_yard_* → page6', () => {
      it('yard_siding → page6', () => {
        expect(getNextPage('page2_yard_siding', state())).toBe('page6')
      })
      it('yard_profnastil → page6', () => {
        expect(getNextPage('page2_yard_profnastil', state())).toBe('page6')
      })
    })

    describe('page9 → lock или page10 (замок)', () => {
      it('Замок есть (id=1) + изготовитель → page_lock_type', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'manufacturer' }))).toBe('page_lock_type')
      })
      it('Замок есть + заказчик → page10 (пропуск выбора комплекта)', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'customer' }))).toBe('page10')
      })
      it('Замок нет (id=0) → page10 напрямую', () => {
        expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
      })
    })

    describe('линейная последовательность', () => {
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
        expect(getPrevPage('page2_yard_siding', state({ materialFacadeGlob: 'siding' }))).toBe('page2_facade_siding')
      })
      it('page2_yard_profnastil, facade=Профлист → page2_facade_profnastil', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: с yard → всегда page2_facade_siding', () => {
        expect(getPrevPage('page2_yard_profnastil', state({ modelId: '1', materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_siding')
      })
    })

    describe('page6 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_*', () => {
        expect(getPrevPage('page6', state({ fillSide: 1, materialFacadeGlob: 'siding' }))).toBe('page2_facade_siding')
        expect(getPrevPage('page6', state({ fillSide: 1, materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_profnastil')
      })
      it('тип 1: одна сторона → всегда page2_facade_siding', () => {
        expect(getPrevPage('page6', state({ modelId: '1', fillSide: 1, materialFacadeGlob: 'profnastil' }))).toBe('page2_facade_siding')
      })
      it('Две стороны → page2_yard_*', () => {
        expect(getPrevPage('page6', state({
          fillSide: 2,
          materialYardGlob: 'siding',
        }))).toBe('page2_yard_siding')
        expect(getPrevPage('page6', state({
          fillSide: 2,
          materialYardGlob: 'profnastil',
        }))).toBe('page2_yard_profnastil')
      })
    })

    describe('page10 → page_lock_type / page9', () => {
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
    })

    describe('линейная последовательность', () => {
      it('page2 → page5', () => {
        expect(getPrevPage('page2', state())).toBe('page5')
      })
      it('первый шаг page7 → null', () => {
        expect(getPrevPage('page7', state())).toBeNull()
      })
    })
  })

  describe('хвост мастера без самостоятельных аксессуаров', () => {
    it('оставляет замок и ручку, но исключает самостоятельные аксессуары', () => {
      const menuPages = type1Route.menu(state()).map(item => item.page)

      expect(menuPages).not.toEqual(expect.arrayContaining([
        'page_lock_components',
        'page_door_closer',
        'page_bumper',
        'page_skud',
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
})
