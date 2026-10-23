import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'
import { buildType3Geometry } from './type3/type3Geometry'

const base = {
  widthProyema: 1000, heightProyema: 2000, clearanceProyema: 50,
  openingOrientation: { opensOutward: true, hingeSide: 'left' },
  hasStolby: 1, jumperPlacement: 'none', peremichkaSortamentName: '60/60/2',
}

describe.each([
  ['type1', computeType1Geometry, 60], ['type2', computeType2Geometry, 50], ['type3', buildType3Geometry, 50],
] as const)('%s explicit jumper geometry', (_name, build, frameSize) => {
  it.each([
    ['none', 1950, false, 'above'], ['above', 1885, true, 'above'], ['behind', 1950, true, 'behind'],
  ] as const)('uses %s regardless of captions and foreign keys', (jumperPlacement, height, visible, projection) => {
    for (const hasStolby of [0, '1']) {
      for (const peremichkaPolozheniyeName of ['Без перемычки', 'Перемычка за створкой', 'Переименовано', null]) {
        const geometry = build({ ...base, hasStolby, jumperPlacement, postProfile: hasStolby === '1' ? { sizeA: 50, sizeB: 50 } : null, jumperProfile: jumperPlacement === 'none' ? null : { sizeA: 60, sizeB: jumperPlacement === 'above' ? frameSize : 60 }, peremichkaPolozheniyeName, peremichkaPolozheniyeId: 1733 })
        expect(geometry.gate.height).toBe(height)
        expect(geometry.posts.visible).toBe(hasStolby === '1')
        expect(geometry.extraRail).toMatchObject({ visible, placement: projection })
      }
    }
  })

  it.each([null, undefined, '', true, false, 2, '01', '1tail', 'Со столбами'])('rejects invalid posts %j', hasStolby => {
    expect(() => build({ ...base, hasStolby })).toThrow()
  })

  it.each([null, undefined, '', 'Над створкой', 2])('rejects unresolved placement %j without guessing from caption', jumperPlacement => {
    expect(() => build({ ...base, jumperPlacement, peremichkaPolozheniyeName: 'Перемычка над створкой' })).toThrow()
  })

  it.each(['jumperPlacementProblem', 'postsPresenceProblem'])('refuses configured values with diagnostic %s', field => {
    expect(() => build({ ...base, [field]: { code: 'inactive', message: 'Выбор недоступен' } })).toThrow()
  })
})
