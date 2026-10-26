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
  ...['id', 'gapMm', 'quantity'].flatMap(key => [0, -1, 1.5, '28', true, null, Number.MAX_SAFE_INTEGER + 1]
    .map(value => [{ id: 1, gapMm: 28, label: 'Зазор', quantity: 8, [key]: value }])),
  ...['', '   ', null, 28].map(label => [{ id: 1, gapMm: 28, label, quantity: 8 }]),
  [{ id: 1, gapMm: 28, label: 'A', quantity: 8 }, { id: 1, gapMm: 50, label: 'B', quantity: 7 }],
])('rejects malformed gap response without caption fallback: %j', source => {
  expect(() => parseFenceGapOptions(source)).toThrow()
})

it('accepts an empty option list', () => {
  expect(parseFenceGapOptions([])).toEqual([])
})
