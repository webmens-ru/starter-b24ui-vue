import { describe, expect, it } from 'vitest'
import { selectPaintColor } from './paintSelection'
describe('paint color selection', () => {
  const colors = [{ id: 91, name: 'A', hex: null, image: null }, { id: 92, name: 'B', hex: null, image: null }]
  it('retains a shared ID and requires explicit choice for multiple colors', () => {
    expect(selectPaintColor(colors, 92)).toBe(92)
    expect(selectPaintColor(colors, 93)).toBeNull()
    expect(selectPaintColor([colors[0]!], null)).toBe(91)
    expect(selectPaintColor([], 91)).toBeNull()
    expect(selectPaintColor(colors.map(c => ({ ...c, name: 'Renamed' })), 92)).toBe(92)
  })
})
