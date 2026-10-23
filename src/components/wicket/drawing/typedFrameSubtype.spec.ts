import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'
import { buildType3Geometry } from './type3/type3Geometry'

const base = { widthProyema: 1000, heightProyema: 2000, hasStolby: 0,
  openingOrientation: { opensOutward: true, hingeSide: 'left' as const },
  jumperPlacement: 'none' as const, postProfile: null, jumperProfile: null,
  raspolozheniyePolotna: 'vertical', heightLowerPart: 300, heightTopPart: 200, widthSidePart: 150 }

describe('current drawings use explicit frame subtype', () => {
  it.each([
    ['noNet', false, false, false], ['lowerNet', false, true, false],
    ['upperAndLowerNet', true, true, false], ['sideNet', false, false, true],
    ['upperNet', true, false, false],
  ] as const)('builds %s zones independently of presentation', (code, top, lower, side) => {
    for (const calculate of [computeType1Geometry, buildType3Geometry]) {
      const geometry = calculate({ ...base, shieldType: code })
      expect(geometry.rails.upper.visible).toBe(top)
      expect(geometry.rails.lower.visible).toBe(lower)
      expect(geometry.rails.vertical.visible).toBe(side)
    }
    const geometry = computeType2Geometry({ ...base, shieldType: code })
    expect(geometry.rails.upperSubtype.visible).toBe(top)
    expect(geometry.rails.lowerSubtype.visible).toBe(lower)
    expect(geometry.rails.verticalSubtype.visible).toBe(side)
  })
  it.each(['', null, 'Тип_1', 'type4', 'sideNet ', true])('refuses invalid current state %s', value => {
    for (const calculate of [computeType1Geometry, computeType2Geometry, buildType3Geometry]) {
      expect(() => calculate({ ...base, shieldType: value })).toThrow('frameSubtypeCode')
    }
  })
})
