import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type2NavState, type2Route } from './type2Route'

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
    describe('page2 → facade (по материалу фасада)', () => {
      it('Профлист → page2_facade_profnastil', () => {
        expect(getNextPage('page2', state())).toBe('page2_facade_profnastil')
      })

      it('Сайдинг → page2_facade_siding', () => {
        expect(getNextPage('page2', state({ materialFacadeGlob: 'Сайдинг' }))).toBe('page2_facade_siding')
      })
    })

    describe('page2_facade_* → yard или page5 (сторона заполнения)', () => {
      it('Одна сторона → page5 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_profnastil', state({ fillSide: 'Одна сторона' }))).toBe('page5')
        expect(getNextPage('page2_facade_siding', state({
          fillSide: 'Одна сторона',
          materialFacadeGlob: 'Сайдинг',
        }))).toBe('page5')
      })

      it('Две стороны + Профлист двор → page2_yard_profnastil', () => {
        expect(getNextPage('page2_facade_profnastil', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
      })

      it('Две стороны + Сайдинг двор → page2_yard_siding', () => {
        expect(getNextPage('page2_facade_siding', state({
          materialFacadeGlob: 'Сайдинг',
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
      })
    })

    describe('page2_yard_* → page5', () => {
      it('both yard variants continue to page5', () => {
        expect(getNextPage('page2_yard_profnastil', state())).toBe('page5')
        expect(getNextPage('page2_yard_siding', state({
          materialFacadeGlob: 'Сайдинг',
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page5')
      })
    })

    describe('page9 → lock или page10 (замок)', () => {
      it('Замок есть + изготовитель → page_lock_type', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет изготовитель' }))).toBe('page_lock_type')
      })
      it('Замок есть + заказчик → page10 (пропуск выбора комплекта)', () => {
        expect(getNextPage('page9', state({ isThereLock: 1, providesLock: 'Предоставляет заказчик' }))).toBe('page_lock_type')
      })
      it('Замок нет (id=0) → page10 напрямую', () => {
        expect(getNextPage('page9', state({ isThereLock: 0 }))).toBe('page10')
      })
    })

    describe('линейная последовательность', () => {
      it('page1 → page7', () => {
        expect(getNextPage('page1', state())).toBe('page7')
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
      it('both facade variants return to page2', () => {
        expect(getPrevPage('page2_facade_profnastil', state())).toBe('page2')
        expect(getPrevPage('page2_facade_siding', state({ materialFacadeGlob: 'Сайдинг' }))).toBe('page2')
      })
    })

    describe('yard → facade', () => {
      it('returns to the facade variant selected by its material', () => {
        expect(getPrevPage('page2_yard_profnastil', state())).toBe('page2_facade_profnastil')
        expect(getPrevPage('page2_yard_siding', state({
          materialFacadeGlob: 'Сайдинг',
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page2_facade_siding')
      })
    })

    describe('page5 → facade или yard (по fillSide)', () => {
      it('Одна сторона → выбранный facade', () => {
        expect(getPrevPage('page5', state({ fillSide: 'Одна сторона' }))).toBe('page2_facade_profnastil')
        expect(getPrevPage('page5', state({
          fillSide: 'Одна сторона',
          materialFacadeGlob: 'Сайдинг',
        }))).toBe('page2_facade_siding')
      })

      it('Две стороны → выбранный yard', () => {
        expect(getPrevPage('page5', state({
          fillSide: 'Две стороны',
          materialYardGlob: 'Профлист',
        }))).toBe('page2_yard_profnastil')
        expect(getPrevPage('page5', state({
          materialFacadeGlob: 'Сайдинг',
          fillSide: 'Две стороны',
          materialYardGlob: 'Сайдинг',
        }))).toBe('page2_yard_siding')
      })
    })

    describe('page10 / page_lock_type → page9', () => {
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
    })

    describe('линейная последовательность', () => {
      it('page2 → page7', () => {
        expect(getPrevPage('page2', state())).toBe('page7')
      })
      it('page1 → null', () => {
        expect(getPrevPage('page1', state())).toBeNull()
      })
    })
  })

  it('исключает самостоятельные аксессуары из меню и переходов', () => {
    const menuPages = type2Route.menu(state()).map(item => item.page)

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
