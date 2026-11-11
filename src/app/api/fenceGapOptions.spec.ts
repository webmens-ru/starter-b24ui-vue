import { expect, it } from 'vitest'
import { parseFenceGapOptions } from './fenceGapOptions'

it('keeps physical values independent of labels and strips legacy alias', () => {
  expect(parseFenceGapOptions([
    { id: 7, gapMm: 28, label: 'Любой зазор 999', name: 999, quantity: 8 },
    { id: 2, gapMm: 50, label: 'Любой зазор 999', quantity: 7 },
  ])).toEqual([
    { id: 7, gapMm: 28, label: 'Любой зазор 999', quantity: 8 },
    { id: 2, gapMm: 50, label: 'Любой зазор 999', quantity: 7 },
  ])
})

it.each([
  undefined, null, {},
  [{ id: 1, name: 28, quantity: 8 }],
  ...['id', 'quantity'].flatMap(key => [0, -1, 1.5, '28', true, null, Number.MAX_SAFE_INTEGER + 1]
    .map(value => [{ id: 1, gapMm: 28, label: 'Зазор', quantity: 8, [key]: value }])),
  ...['', '   ', null, 28].map(label => [{ id: 1, gapMm: 28, label, quantity: 8 }]),
  [{ id: 1, gapMm: 28, label: 'A', quantity: 8 }, { id: 1, gapMm: 50, label: 'B', quantity: 7 }],
])('rejects malformed gap response without caption fallback: %j', source => {
  expect(() => parseFenceGapOptions(source)).toThrow()
})

it('accepts an empty option list', () => {
  expect(parseFenceGapOptions([])).toEqual([])
})

it('accepts physical zero gap for butt laying independently of its caption', () => {
  expect(parseFenceGapOptions([{ id: 91, gapMm: 0, quantity: 10, label: 'Переименовано' }])[0]?.gapMm).toBe(0)
})

it('preserves structured butt trim metadata independently of captions', () => {
  const buttTrim = { mode: 'both', widthMm: 42, quantity: 2, requiresSide: false }
  expect(parseFenceGapOptions([{ id: 91, gapMm: 0, quantity: 10, label: 'Любая подпись', buttTrim }])[0]).toHaveProperty('buttTrim', buttTrim)
})

it('accepts zero physical quantity only for an unavailable butt layout', () => {
  const buttTrim = { mode: 'unavailable', widthMm: null, quantity: 0, requiresSide: false }
  expect(parseFenceGapOptions([{ id: 91, gapMm: 0, quantity: 0, label: 'Недоступно', buttTrim }])[0]?.quantity).toBe(0)
  expect(() => parseFenceGapOptions([{ id: 91, gapMm: 28, quantity: 0, label: 'Недоступно', buttTrim }])).toThrow()
})
