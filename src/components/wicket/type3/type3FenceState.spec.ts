import { describe, expect, it } from 'vitest'
import { fenceGeometryKey, shouldInvalidateFenceGap } from './type3FenceState'

const base = {
  widthProyema: 1200,
  hasStolby: 1,
  stolbId: 5,
  shieldType: 'Тип_1',
  widthSidePart: 0,
  raspolozheniyePolotna: 'Вертикально',
  idFacade: 10,
}

describe('type3FenceState', () => {
  it('creates the same key for the same geometry', () => {
    expect(fenceGeometryKey(base)).toBe(fenceGeometryKey({ ...base }))
  })

  it.each([
    ['widthProyema', 1300],
    ['hasStolby', 0],
    ['stolbId', 6],
    ['shieldType', 'Тип_4'],
    ['widthSidePart', 200],
    ['raspolozheniyePolotna', 'Горизонтально'],
    ['idFacade', 11],
  ] as const)('invalidates the gap when %s changes', (key, value) => {
    expect(shouldInvalidateFenceGap(base, { ...base, [key]: value })).toBe(true)
  })

  it('does not invalidate the gap when geometry is unchanged', () => {
    expect(shouldInvalidateFenceGap(base, { ...base })).toBe(false)
  })
})
