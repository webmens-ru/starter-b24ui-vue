import { describe, expect, it } from 'vitest'
import { isPositiveSafeInteger, parsePositiveDecimalId } from './positiveDecimalId'

describe('positive decimal identifiers', () => {
  it.each(['', ' ', '0', '-1', '01', '1.5', '1e2', '0x2a', '9007199254740992'])(
    'rejects malformed or unsafe text %j',
    raw => expect(parsePositiveDecimalId(raw)).toEqual({ kind: 'invalid' }),
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
