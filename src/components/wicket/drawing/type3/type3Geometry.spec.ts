import { describe, expect, it } from 'vitest'
import { buildType3Geometry } from './type3Geometry'

const base = {
  jumperPlacement: 'none',
  widthProyema: 1200,
  heightProyema: 2100,
  clearanceProyema: 100,
  hasStolby: 1,
  stolbName: '80/80/3',
  shieldType: 'Тип_1',
  numberOfSticks: 8,
  gapName: 28,
  thicknessFacade: 100,
  raspolozheniyePolotna: 'Вертикально',
}

describe('buildType3Geometry', () => {
  it('сдвигает створку и столбы ниже верхней перемычки', () => {
    const geometry = buildType3Geometry({
      heightProyema: '2000',
      clearanceProyema: '50',
      hasStolby: 1,
      peremichkaPolozheniyeName: 'Над калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperPlacement: 'above',
    })

    expect(geometry.gate).toMatchObject({ y: 65, height: 1885 })
    expect(geometry.posts.left).toMatchObject({ y: 65, height: 1935 })
    expect(geometry.extraRail).toMatchObject({ y: 0, height: 60, placement: 'above' })
  })

  it('располагает заднюю перемычку сверху, а не посередине', () => {
    const geometry = buildType3Geometry({
      heightProyema: '2000',
      clearanceProyema: '50',
      hasStolby: 1,
      peremichkaPolozheniyeName: 'За калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperPlacement: 'behind',
    })

    expect(geometry.gate).toMatchObject({ y: 0, height: 1950 })
    expect(geometry.extraRail).toMatchObject({ y: 0, height: 60, placement: 'behind' })
  })

  it('uses 1000/2000/50 as the initial opening before dimensions are filled', () => {
    const geometry = buildType3Geometry({
      widthProyema: '',
      heightProyema: '',
      clearanceProyema: '',
      jumperPlacement: 'none',
      hasStolby: 0,
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
    const geometry = buildType3Geometry({ ...base, raspolozheniyePolotna: 'Горизонтально' })
    expect(geometry.facadePickets).toHaveLength(8)
    expect(geometry.facadePickets.every(picket => picket.width > picket.height)).toBe(true)
  })

  it('shows posts only when they are selected', () => {
    expect(buildType3Geometry(base).posts.visible).toBe(true)
    expect(buildType3Geometry({ ...base, hasStolby: 0 }).posts.visible).toBe(false)
  })

  it('keeps a single-dimension post profile when parsing jumper dimensions', () => {
    expect(buildType3Geometry({ ...base, stolbName: '100' }).posts.left.width).toBe(100)
  })

  it.each([
    ['Тип_1', false, false, false],
    ['Тип_2', true, false, false],
    ['Тип_3', true, true, false],
    ['Тип_4', false, false, true],
    ['Тип_5', false, true, false],
  ] as const)('maps %s to its internal rails', (shieldType, lower, upper, vertical) => {
    const rails = buildType3Geometry({ ...base, shieldType }).rails
    expect(rails.lower.visible).toBe(lower)
    expect(rails.upper.visible).toBe(upper)
    expect(rails.vertical.visible).toBe(vertical)
  })

  it.each(['Тип_3', 'Тип_5'])('places the %s upper net above its rail and pickets below it', (shieldType) => {
    const geometry = buildType3Geometry({
      widthProyema: 600,
      heightProyema: 1000,
      clearanceProyema: 50,
      shieldType,
      heightTopPart: 300,
      numberOfSticks: 4,
      upperGrilleNetImage: '/upper.png',
      jumperPlacement: 'none',
      hasStolby: 0,
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
      shieldType: 'Тип_5',
      heightTopPart: 300,
      heightLowerPart: 200,
      numberOfSticks: 4,
      jumperPlacement: 'none',
      hasStolby: 0,
    })

    expect(geometry.rails.lower.visible).toBe(false)
    expect(geometry.fillArea.y + geometry.fillArea.height).toBe(900)
    expect(geometry.facadePickets[0]).toMatchObject({ y: 400, height: 500 })
  })

  it.each(['Вертикально', 'Горизонтально'])('keeps Type 5 %s pickets inside the gate when the upper height exceeds available space', (direction) => {
    const geometry = buildType3Geometry({
      widthProyema: 600,
      heightProyema: 1000,
      clearanceProyema: 50,
      shieldType: 'Тип_5',
      heightTopPart: 900,
      numberOfSticks: 4,
      raspolozheniyePolotna: direction,
      jumperPlacement: 'none',
      hasStolby: 0,
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
    const geometry = buildType3Geometry({ ...base, shieldType: 'Тип_2', upperGrilleNetImage: '/upper.png' })

    expect(geometry.upperNetArea.visible).toBe(false)
    expect(geometry.upperNetImage).toBe('')
  })
})
