import { describe, expect, it } from 'vitest'
import { frameSubtypeCapabilities, resolveFrameSubtype } from './frameSubtype'

describe('frame subtype capabilities', () => {
  it.each([
    ['Тип_1', 'type1', false, false, false],
    ['Тип_2', 'type2', false, true, false],
    ['Тип_3', 'type3', true, true, false],
    ['Тип_4', 'type4', false, false, true],
    ['Тип_5', 'type5', true, false, false],
  ] as const)('maps %s to its visible mesh zones', (stored, subtype, top, lower, side) => {
    expect(resolveFrameSubtype(stored)).toBe(subtype)
    expect(frameSubtypeCapabilities(stored)).toEqual({ top, lower, side })
    expect(resolveFrameSubtype(subtype)).toBe(subtype)
    expect(frameSubtypeCapabilities(subtype)).toEqual({ top, lower, side })
  })

  it.each([undefined, null, '', 'Тип_6', 'type6', 5, {}, 'TYPE5'])(
    'defaults an absent or malformed subtype %s to type1', (value) => {
      expect(resolveFrameSubtype(value)).toBe('type1')
      expect(frameSubtypeCapabilities(value)).toEqual({ top: false, lower: false, side: false })
    },
  )
})
