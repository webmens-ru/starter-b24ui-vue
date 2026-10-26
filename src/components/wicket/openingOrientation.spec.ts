import { describe, expect, it } from 'vitest'
import { parseOpeningOrientation, parseOpeningSelection, screenHingeSide } from './openingOrientation'

describe('explicit opening orientation', () => {
  it.each([
    [true, 'left', 'left', 'right'],
    [true, 'right', 'right', 'left'],
    [false, 'left', 'left', 'right'],
    [false, 'right', 'right', 'left'],
  ] as const)('projects street and yard without reinterpreting direction (%s, %s)', (opensOutward, hingeSide, street, yard) => {
    const orientation = parseOpeningOrientation({ opensOutward, hingeSide, name: 'Противоречащая подпись' })
    expect(screenHingeSide(orientation, false)).toBe(street)
    expect(screenHingeSide(orientation, true)).toBe(yard)
  })

  it.each([null, undefined, [], {}, { opensOutward: '0', hingeSide: 'left' },
    { opensOutward: 1, hingeSide: 'right' }, { opensOutward: true, hingeSide: 'левая' },
    { opensOutward: false, hingeSide: null }])('rejects incomplete or coerced orientation %j', (value) => {
    expect(() => parseOpeningOrientation(value)).toThrow()
  })

  it('keeps an inactive historical orientation and its diagnostic', () => {
    expect(parseOpeningSelection(819, { opensOutward: false, hingeSide: 'right' }, { code: 'inactive', message: 'Неактивен' }))
      .toEqual({ openingOrientation: { opensOutward: false, hingeSide: 'right' }, openingOrientationProblem: { code: 'inactive', message: 'Неактивен' } })
  })

  it('does not infer missing selected properties from an identifier', () => {
    expect(parseOpeningSelection(1, undefined, null)).toMatchObject({ openingOrientation: null, openingOrientationProblem: { code: 'invalid' } })
    expect(parseOpeningSelection(null, { opensOutward: true, hingeSide: 'left' }, null))
      .toEqual({ openingOrientation: null, openingOrientationProblem: null })
  })

  it.each([0, -1, 1.5, true, '3tail', '0'])('rejects malformed foreign keys %j', (id) => {
    expect(parseOpeningSelection(id, { opensOutward: true, hingeSide: 'left' }, null))
      .toMatchObject({ openingOrientation: null, openingOrientationProblem: { code: 'invalid' } })
  })
})
