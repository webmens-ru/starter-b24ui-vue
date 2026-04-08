import { describe, it, expect } from 'vitest'
import { getNextPage as getNextPageT1, getPrevPage as getPrevPageT1, type Type1NavState } from './type1Navigation'
import { getNextPage as getNextPageT2, getPrevPage as getPrevPageT2, type Type2NavState } from './type2Navigation'

function state(overrides: Partial<Type1NavState> = {}): Type1NavState & Type2NavState {
  return {
    material_facade_glob: 'Сайдинг',
    fill_side: 'Одна сторона',
    material_yard_glob: null,
    is_there_lock_id: 1,
    provides_lock: 'Предоставляет изготовитель',
    ...overrides,
  }
}

describe('type2Navigation (пока = type1)', () => {
  it('getNextPage совпадает с type1 на ключевых шагах', () => {
    const s = state()
    expect(getNextPageT2('page1', s)).toBe(getNextPageT1('page1', s))
    expect(getNextPageT2('page5', s)).toBe(getNextPageT1('page5', s))
    expect(getNextPageT2('page9', s)).toBe(getNextPageT1('page9', s))
  })

  it('getPrevPage совпадает с type1', () => {
    const s = state()
    expect(getPrevPageT2('page2', s)).toBe(getPrevPageT1('page2', s))
    expect(getPrevPageT2('page10', s)).toBe(getPrevPageT1('page10', s))
  })
})
