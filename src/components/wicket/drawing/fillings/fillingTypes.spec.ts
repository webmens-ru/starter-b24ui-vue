import { describe, expect, it } from 'vitest'
import { resolveFillingType } from './fillingTypes'

describe('resolveFillingType', () => {
  it.each([
    'c8', 'c20', 'mp10', 'mp20', 'logSiding', 'shipLap',
  ] as const)('selects only explicit technical kind %s', kind => {
    expect(resolveFillingType({ kind })).toBe(kind)
  })

  it.each([null, undefined, {}, 'С-8', { kind: 'unknown' }, { kind: 'С-8' }])('never guesses a renderer for invalid profile %j', profile => {
    expect(resolveFillingType(profile)).toBeNull()
  })

  it('ignores any display caption attached to the same explicit kind', () => {
    expect(resolveFillingType({ kind: 'c20', name: 'Сайдинг Бревно' })).toBe('c20')
    expect(resolveFillingType({ kind: 'c20', name: 'Переименовано' })).toBe('c20')
  })
})
