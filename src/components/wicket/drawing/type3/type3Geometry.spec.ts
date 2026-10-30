import { describe, expect, it } from 'vitest'
import { buildType3Geometry } from './type3Geometry'

const base = {
  jumperProfile: null, jumperPlacement: 'none',
  widthProyema: 1200,
  heightProyema: 2100,
  clearanceProyema: 100,
  postProfile: { sizeA: 80, sizeB: 80 }, hasStolby: 1,
  stolbName: '80/80/3',
  shieldType: 'noNet',
  numberOfSticks: 8,
  gapName: 28,
  thicknessFacade: 100,
  raspolozheniyePolotna: 'vertical',
}

describe('buildType3Geometry', () => {
  it.each(['left', 'right'] as const)('keeps a 4 mm hinge gap and a 10 mm lock gap for %s hinges', hingeSide => {
    const geometry = buildType3Geometry({ ...base, widthProyema: 1000, heightProyema: 2000,
      hasStolby: 1, postProfile: { sizeA: 50, sizeB: 50 }, openingOrientation: { opensOutward: true, hingeSide } })
    const leftGap = geometry.gate.x - (geometry.posts.left.x + geometry.posts.left.width)
    const rightGap = geometry.posts.right.x - (geometry.gate.x + geometry.gate.width)
    expect([leftGap, rightGap]).toEqual(hingeSide === 'left' ? [4, 10] : [10, 4])
    expect(geometry.strip).toHaveLength(3)
    expect(geometry.strip.reduce((width, part) => width + part.width, 0)).toBe(40)
    expect(geometry.strip.every(part => part.y === geometry.gate.y && part.height === geometry.gate.height)).toBe(true)
    expect(geometry.strip[0]!.x).toBe(hingeSide === 'right' ? geometry.gate.x - 25 : geometry.gate.x + geometry.gate.width - 15)
  })

  it.each(['left', 'right'] as const)('places two split hinges on the %s frame edge', hingeSide => {
    const geometry = buildType3Geometry({ ...base, openingOrientation: { opensOutward: true, hingeSide } })
    expect(geometry.hinges).toHaveLength(4)
    const x = hingeSide === 'left' ? geometry.gate.x - 10 : geometry.gate.x + geometry.gate.width - 6
    expect(geometry.hinges.map(part => part.x)).toEqual([x, x, x, x])
    expect(geometry.hinges.map(part => part.y)).toEqual([
      geometry.gate.y + 100, geometry.gate.y + 175,
      geometry.gate.y + geometry.gate.height - 250, geometry.gate.y + geometry.gate.height - 175,
    ])
    expect(geometry.hinges.every(part => part.width === 16 && part.height === 75)).toBe(true)
  })

  it('does not guess the hinge side when opening is not selected', () => {
    expect(buildType3Geometry({ ...base, openingOrientation: null }).hinges).toEqual([])
  })

  it('draws two detail 5 rails and one detail 6 lock rail with 40 mm faces', () => {
    const geometry = buildType3Geometry({ ...base, numberOfSticks: 0 })
    expect(geometry.innerHorizontal).toHaveLength(2)
    expect(geometry.innerHorizontal.map(part => part.height)).toEqual([40, 40])
    expect(geometry.lockRail.height).toBe(40)
    expect(geometry.lockRail.width).toBe(geometry.fillArea.width - 1)
  })

  it('draws only the four outer frame pipes without detail 4 vertical tubes', () => {
    const geometry = buildType3Geometry({ ...base, numberOfSticks: 0 })
    expect(geometry.frame).toHaveLength(4)
    expect(geometry.frame.filter(part => part.height === geometry.gate.height)).toHaveLength(2)
    expect(geometry.frame.every(part => part.width !== 20)).toBe(true)
  })

  it('сдвигает створку и столбы ниже верхней перемычки', () => {
    const geometry = buildType3Geometry({
      heightProyema: '2000',
      clearanceProyema: '50',
      postProfile: { sizeA: 80, sizeB: 80 }, hasStolby: 1,
      peremichkaPolozheniyeName: 'Над калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperProfile: { sizeA: 60, sizeB: 50 }, jumperPlacement: 'above',
    })

    expect(geometry.gate).toMatchObject({ y: 65, height: 1885 })
    expect(geometry.posts.left).toMatchObject({ y: 65, height: 1935 })
    expect(geometry.extraRail).toMatchObject({ y: 0, height: 60, placement: 'above' })
  })

  it('располагает заднюю перемычку сверху, а не посередине', () => {
    const geometry = buildType3Geometry({
      heightProyema: '2000',
      clearanceProyema: '50',
      postProfile: { sizeA: 80, sizeB: 80 }, hasStolby: 1,
      peremichkaPolozheniyeName: 'За калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperProfile: { sizeA: 60, sizeB: 60 }, jumperPlacement: 'behind',
    })

    expect(geometry.gate).toMatchObject({ y: 0, height: 1950 })
    expect(geometry.extraRail).toMatchObject({ y: 0, height: 60, placement: 'behind' })
  })

  it('uses 1000/2000/50 as the initial opening before dimensions are filled', () => {
    const geometry = buildType3Geometry({
      widthProyema: '',
      heightProyema: '',
      clearanceProyema: '',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: null, hasStolby: 0,
    })

    expect(geometry.opening).toEqual({ x: 0, y: 0, width: 1000, height: 2000 })
    expect(geometry.gate.height).toBe(1950)
  })

  it('builds the exact saved number of vertical pickets', () => {
    const geometry = buildType3Geometry(base)
    expect(geometry.facadePickets).toHaveLength(8)
    expect(geometry.facadePickets.every(picket => picket.height > picket.width)).toBe(true)
  })

  it('builds horizontal pickets when the canvas direction changes', () => {
    const geometry = buildType3Geometry({ ...base, raspolozheniyePolotna: 'horizontal' })
    expect(geometry.facadePickets).toHaveLength(8)
    expect(geometry.facadePickets.every(picket => picket.width > picket.height)).toBe(true)
  })

  it('shows posts only when they are selected', () => {
    expect(buildType3Geometry(base).posts.visible).toBe(true)
    expect(buildType3Geometry({ ...base, postProfile: null, hasStolby: 0 }).posts.visible).toBe(false)
  })

  it('uses explicit numeric post dimensions despite a single-number caption', () => {
    expect(buildType3Geometry({ ...base, stolbName: '100', postProfile: { sizeA: 100, sizeB: 100 } }).posts.left.width).toBe(100)
  })

  it.each([
    ['noNet', false, false, false],
    ['lowerNet', true, false, false],
    ['upperAndLowerNet', true, true, false],
    ['sideNet', false, false, true],
    ['upperNet', false, true, false],
  ] as const)('maps %s to its internal rails', (shieldType, lower, upper, vertical) => {
    const rails = buildType3Geometry({ ...base, shieldType }).rails
    expect(rails.lower.visible).toBe(lower)
    expect(rails.upper.visible).toBe(upper)
    expect(rails.vertical.visible).toBe(vertical)
  })

  it.each(['upperAndLowerNet', 'upperNet'])('places the %s upper net above its rail and pickets below it', (shieldType) => {
    const geometry = buildType3Geometry({
      widthProyema: 600,
      heightProyema: 1000,
      clearanceProyema: 50,
      shieldType,
      heightTopPart: 300,
      numberOfSticks: 4,
      upperGrilleNetImage: '/upper.png',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: null, hasStolby: 0,
    })

    expect(geometry.upperNetArea).toEqual({ x: 54, y: 50, width: 486, height: 300, visible: true })
    expect(geometry.upperNetImage).toBe('/upper.png')
    expect(geometry.facadePickets[0]?.y).toBeGreaterThanOrEqual(
      geometry.rails.upper.y + geometry.rails.upper.height,
    )
  })

  it('keeps Type 5 pickets down to the bottom frame without a lower rail or net', () => {
    const geometry = buildType3Geometry({
      widthProyema: 600,
      heightProyema: 1000,
      clearanceProyema: 50,
      shieldType: 'upperNet',
      heightTopPart: 300,
      heightLowerPart: 200,
      numberOfSticks: 4,
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: null, hasStolby: 0,
    })

    expect(geometry.rails.lower.visible).toBe(false)
    expect(geometry.fillArea.y + geometry.fillArea.height).toBe(900)
    expect(geometry.facadePickets[0]).toMatchObject({ y: 400, height: 500 })
  })

  it.each(['vertical', 'horizontal'])('keeps Type 5 %s pickets inside the gate when the upper height exceeds available space', (direction) => {
    const geometry = buildType3Geometry({
      widthProyema: 600,
      heightProyema: 1000,
      clearanceProyema: 50,
      shieldType: 'upperNet',
      heightTopPart: 900,
      numberOfSticks: 4,
      raspolozheniyePolotna: direction,
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: null, hasStolby: 0,
    })

    expect(geometry.rails.upper).toMatchObject({ y: 830, height: 50, visible: true })
    expect(geometry.upperNetArea).toMatchObject({ y: 50, height: 780, visible: true })
    expect(geometry.fillArea).toMatchObject({ y: 880, height: 20 })
    expect(geometry.facadePickets).toHaveLength(4)
    expect(geometry.facadePickets.every(picket =>
      picket.height > 0
      && picket.y >= 880
      && picket.y + picket.height <= 900,
    )).toBe(true)
  })

  it('does not expose an upper net for a subtype without a top region', () => {
    const geometry = buildType3Geometry({ ...base, shieldType: 'lowerNet', upperGrilleNetImage: '/upper.png' })

    expect(geometry.upperNetArea.visible).toBe(false)
    expect(geometry.upperNetImage).toBe('')
  })
})
