import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'
import { buildType3Geometry } from './type3/type3Geometry'

describe.each([
  ['type1', computeType1Geometry, 60], ['type2', computeType2Geometry, 50], ['type3', buildType3Geometry, 50],
] as const)('%s uses numeric pipe properties', (_name, build, frameSize) => {
  const base = {
    widthProyema: 1000, heightProyema: 2000, clearanceProyema: 50,
    openingOrientation: { opensOutward: true, hingeSide: 'left' },
    hasStolby: 1, jumperPlacement: 'above',
    postProfile: { sizeA: 60, sizeB: 40 }, postProfileProblem: null,
    jumperProfile: { sizeA: frameSize, sizeB: 30 }, jumperProfileProblem: null,
  }

  it('keeps projections independent of misleading names and unrelated IDs', () => {
    const geometry = build({ ...base, stolbName: '1000/1000', peremichkaSortamentName: '500/500' })
    expect(geometry.posts.left.width).toBe(frameSize === 60 ? 40 : 60)
    expect(geometry.extraRail.height).toBe(30)
    expect(geometry.gate.y).toBe(35)
    expect(geometry.gate.height).toBe(1915)
    expect(build({ ...base, stolbId: 9999, assortmentJumperId: 111, stolbName: 'Переименовано', peremichkaSortamentName: '' })).toEqual(geometry)
  })

  it.each(['postProfile', 'jumperProfile'])('refuses missing used %s instead of parsing captions', field => {
    expect(() => build({ ...base, [field]: null, stolbName: '60/60', peremichkaSortamentName: '60/60' })).toThrow()
  })

  it.each(['postProfileProblem', 'jumperProfileProblem'])('refuses diagnosed %s', field => {
    expect(() => build({ ...base, [field]: { code: 'invalid', message: 'Ошибка профиля' } })).toThrow()
  })

  it('uses zero dimensions for unused pipes, not plausible defaults', () => {
    const g = build({ ...base, hasStolby: 0, jumperPlacement: 'none', postProfile: null, jumperProfile: null })
    expect(g.posts.left.width).toBe(0)
    expect(g.posts.visible).toBe(false)
    expect(g.extraRail.height).toBe(0)
    expect(g.extraRail.visible).toBe(false)
  })
})
