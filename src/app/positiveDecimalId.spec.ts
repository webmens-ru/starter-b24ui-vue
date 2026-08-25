import { describe, expect, it } from 'vitest'
import { isPositiveSafeInteger, parsePositiveDecimalId } from './positiveDecimalId'

describe('positive decimal identifiers', () => {
  it.each([
    { label: 'empty or null', raws: ['', null] },
    { label: 'whitespace or array', raws: [' ', []] },
    { label: 'zero or decimal array', raws: ['0', ['42']] },
    { label: 'negative', raws: ['-1'] },
    { label: 'leading zero', raws: ['01'] },
    { label: 'decimal', raws: ['1.5'] },
    { label: 'exponent', raws: ['1e2'] },
    { label: 'hex', raws: ['0x2a'] },
    { label: 'unsafe', raws: ['9007199254740992'] },
  ])(
    'rejects malformed or unsafe text $label',
    ({ raws }) => raws.forEach(raw => expect(
      parsePositiveDecimalId(raw),
      `malformed raw value ${JSON.stringify(raw)}`,
    ).toEqual({ kind: 'invalid' })),
  )
  it('distinguishes absence and accepts canonical decimal text', () => {
    expect(parsePositiveDecimalId(undefined)).toEqual({ kind: 'absent' })
    expect(parsePositiveDecimalId('42')).toEqual({ kind: 'valid', value: 42 })
  })
  it('requires positive safe integer API identifiers', () => {
    expect(isPositiveSafeInteger(42)).toBe(true)
    expect(isPositiveSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
  })
})
