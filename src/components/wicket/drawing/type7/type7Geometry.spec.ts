import { describe, expect, it } from 'vitest'
import { buildType7Geometry } from './type7Geometry'
const source = { widthProyema: 900, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 7 construction', () => {
  it('uses a 50 mm base and two outside mitred strip frames', () => {
    const g = buildType7Geometry(source)
    expect(g.base.outerFrame.left.width).toBe(50)
    for (const frame of [g.innerFrames.street, g.innerFrames.yard]) {
      expect(frame.parts.map(p => p.position)).toEqual([10, 10, 8, 8])
      expect(frame.parts[0]).toMatchObject({ width: g.central.width + 19, height: 40 })
      expect(frame.parts[2]).toMatchObject({ width: 40, height: g.central.height + 19 })
      expect(frame.parts.every(p => p.points)).toBe(true)
    }
    expect(g.innerFrames.street.depth).toBe(-4)
    expect(g.innerFrames.yard.depth).toBe(50)
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('supports all openings and minimum-size %s', shieldType => {
    for (const hingeSide of ['left', 'right']) for (const opensOutward of [true, false]) {
      const g = buildType7Geometry({ ...source, widthProyema: 700, heightProyema: 1500, shieldType, heightTopPart: 200, heightLowerPart: 200, widthSidePart: 100, grilleLocation: 'hinge', openingOrientation: { hingeSide, opensOutward } })
      expect(g.innerFrames.street.parts).toHaveLength(4)
      expect(g.innerFrames.yard.parts).toHaveLength(4)
      expect(g.fillingArea.width).toBeGreaterThan(0)
      expect(g.fillingArea.height).toBeGreaterThan(0)
      expect(g.rails).toHaveLength(g.netAreas.length)
    }
  })
  it('takes construction from numeric dimensions and orientation codes regardless of captions', () => {
    expect(buildType7Geometry({ ...source, openingOptionName: 'Renamed', stolbName: 'Renamed' })).toEqual(buildType7Geometry(source))
  })
})
