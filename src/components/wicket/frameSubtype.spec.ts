import { describe, expect, it } from 'vitest'
import { frameSubtypeCapabilities, resolveFrameSubtype } from './frameSubtype'

describe('frame subtype capabilities', () => {
  it.each([
    ['noNet', 'type1', false, false, false],
    ['lowerNet', 'type2', false, true, false],
    ['upperAndLowerNet', 'type3', true, true, false],
    ['sideNet', 'type4', false, false, true],
    ['upperNet', 'type5', true, false, false],
  ] as const)('maps %s to its visible mesh zones', (stored, subtype, top, lower, side) => {
    expect(resolveFrameSubtype(stored)).toBe(subtype)
    expect(frameSubtypeCapabilities(stored)).toEqual({ top, lower, side })
  })

  it.each([null, '', 'Тип_6', 'type6', 5, {}, 'TYPE5'])(
    'rejects an explicit malformed subtype %s without enabling zones', (value) => {
      expect(() => resolveFrameSubtype(value)).toThrow('frameSubtypeCode')
      expect(frameSubtypeCapabilities(value)).toEqual({ top: false, lower: false, side: false })
    },
  )

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'rejects inherited object key %s as a subtype', (value) => {
      expect(() => resolveFrameSubtype(value)).toThrow('frameSubtypeCode')
      const capabilities = frameSubtypeCapabilities(value)
      expect(capabilities).toEqual({ top: false, lower: false, side: false })
      expect(Object.getPrototypeOf(capabilities)).toBe(Object.prototype)
    },
  )
})
