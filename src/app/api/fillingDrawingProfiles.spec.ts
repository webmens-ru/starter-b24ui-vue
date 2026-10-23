import { expect, it } from 'vitest'
import { parseFillingDrawingDescriptor } from './fillingDrawingProfiles'

it.each(['c8', 'c20', 'mp10', 'mp20', 'logSiding', 'shipLap'])('accepts explicit technical kind %s independently of captions', kind => {
  const source = { kind, name: 'Произвольная подпись' }
  expect(parseFillingDrawingDescriptor(source, null)).toEqual({ profile: { kind }, problem: null })
})

it.each([undefined, [], 'С8', 'c8', {}, { kind: 'С8' }, { kind: 'C8' }, { kind: ' c8' }, { kind: 1 }, { kind: true }, { kind: 'unknown' }])('does not invent a renderer from invalid profile %j', profile => {
  expect(parseFillingDrawingDescriptor(profile, null)).toMatchObject({ profile: null, problem: { code: 'invalid' } })
})

it.each(['missing', 'unavailable', 'invalid'])('retains authoritative diagnostic %s', code => {
  expect(parseFillingDrawingDescriptor(null, { code, message: 'Пояснение' }))
    .toEqual({ profile: null, problem: { code, message: 'Пояснение' } })
})

it.each([undefined, {}, [], { code: 'unknown', message: 'Пояснение' }, { code: 'missing', message: '' }])('rejects malformed diagnostics %j', problem => {
  expect(parseFillingDrawingDescriptor(null, problem)).toMatchObject({ profile: null, problem: { code: 'invalid' } })
})

it('rejects conflicting profile and diagnostic instead of keeping a usable renderer', () => {
  expect(parseFillingDrawingDescriptor({ kind: 'c8' }, { code: 'missing', message: 'Не настроен' }))
    .toMatchObject({ profile: null, problem: { code: 'invalid' } })
})

it('preserves explicit empty selection without guessing a profile', () => {
  expect(parseFillingDrawingDescriptor(null, null)).toEqual({ profile: null, problem: null })
})
