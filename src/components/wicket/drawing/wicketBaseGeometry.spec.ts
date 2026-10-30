import { describe, expect, it } from 'vitest'
import { computeWicketBase } from './wicketBaseGeometry'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'
import { buildType3Geometry } from './type3/type3Geometry'

const vertical = { visible: false, placement: 'above' as const, railY: 0, gateY: 0, gateHeight: 1950, postY: 0, postHeight: 2000 }
describe('shared wicket base', () => {
  for (const profileSize of [50, 60] as const) {
    for (const hingeSide of ['left', 'right'] as const) {
      it(`keeps physical clearances and hinge offsets for ${profileSize}/${hingeSide}`, () => {
        const base = computeWicketBase({ profileSize, openingWidth: 900, vertical, hasPosts: true, postWidth: 80, orientation: { hingeSide, opensOutward: true } })
        const leftGap = base.gate.x - 80
        const rightGap = 820 - base.gate.x - base.gate.width
        expect([leftGap, rightGap]).toEqual(hingeSide === 'left' ? [4, 10] : [10, 4])
        expect(base.outerFrame.left.width).toBe(profileSize)
        expect(base.outerFrame.right.width).toBe(profileSize)
        expect(base.hinges.map(r => r.y)).toEqual([100, 175, 1700, 1775])
        expect(base.hinges[3]!.y + base.hinges[3]!.height).toBe(base.gate.height - 100)
        expect(base.strip.map(r => r.width)).toEqual([14, 12, 14])
        expect(base.strip[0]!.x).toBe(hingeSide === 'right' ? base.gate.x - 25 : base.gate.x + base.gate.width - 15)
      })
    }
  }
  it.each([50, 60] as const)('supports the minimum 700×1500 opening with profile %s', profileSize => {
    const base = computeWicketBase({ profileSize, openingWidth: 700, hasPosts: false, postWidth: 0, orientation: null, vertical: { ...vertical, gateHeight: 1450, postHeight: 0 } })
    expect(base.gate).toEqual({ x: 4, y: 0, width: 686, height: 1450 })
    expect(base.hinges).toEqual([])
    expect(base.strip).toEqual([])
    expect(base.posts.visible).toBe(false)
  })
  it.each([0, 1])('uses the same base in all types with posts=%s and ignores renamed labels', hasStolby => {
    const source = { widthProyema: 900, heightProyema: 2000, clearanceProyema: 50, hasStolby, postProfile: hasStolby ? { sizeA: 80, sizeB: 80 } : null, jumperPlacement: 'none', jumperProfile: null, shieldType: 'noNet', openingOrientation: { hingeSide: 'right', opensOutward: false }, fillSide: 0 }
    const first = computeType1Geometry(source).base
    const second = computeType2Geometry(source).base
    const third = buildType3Geometry(source).base
    expect(second).toEqual(third)
    expect(first.gate).toEqual(second.gate)
    expect(first.hinges).toEqual(second.hinges)
    expect(first.strip).toEqual(second.strip)
    expect(first.posts).toEqual(second.posts)
    expect(first.outerFrame.left.width).toBe(60)
    expect(second.outerFrame.left.width).toBe(50)
    expect(computeType2Geometry({ ...source, stolbName: 'Переименовано', openingOptionName: 'Другая подпись' }).base).toEqual(second)
  })
})
