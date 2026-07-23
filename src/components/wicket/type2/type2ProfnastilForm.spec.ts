import { describe, expect, it } from 'vitest'
import { getPrintechSelectItems, getProfnastilColorMode } from './type2ProfnastilForm'

describe('getProfnastilColorMode', () => {
  it.each(['Глянец', 'Глянец двухсторонний', 'Матовый', 'Матовый двусторонний'])(
    'requires a dictionary color for %s',
    (coating) => expect(getProfnastilColorMode(coating)).toBe('list'),
  )

  it.each(['Printech', 'Printech двусторонний'])(
    'allows a list or manual value for %s',
    (coating) => expect(getProfnastilColorMode(coating)).toBe('combobox'),
  )

  it('does not request color for another coating', () => {
    expect(getProfnastilColorMode('Оцинковка')).toBe('none')
  })
})

describe('getPrintechSelectItems', () => {
  it('keeps a custom Printech name available for InputMenu display', () => {
    expect(getPrintechSelectItems(['Дуб', 'Орех'], 'Камень тёмный')).toEqual([
      'Дуб',
      'Орех',
      'Камень тёмный',
    ])
  })
})
