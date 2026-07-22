import { describe, expect, it } from 'vitest'
import { resolveFillingType } from './fillingTypes'

describe('resolveFillingType', () => {
  it.each([
    ['Профлист', 'С-8', 'c8'],
    ['Профлист', 'Профнастил С-20', 'c20'],
    ['Профлист', 'Профнастил МП-10', 'mp10'],
    ['Профлист', 'Профнастил МП-20', 'mp20'],
    ['Сайдинг', 'Сайдинг «Бревно»', 'logSiding'],
    ['Сайдинг', 'Корабельная доска', 'shipLap'],
    ['Сайдинг', 'Сайдинг «Корабельная доска»', 'shipLap'],
  ] as const)('%s / %s → %s', (group, name, expected) => {
    expect(resolveFillingType(group, name)).toBe(expected)
  })

  it('не подменяет неизвестный профлист профилем С8', () => {
    expect(resolveFillingType('Профлист', 'НС-35')).toBe('none')
  })
})
