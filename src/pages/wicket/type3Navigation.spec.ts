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

    describe('page2_facade_fence → yard или page3 (сторона заполнения)', () => {
      it('Одна сторона → page_painting (пропуск yard)', () => {
        expect(getNextPage('page2_facade_fence', state({ fillSide: 1 }))).toBe('page2_facade_fence_laying')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getNextPage('page2_facade_fence', state({
          fillSide: 2,
          materialYardGlob: 'fence',
        }))).toBe('page2_facade_fence_laying')
      })
    })

    describe('page2_yard_fence → page_painting', () => {
      it('yard_fence → page_painting', () => {
        expect(getNextPage('page2_yard_fence', state())).toBe('page_painting')
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
        expect(getPrevPage('page2_yard_fence', state())).toBe('page2_facade_fence_laying')
      })
    })

    describe('page_painting → facade или yard (по fillSide)', () => {
      it('Одна сторона → page2_facade_fence', () => {
        expect(getPrevPage('page_painting', state({ fillSide: 1 }))).toBe('page2_facade_fence_laying')
      })
      it('Две стороны → page2_yard_fence', () => {
        expect(getPrevPage('page_painting', state({
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
      it('page2 → page6', () => {
        expect(getPrevPage('page2', state())).toBe('page6')
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

it('completes facade before starting yard and reverses all four screens', () => {
  const twoSides = state({ fillSide: 2 });
  const pages = ['page2', 'page2_facade_fence', 'page2_facade_fence_laying', 'page2_yard_fence', 'page_painting'];
  for (let i = 0; i < pages.length - 1; i++) {
    expect(getNextPage(pages[i]!, twoSides)).toBe(pages[i + 1]);
    expect(getPrevPage(pages[i + 1]!, twoSides)).toBe(pages[i]);
  }
  expect(getNextPage('page2_facade_fence_laying', state())).toBe('page_painting');
  expect(getNextPage('page2', state({ fillSide: 0 }))).toBe('page_painting');
});

it('marks missing laying incomplete and blocks sidebar jumps past filling', () => {
  const incomplete = state({ idFacade: 100, idYard: 101, fillSide: 2 })
  expect(type3Route.validations(incomplete).get('page2')?.valid).toBe(false)
  expect(type3Route.canNavigate?.('page2_facade_fence', 'page_painting', incomplete)).toBe(false)
  expect(type3Route.canNavigate?.('page2_facade_fence_laying', 'page7', incomplete)).toBe(true)
  const complete = { ...incomplete, layingFacadeCode: 'butt' as const, gapName: 0, layingYardCode: 'butt' as const, gapYardMm: 0 }
  expect(type3Route.validations(complete).get('page2')?.valid).toBe(true)
  expect(type3Route.canNavigate?.('page2_yard_fence', 'page_painting', complete)).toBe(true)
})

it('rejects independently saved yard gap or physical width in gap mode', () => {
  const shared = state({ yardTrimCode: 'none', idFacade: 100, idYard: 101, fillSide: 2, layingFacadeCode: 'gap', gapName: 28, layingYardCode: 'gap', gapYardMm: 28, thicknessFacade: '100', thicknessYard: '100.0' })
  expect(type3Route.validations(shared).get('page2')?.valid).toBe(true)
  expect(type3Route.validations({ ...shared, gapYardMm: 17 }).get('page2')?.valid).toBe(false)
  expect(type3Route.validations({ ...shared, thicknessYard: '120' }).get('page2')?.valid).toBe(false)
})

it('routes double-sided butt laying through independent yard trimming', () => {
  expect(getNextPage('page2_yard_fence', state({ fillSide: 2, layingFacadeCode: 'butt', gapName: 0, facadeButtTrimCode: 'both' }))).toBe('page2_yard_fence_trim')
})

it('requires yard butt completion for new facade layouts while retaining historical null codes', () => {
  const base = state({ idFacade: 100, idYard: 101, fillSide: 2, layingFacadeCode: 'butt', layingYardCode: 'butt', gapName: 0, gapYardMm: 0, thicknessFacade: '100', thicknessYard: '120' })
  const validate = type3Route.sections.find(section => section.menu.page === 'page2')!.validate
  expect(validate({ ...base, facadeButtTrimCode: 'both', yardButtTrimCode: null }).valid).toBe(false)
  expect(validate({ ...base, facadeButtTrimCode: null, yardButtTrimCode: null }).valid).toBe(true)
  expect(validate({ ...base, facadeButtTrimCode: 'both', yardButtTrimCode: 'single', yardButtTrimSide: 'top', raspolozheniyePolotna: 'vertical' }).valid).toBe(false)
  expect(validate({ ...base, facadeButtTrimCode: 'both', yardButtTrimCode: 'single', yardButtTrimSide: 'lock', raspolozheniyePolotna: 'vertical' }).valid).toBe(true)
})

it('places edge selection after each material and skips it when no applicable edges exist', () => {
  const s = state({ fillSide: 2, hasFenceEdges: true })
  expect(getNextPage('page2_facade_fence', s)).toBe('page2_facade_fence_edge')
  expect(getNextPage('page2_facade_fence_edge', s)).toBe('page2_facade_fence_laying')
  expect(getPrevPage('page2_facade_fence_laying', s)).toBe('page2_facade_fence_edge')
  expect(getNextPage('page2_yard_fence', s)).toBe('page2_yard_fence_edge')
  expect(getPrevPage('page2_yard_fence_edge', s)).toBe('page2_yard_fence')
  expect(getNextPage('page2_facade_fence', state({ hasFenceEdges: false }))).toBe('page2_facade_fence_laying')
})
