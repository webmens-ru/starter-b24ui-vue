import { describe, expect, it } from 'vitest'
import { buildType9Geometry } from './type9Geometry'
import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
const source = { widthProyema: 1000, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 9 geometry', () => {
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('divides the shared %s opening into four exact clear areas', shieldType => {
    for (const [widthProyema, heightProyema] of [[700, 1500], [1000, 2000], [1000, 2001]]) for (const hingeSide of ['left', 'right']) for (const opensOutward of [true, false]) for (const raspolozheniyePolotna of ['vertical', 'horizontal']) {
      const input = { ...source, widthProyema, heightProyema, shieldType, heightTopPart: 200, heightLowerPart: 200, widthSidePart: 100, grilleLocation: 'hinge', openingOrientation: { hingeSide, opensOutward }, raspolozheniyePolotna }
      const g = buildType9Geometry(input)
      expect(g.base.outerFrame.left.width).toBe(50)
      expect(g.central).toEqual(buildRetainedFrameGeometry(input, 50, { top: true, lower: true, side: true }).central)
      expect(g.crossbars).toHaveLength(3)
      const gap = (g.central.height - 60) / 4
      let previousBottom = g.central.y
      for (const bar of g.crossbars) {
        expect(bar.y - previousBottom).toBe(gap)
        expect(bar).toEqual({ x: g.central.x, y: bar.y, width: g.central.width - 1, height: 20, depthStart: 0, depthEnd: 40 })
        previousBottom = bar.y + 20
      }
      expect(g.central.y + g.central.height - previousBottom).toBe(gap)
      expect(g).not.toHaveProperty('innerFrames')
    }
  })
  it('rejects a 60mm central opening and fits four positive areas at 64mm', () => {
    const input = { ...source, widthProyema: 700, heightProyema: 1500, shieldType: 'upperNet', heightTopPart: 1239 }
    expect(buildRetainedFrameGeometry(input, 50, { top: true, lower: true, side: true }).central.height).toBe(60)
    expect(() => buildType9Geometry(input)).toThrow('60')
    const g = buildType9Geometry({ ...input, heightTopPart: 1235 })
    expect(g.central.height).toBe(64)
    expect(g.crossbars.map(bar => bar.y - g.central.y)).toEqual([1, 22, 43])
  })
  it('ignores editable captions and preserves explicitly empty net space', () => {
    const input = { ...source, shieldType: 'upperNet', netWidthProviderTop: '' }
    expect(buildType9Geometry({ ...input, openingOptionName: 'Renamed', stolbName: 'Renamed' })).toEqual(buildType9Geometry(input))
    expect(buildType9Geometry(input).central).toEqual(buildRetainedFrameGeometry(input, 50, { top: false, lower: true, side: true }).central)
  })
})
