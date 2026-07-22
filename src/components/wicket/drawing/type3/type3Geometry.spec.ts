import { describe, expect, it } from 'vitest'
import { buildType3Geometry } from './type3Geometry'

const base = {
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
  it('uses 1000/2000/50 as the initial opening before dimensions are filled', () => {
    const geometry = buildType3Geometry({
      widthProyema: '',
      heightProyema: '',
      clearanceProyema: '',
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

  it.each([
    ['Тип_1', false, false, false],
    ['Тип_2', true, false, false],
    ['Тип_3', true, true, false],
    ['Тип_4', false, false, true],
  ] as const)('maps %s to its internal rails', (shieldType, lower, upper, vertical) => {
    const rails = buildType3Geometry({ ...base, shieldType }).rails
    expect(rails.lower.visible).toBe(lower)
    expect(rails.upper.visible).toBe(upper)
    expect(rails.vertical.visible).toBe(vertical)
  })
})
