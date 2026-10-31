import { describe, expect, it } from 'vitest'
import { buildType5Geometry } from './type5Geometry'
const source = { widthProyema: 900, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 5 construction', () => {
  it('uses the common 60 mm frame, yard pipes and mitred street strips with a ten millimetre overlap', () => {
    const g = buildType5Geometry(source)
    expect(g.base.outerFrame.left.width).toBe(60)
    expect(g.central).toEqual({ x: 64, y: 60, width: 766, height: 1830 })
    expect(g.innerFrames.yard.depth).toBe(40)
    expect(g.innerFrames.yard.parts.map(p => p.position)).toEqual([5, 5, 4, 4])
    expect(g.innerFrames.yard.parts[0]).toMatchObject({ x: 64.5, y: 60, width: 765, height: 20 })
    expect(g.innerFrames.yard.parts[2]).toMatchObject({ width: 20, height: 1789 })
    expect(g.innerFrames.street.depth).toBe(-4)
    expect(g.innerFrames.street.parts.map(p => p.position)).toEqual([10, 10, 8, 8])
    expect(g.innerFrames.street.parts[0]).toMatchObject({ x: 54.5, y: 50, width: 785, height: 40 })
    expect(g.innerFrames.street.parts[2]).toMatchObject({ x: 54, y: 50.5, width: 40, height: 1849 })
    expect(g.innerFrames.street.parts.every(p => p.points)).toBe(true)
    expect([...g.innerFrames.street.parts, ...g.innerFrames.yard.parts].some(p => p.position === 6)).toBe(false)
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('supports all openings and minimum-size %s', shieldType => {
    for (const hingeSide of ['left', 'right']) for (const opensOutward of [true, false]) {
      const g = buildType5Geometry({ ...source, widthProyema: 700, heightProyema: 1500, shieldType, heightTopPart: 200, heightLowerPart: 200, widthSidePart: 100, grilleLocation: 'hinge', openingOrientation: { hingeSide, opensOutward } })
      expect(g.innerFrames.street.parts).toHaveLength(4)
      expect(g.innerFrames.yard.parts).toHaveLength(4)
      expect(g.fillingArea.width).toBeGreaterThan(0)
      expect(g.fillingArea.height).toBeGreaterThan(0)
      expect(g.rails).toHaveLength(g.netAreas.length)
    }
  })
  it.each([
    ['upperNet', 866, 1619], ['lowerNet', 866, 1519],
    ['upperAndLowerNet', 866, 1258], ['sideNet', 655, 1880],
  ])('matches calculation subtype manufacturing allowances for %s', (shieldType, width, height) => {
    const g = buildType5Geometry({ ...source, widthProyema: 1000, heightProyema: 2050, shieldType, heightTopPart: 200, heightLowerPart: 300, widthSidePart: 150, grilleLocation: 'hinge' })
    expect(g.central.width).toBe(width)
    expect(g.central.height).toBe(height)
  })

  it('does not add a mesh allowance to an explicitly empty net zone', () => {
    const g = buildType5Geometry({ ...source, widthProyema: 1000, heightProyema: 2050, shieldType: 'upperNet', heightTopPart: 200, netWidthProviderTop: '' })
    expect(g.central.height).toBe(1620)
  })

  it('takes construction from numeric dimensions and orientation codes regardless of captions', () => {
    expect(buildType5Geometry({ ...source, openingOptionName: 'Renamed', stolbName: 'Renamed' })).toEqual(buildType5Geometry(source))
  })
})
