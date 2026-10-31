import { describe, expect, it } from 'vitest'
import { buildType11Geometry } from './type11Geometry'
import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
const source = { widthProyema: 1000, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 11 geometry', () => {
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('divides the shared %s opening into two exact clear areas', shieldType => {
    for (const [widthProyema, heightProyema] of [[700, 1500], [1000, 2000], [1000, 2001]]) for (const hingeSide of ['left', 'right']) for (const opensOutward of [true, false]) for (const raspolozheniyePolotna of ['vertical', 'horizontal']) {
      const input = { ...source, widthProyema, heightProyema, shieldType, heightTopPart: 200, heightLowerPart: 200, widthSidePart: 100, grilleLocation: 'hinge', openingOrientation: { hingeSide, opensOutward }, raspolozheniyePolotna }
      const g = buildType11Geometry(input)
      expect(g.base.outerFrame.left.width).toBe(50)
      expect(g.central).toEqual(buildRetainedFrameGeometry(input, 50, { top: true, lower: true, side: true }).central)
      expect(g.crossbars).toHaveLength(1)
      const gap = (g.central.height - 20) / 2
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
  it('accepts central 21mm but rejects 20mm without lowering other models limits', () => {
    const input = { ...source, widthProyema: 700, heightProyema: 1500, shieldType: 'upperNet', heightTopPart: 1278 }
    const g = buildType11Geometry(input)
    expect(g.central.height).toBe(21)
    expect(g.crossbars[0]!.y - g.central.y).toBe(0.5)
    expect(() => buildType11Geometry({ ...input, heightTopPart: 1279 })).toThrow()
    expect(() => buildRetainedFrameGeometry(input, 50)).toThrow()
  })
  it('ignores editable captions and preserves explicitly empty net space', () => {
    const input = { ...source, shieldType: 'upperNet', netWidthProviderTop: '' }
    expect(buildType11Geometry({ ...input, openingOptionName: 'Renamed', stolbName: 'Renamed' })).toEqual(buildType11Geometry(input))
    expect(buildType11Geometry(input).central).toEqual(buildRetainedFrameGeometry(input, 50, { top: false, lower: true, side: true }).central)
  })
})
