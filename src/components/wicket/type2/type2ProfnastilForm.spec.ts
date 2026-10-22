import { describe, expect, it } from 'vitest'
import { getPrintechSelectItems, getProfnastilColorMode } from './type2ProfnastilForm'

describe('getProfnastilColorMode', () => {
  it.each(['list', 'combobox', 'none'] as const)(
    'uses explicit contract mode %s',
    mode => expect(getProfnastilColorMode(mode)).toBe(mode),
  )
  it.each([undefined, null, '', 'Глянец', 'Printech', 'Оцинковка', 'LIST', ' list ', 0, {}])(
    'rejects unknown or missing mode %s instead of guessing from a label',
    mode => expect(() => getProfnastilColorMode(mode)).toThrow(),
  )
})

describe('getPrintechSelectItems', () => {
  it('keeps a custom value separate from equal dictionary labels', () => {
    expect(getPrintechSelectItems([{ id: 603, label: 'Цвет' }, { id: 604, label: 'Цвет' }], 'Цвет')).toEqual([
      { id: 603, label: 'Цвет' },
      { id: 604, label: 'Цвет' },
      { id: 'custom:Цвет', label: 'Цвет' },
    ])
  })
})
