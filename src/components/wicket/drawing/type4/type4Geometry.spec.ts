import { describe, expect, it } from 'vitest'
import { buildLamellae, buildType4Geometry } from './type4Geometry'
const source = { widthProyema: 900, heightProyema: 2000, clearanceProyema: 50, hasStolby: 0, postProfile: null, jumperPlacement: 'none', jumperProfile: null, openingOrientation: { hingeSide: 'left', opensOutward: true }, shieldType: 'noNet', raspolozheniyePolotna: 'vertical' }
describe('type 4 geometry', () => {
  it('uses the shared 50 mm base and 15 mm inner pipes with manufacturing clearances', () => {
    const g = buildType4Geometry(source)
    expect(g.base.outerFrame.left.width).toBe(50)
    expect(g.central).toEqual({ x: 54, y: 50, width: 786, height: 1850 })
    expect(g.innerFrames.street.parts[0]).toMatchObject({ width: 785, height: 15 })
    expect(g.innerFrames.street.parts).toHaveLength(4)
    expect(g.innerFrames.street.parts[2]).toMatchObject({ width: 15, height: 1849 })
    expect(g.fillingArea).toEqual({ x: 59, y: 55, width: 776, height: 1840 })
    expect(buildLamellae(g.fillingArea, 100, 'vertical')).toHaveLength(8)
    expect(buildLamellae(g.fillingArea, 100, 'horizontal')).toHaveLength(19)
  })
  it.each([[900, 2000], [700, 1500]])('mitres both face perimeters at 45 degrees for %s × %s', (width, height) => {
    const g = buildType4Geometry({ ...source, widthProyema: width, heightProyema: height })
    const x = g.central.x + 0.5, y = g.central.y + 0.5
    const right = x + g.central.width - 1, bottom = y + g.central.height - 1
    const expected = [
      [[x, y], [right, y], [right - 15, y + 15], [x + 15, y + 15]],
      [[x, bottom], [x + 15, bottom - 15], [right - 15, bottom - 15], [right, bottom]],
      [[x, y], [x + 15, y + 15], [x + 15, bottom - 15], [x, bottom]],
      [[right, y], [right, bottom], [right - 15, bottom - 15], [right - 15, y + 15]],
    ].map(points => points.map(point => point.join(',')).join(' '))
    for (const frame of [g.innerFrames.street, g.innerFrames.yard]) {
      expect(frame.parts.map(part => part.points)).toEqual(expected)
      expect(frame.parts.map(part => [part.width, part.height])).toEqual([
        [g.central.width - 1, 15], [g.central.width - 1, 15],
        [15, g.central.height - 1], [15, g.central.height - 1],
      ])
    }
    expect(g.innerFrames.street.depth).toBe(0)
    expect(g.innerFrames.yard.depth).toBe(35)
  })
  it.each(['lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'])('reserves sections for %s', shieldType => {
    const g = buildType4Geometry({ ...source, shieldType, grilleLocation: 'hinge', heightTopPart: 200, heightLowerPart: 300, widthSidePart: 200 })
    expect(g.netAreas.length).toBe(shieldType === 'upperAndLowerNet' ? 2 : 1)
    expect(g.rails).toHaveLength(g.netAreas.length)
    expect(g.innerFrames.street.parts).toHaveLength(4)
    expect(g.innerFrames.street.parts.filter(part => part.height === 15)).toHaveLength(2)
    expect(g.innerFrames.street.parts.filter(part => part.width === 15)).toHaveLength(2)
    expect(g.fillingArea.width).toBeGreaterThan(0)
    expect(g.fillingArea.height).toBeGreaterThan(0)
  })
  it('uses explicit orientation and numeric widths regardless of captions', () => {
    expect(buildType4Geometry({ ...source, openingOptionName: 'Переименовано', stolbName: 'Другая подпись' })).toEqual(buildType4Geometry(source))
    expect(() => buildLamellae(buildType4Geometry(source).fillingArea, '', 'vertical')).toThrow('ширина')
  })
})
