import { describe, expect, it } from 'vitest'
import { parseDrawingPipeProfiles } from './pipeProfiles'

const source = {
  hasStolby: 1, postsPresenceProblem: null,
  jumperPlacement: 'behind', jumperPlacementProblem: null,
  postProfile: { sizeA: 60, sizeB: 40 }, postProfileProblem: null,
  jumperProfile: { sizeA: 80, sizeB: 60 }, jumperProfileProblem: null,
}

describe('numeric pipe drawing projections', () => {
  it.each([
    [60, { sizeA: 60, sizeB: 40 }, { sizeA: 80, sizeB: 60 }, [40, 60, 60, 60, 80, 80, 60]],
    [50, { sizeA: 60, sizeB: 40 }, { sizeA: 50, sizeB: 25 }, [60, 40, 60, 40, 25, 50, 25]],
    [50, { sizeA: 80, sizeB: 80 }, { sizeA: 50, sizeB: 50 }, [80, 80, 80, 80, 50, 50, 50]],
    [60, { sizeA: 201, sizeB: 1 }, { sizeA: 1, sizeB: 1 }, [201, 1, 201, 1, 1, 1, 1]],
  ] as const)('matches BE numeric projection matrix with frame %s', (frameSize, postProfile, jumperProfile, want) => {
    const p = parseDrawingPipeProfiles({ ...source, postProfile, jumperProfile }, frameSize)
    expect([p.postWidth, p.postDepth, p.lowerPostDepth, p.postPlugDepth, p.jumperFaceSize, p.rearJumperHeight, p.rearJumperDepth]).toEqual(want)
  })

  it('never reads names or semantic IDs to calculate projections', () => {
    const renamed = { ...source, stolbName: '1000/1000', peremichkaSortamentName: 'Не труба', stolbId: 9999 }
    expect(parseDrawingPipeProfiles(renamed, 60)).toEqual({ hasPosts: true, placement: 'behind', postWidth: 40, postDepth: 60, lowerPostDepth: 60, postPlugDepth: 60, jumperFaceSize: 80, rearJumperHeight: 80, rearJumperDepth: 60, overheadJumperHeight: 0 })
  })

  it.each([[60, 40, 40], [80, 60, 80], [60, 60, 60]])('uses the BE overhead cross-section rule %sx%s => %s', (sizeA, sizeB, height) => {
    expect(parseDrawingPipeProfiles({ ...source, jumperPlacement: 'above', jumperProfile: { sizeA, sizeB } }, 60).overheadJumperHeight).toBe(height)
  })

  it('rejects an incompatible overhead section instead of displaying a guessed height', () => {
    expect(() => parseDrawingPipeProfiles({ ...source, jumperPlacement: 'above', jumperProfile: { sizeA: 80, sizeB: 40 } }, 60)).toThrow()
  })

  it('has zero projections for explicitly unused pipes', () => {
    expect(parseDrawingPipeProfiles({ ...source, hasStolby: 0, jumperPlacement: 'none', postProfile: null, jumperProfile: null }, 60)).toEqual({ hasPosts: false, placement: 'none', postWidth: 0, postDepth: 0, lowerPostDepth: 0, postPlugDepth: 0, jumperFaceSize: 0, rearJumperHeight: 0, rearJumperDepth: 0, overheadJumperHeight: 0 })
  })

  it.each([null, undefined, { sizeA: '60', sizeB: 40 }, { sizeA: 0, sizeB: 0 }, { sizeA: 40, sizeB: 60 }, { sizeA: 60, sizeB: 1.5 }])('rejects malformed used profile %j', postProfile => {
    expect(() => parseDrawingPipeProfiles({ ...source, postProfile }, 60)).toThrow()
  })

  it.each(['postProfileProblem', 'jumperProfileProblem', 'postsPresenceProblem', 'jumperPlacementProblem'])('rejects diagnostics %s', field => {
    expect(() => parseDrawingPipeProfiles({ ...source, [field]: { code: 'invalid', message: 'Недостоверные свойства' } }, 60)).toThrow()
  })

  it.each([
    { hasStolby: null }, { jumperPlacement: null },
    { hasStolby: 0 }, { jumperPlacement: 'none' },
  ])('rejects unknown flags or non-null unused profiles %j', flags => {
    expect(() => parseDrawingPipeProfiles({ ...source, ...flags }, 60)).toThrow()
  })
})
