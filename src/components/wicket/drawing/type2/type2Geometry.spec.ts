import { describe, expect, it } from 'vitest'

import { computeType2Geometry } from './type2Geometry'

describe('computeType2Geometry', () => {
  it('строит безопасную конфигурацию MVP для пустых полей формы', () => {
    const geometry = computeType2Geometry({})

    expect(geometry.drawing).toEqual({ width: 1000, height: 2000 })
    expect(geometry.gate).toEqual({ x: 54, y: 0, width: 886, height: 1950 })
    expect(geometry.posts.left.width).toBe(50)
    expect(geometry.posts.visible).toBe(true)
    expect(geometry.subtype).toBe('type1')
    expect(geometry.hingeSide).toBe('left')
    expect(geometry.fill.material).toBe('none')
  })

  it('напрямую сопоставляет заполненные поля формы', () => {
    const geometry = computeType2Geometry({
      widthProyema: '1250',
      heightProyema: '2300',
      clearanceProyema: '75',
      hasStolby: 0,
      stolbName: 'Труба 60×60×2',
      openingOptionName: 'Внутрь / Правая',
      shieldType: 'Тип_4',
      heightLowerPart: '410',
      heightTopPart: '275',
      widthSidePart: '360',
      grilleLocation: 'Возле замка',
      peremichkaPolozheniyeName: 'За калиткой',
      peremichkaSortamentName: 'Труба 40×20',
      materialFacadeGlob: 'Профлист',
      materialFacade: 'С-8',
      colorFacade: 'RAL 7016',
      raspolozheniyePolotna: 'Вертикально',
    })

    expect(geometry.drawing).toEqual({ width: 1250, height: 2300 })
    expect(geometry.posts.visible).toBe(false)
    expect(geometry.posts.left.width).toBe(60)
    expect(geometry.gate).toEqual({ x: 10, y: 0, width: 1236, height: 2225 })
    expect(geometry.hingeSide).toBe('right')
    expect(geometry.subtype).toBe('type4')
    expect(geometry.rails.verticalSubtype.width).toBe(60)
    expect(geometry.extraRail).toMatchObject({ visible: true, placement: 'behind', height: 40 })
    expect(geometry.fill).toEqual({ material: 'c8', color: '#383e42', direction: 'vertical' })
  })

  it.each([
    ['Тип_1', 'type1'],
    ['Тип_2', 'type2'],
    ['Тип_3', 'type3'],
    ['Тип_4', 'type4'],
  ] as const)('строит геометрию подтипа %s', (shieldType, subtype) => {
    const geometry = computeType2Geometry({ shieldType })

    expect(geometry.subtype).toBe(subtype)
    expect(geometry.rails.lowerSubtype.visible).toBe(subtype === 'type2' || subtype === 'type3')
    expect(geometry.rails.upperSubtype.visible).toBe(subtype === 'type3')
    expect(geometry.rails.verticalSubtype.visible).toBe(subtype === 'type4')
  })

  it('не возвращает отрицательные размеры для предельных значений', () => {
    const geometry = computeType2Geometry({
      widthProyema: '-10',
      heightProyema: '100',
      clearanceProyema: '9999',
      widthSidePart: '9999',
      heightLowerPart: '9999',
      heightTopPart: '9999',
    })

    const rects = [
      geometry.drawing,
      geometry.opening,
      geometry.gate,
      geometry.fillArea,
      ...Object.values(geometry.innerFrame),
      geometry.rails.lowerSubtype,
      geometry.rails.upperSubtype,
      geometry.rails.verticalSubtype,
      geometry.rails.centerFill,
    ]

    for (const rect of rects) {
      expect(rect.width).toBeGreaterThanOrEqual(0)
      expect(rect.height).toBeGreaterThanOrEqual(0)
    }
  })
})
