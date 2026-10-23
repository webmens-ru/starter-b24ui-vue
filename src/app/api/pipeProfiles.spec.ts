import { describe, expect, it } from 'vitest'
import { parsePipeOptions, parsePipeProfile, parsePipeProfileDescriptor } from './pipeProfiles'

describe('numeric pipe profile API boundary', () => {
  it('copies explicit canonical numbers without interpreting IDs or captions', () => {
    const source = { sizeA: 80, sizeB: 60 }
    const parsed = parsePipeProfile(source)
    source.sizeA = 199
    expect(parsed).toEqual({ sizeA: 80, sizeB: 60 })
    const parse = (id: number, name: string) => parsePipeOptions({ assortmentPipe: [
      { id, name, profile: { sizeA: 60, sizeB: 40 }, profileProblem: null },
    ] }, 'assortmentPipe')[0]
    expect(parse(707, 'Renamed 199/21').profile).toEqual(parse(819, '60/40/2').profile)
    expect(parse(707, 'Renamed 199/21').disabled).toBe(false)
  })

  it.each([null, undefined, {}, [], '60/40', { sizeA: '60', sizeB: 40 },
    { sizeA: 60, sizeB: true }, { sizeA: 40, sizeB: 60 }, { sizeA: 0, sizeB: 0 },
    { sizeA: -60, sizeB: 40 }, { sizeA: 60.5, sizeB: 40 }, { sizeA: Infinity, sizeB: 40 },
    { sizeA: Number.MAX_SAFE_INTEGER + 1, sizeB: 40 }, { sizeA: NaN, sizeB: 40 }])('rejects malformed dimensions %j', value => {
    expect(() => parsePipeProfile(value)).toThrow()
  })

  it('keeps unavailable options visible but never supplies a guessed usable profile', () => {
    const [option] = parsePipeOptions({ assortmentJumper: [
      { id: 707, name: '60/40/2', profile: null, profileProblem: { code: 'unavailable', message: 'Недоступна' } },
    ] }, 'assortmentJumper')
    expect(option).toEqual({ id: 707, name: '60/40/2', profile: null,
      profileProblem: { code: 'unavailable', message: 'Недоступна' }, disabled: true })
  })

  it.each([
    { id: 707, name: '60/40/2' },
    { id: 707, name: '60/40/2', profile: null, profileProblem: null },
    { id: 707, name: '60/40/2', profile: { sizeA: '60', sizeB: 40 }, profileProblem: null },
    { id: 707, name: '60/40/2', profile: { sizeA: 60, sizeB: 40 }, profileProblem: { code: 'invalid', message: 'Ошибка' } },
    { id: 707, name: '60/40/2', profile: null, profileProblem: { code: 'anything', message: 'Ошибка' } },
  ])('disables missing or conflicting metadata without parsing the label', row => {
    const [option] = parsePipeOptions({ assortmentPipe: [row] }, 'assortmentPipe')
    expect(option.profile).toBeNull()
    expect(option.profileProblem?.code).toBe('invalid')
    expect(option.disabled).toBe(true)
  })

  it.each([null, {}, { assortmentPipe: null }, { assortmentPipe: [{}] },
    { assortmentPipe: [{ id: '707', name: 'pipe' }] },
    { assortmentPipe: [{ id: 707, name: 'a' }, { id: 707, name: 'b' }] },
  ])('rejects malformed option envelopes and identities %j', value => {
    expect(() => parsePipeOptions(value, 'assortmentPipe')).toThrow()
  })

  it('requires no profile for unused or unresolved flags and preserves a valid server diagnostic', () => {
    expect(parsePipeProfileDescriptor('60/40', null, false)).toEqual({ profile: null, profileProblem: null })
    expect(parsePipeProfileDescriptor({ sizeA: 60, sizeB: 40 }, null, null)).toEqual({ profile: null, profileProblem: null })
    expect(parsePipeProfileDescriptor(null, { code: 'missing', message: 'Выберите трубу' }, true))
      .toEqual({ profile: null, profileProblem: { code: 'missing', message: 'Выберите трубу' } })
  })
})
