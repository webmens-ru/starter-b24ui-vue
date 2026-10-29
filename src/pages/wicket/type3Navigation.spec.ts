import { describe, it, expect } from 'vitest'
import { getNextPage, getPrevPage, type Type3NavState, type3Route } from './type3Route'

function state(overrides: Partial<Type3NavState> = {}): Type3NavState {
  return {
    modelId: '3',
    materialFacadeGlob: 'fence',
    fillSide: 1,
    materialYardGlob: null,
    isThereLock: 1,
    providesLock: 'Предоставляет изготовитель',
    availableSections: ['page_door_closer', 'page_bumper', 'page_skud'],
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

    describe('page2_facade_fence → yard или page6 (сторона заполнения)', () => {
      it('Одна сторона → page6 (пропуск yard)', () => {
        expect(getNextPage('page2_facade_fence', state({ fillSide: 1 }))).toBe('page6')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getNextPage('page2_facade_fence', state({
          fillSide: 2,
          materialYardGlob: 'fence',
        }))).toBe('page2_yard_fence')
      })
    })

    describe('page2_yard_fence → page6', () => {
      it('yard_fence → page6', () => {
        expect(getNextPage('page2_yard_fence', state())).toBe('page6')
      })
    })

    describe('page9 → lock или page10 (замок)', () => {
      it('Замок есть + изготовитель → page_lock_type', () => {
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
      it('page2_facade_fence → page2', () => {
        expect(getPrevPage('page2_facade_fence', state())).toBe('page2')
      })
    })

    describe('yard → facade', () => {
      it('page2_yard_fence → page2_facade_fence', () => {
        expect(getPrevPage('page2_yard_fence', state())).toBe('page2_facade_fence')
      })
    })

    describe('page6 → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_fence', () => {
        expect(getPrevPage('page6', state({ fillSide: 1 }))).toBe('page2_facade_fence')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getPrevPage('page6', state({
          fillSide: 2,
          materialYardGlob: 'fence',
        }))).toBe('page2_yard_fence')
      })
    })

    describe('page10 / page_lock_type → page9', () => {
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

  it('исключает самостоятельные аксессуары из меню и переходов', () => {
    const menuPages = type3Route.menu(state()).map(item => item.page)

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
