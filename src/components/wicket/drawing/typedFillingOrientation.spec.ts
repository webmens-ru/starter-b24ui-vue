import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'
import { buildType3Geometry as computeType3Geometry } from './type3/type3Geometry'

const base = { widthProyema: 1000, heightProyema: 2000, hasStolby: 0,
  openingOrientation: { opensOutward: true, hingeSide: 'left' as const },
  jumperPlacement: 'none' as const, postProfile: null, jumperProfile: null,
  shieldType: 'noNet', fillSide: 1, numberOfSticks: 4, thicknessFacade: 100 }

describe('current drawings use explicit filling direction', () => {
  it.each(['horizontal', 'vertical'] as const)('uses %s for textures without parsing translated labels', code => {
    for (const calculate of [computeType1Geometry, computeType2Geometry]) {
      const geometry = calculate({ ...base, raspolozheniyePolotna: code })
      expect(geometry.fill.direction).toBe(code)
      expect(geometry.yardFill.direction).toBe(code)
    }
  })
  it('rotates Type1 reinforcement and Type3 pickets using the code', () => {
    const horizontal = computeType1Geometry({ ...base, raspolozheniyePolotna: 'horizontal' })
    const vertical = computeType1Geometry({ ...base, raspolozheniyePolotna: 'vertical' })
    expect(horizontal.lockPipes[0]?.width).toBe(40)
    expect(vertical.lockPipes[0]?.height).toBe(40)
    const pickets = computeType3Geometry({ ...base, raspolozheniyePolotna: 'horizontal' })
    expect(pickets.facadePickets[0]!.width).toBeGreaterThan(100)
    expect(pickets.facadePickets[0]!.height).toBe(100)
  })
  it.each(['', null, 'Вертикально', 'horizontal ', true])('rejects unresolved or non-code state %s instead of guessing', value => {
    for (const calculate of [computeType1Geometry, computeType2Geometry, computeType3Geometry]) {
      expect(() => calculate({ ...base, raspolozheniyePolotna: value })).toThrow('fillingOrientationCode')
    }
  })
})
