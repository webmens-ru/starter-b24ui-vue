import { describe, expect, it } from 'vitest'
import { buildType8Geometry } from './type8Geometry'
import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
const source = { widthProyema: 1000, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 8 geometry', () => {
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('centres one street-aligned crossbar in shared %s opening', shieldType => {
    for (const [widthProyema, heightProyema] of [[700, 1500], [1000, 2000]]) for (const hingeSide of ['left', 'right']) for (const opensOutward of [true, false]) for (const raspolozheniyePolotna of ['vertical', 'horizontal']) {
      const input = { ...source, widthProyema, heightProyema, shieldType, heightTopPart: 200, heightLowerPart: 200, widthSidePart: 100, grilleLocation: 'hinge', openingOrientation: { hingeSide, opensOutward }, raspolozheniyePolotna }
      const g = buildType8Geometry(input)
      const shared = buildRetainedFrameGeometry(input, 60, { top: true, lower: true, side: true })
      expect(g.base.outerFrame.left.width).toBe(60)
      expect(g.central).toEqual(shared.central)
      expect(g.fillingArea).toEqual(shared.fillingArea)
      expect(g.rails).toEqual(shared.rails)
      expect(g).not.toHaveProperty('innerFrames')
      expect(g.crossbar).toEqual({ x: g.central.x, y: g.central.y + Math.floor((g.central.height - 40) / 2), width: g.central.width - 1, height: 40, depthStart: 0, depthEnd: 40 })
    }
  })
  it('keeps numeric geometry when captions change and net zones are explicitly empty', () => {
    const input = { ...source, shieldType: 'upperNet', netWidthProviderTop: '' }
    expect(buildType8Geometry({ ...input, openingOptionName: 'Renamed', stolbName: 'Renamed' })).toEqual(buildType8Geometry(input))
    expect(buildType8Geometry(input).central).toEqual(buildRetainedFrameGeometry(input, 60, { top: false, lower: true, side: true }).central)
  })
})
