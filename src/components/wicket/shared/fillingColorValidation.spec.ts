import { describe, expect, it } from 'vitest'
import { hasRequiredFillingColor } from './fillingColorValidation'

describe('hasRequiredFillingColor', () => {
  it.each([
    [null, '', false],
    [undefined, '   ', false],
    ['', '', false],
    [8, '', true],
    ['8', '', true],
    [null, 'RAL 7016', true],
  ])('validates color id=%j name=%j', (colorId, colorName, expected) => {
    expect(hasRequiredFillingColor(colorId, colorName)).toBe(expected)
  })
})
