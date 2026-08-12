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
      colorFacadeHex: '#704214',
      colorFacadeImage: '  /uploads/colors/wood.webp  ',
      colorFacadeReverseHex: '#D7D5C6',
      colorFacadeReverseImage: '  /uploads/colors/reverse.webp  ',
      sideGrilleNetImage: '  /uploads/nets/side.webp  ',
      raspolozheniyePolotna: 'Вертикально',
    })

    expect(geometry.drawing).toEqual({ width: 1250, height: 2300 })
    expect(geometry.posts.visible).toBe(false)
    expect(geometry.posts.left.width).toBe(60)
    expect(geometry.gate).toEqual({ x: 10, y: 0, width: 1236, height: 2225 })
    expect(geometry.hingeSide).toBe('right')
    expect(geometry.subtype).toBe('type4')
    expect(geometry.rails.verticalSubtype.width).toBe(50)
    expect(geometry.netArea.visible).toBe(true)
    expect(geometry.netArea.width).toBeGreaterThan(0)
    expect(geometry.netImage).toBe('/uploads/nets/side.webp')
    expect(geometry.extraRail).toMatchObject({ visible: true, placement: 'behind', height: 40 })
    expect(geometry.fill).toEqual({
      material: 'c8',
      color: '#704214',
      image: '/uploads/colors/wood.webp',
      reverseColor: '#D7D5C6',
      reverseImage: '/uploads/colors/reverse.webp',
      direction: 'vertical',
    })
  })

  it.each([
    ['60/60/2', 60],
    ['80/80/3', 80],
    ['50/100/3', 100],
    ['60/100/3', 60],
    ['Труба 50×80×3', 80],
    ['Труба 100×100×4', 100],
  ])('берёт ширину столба из маркировки %s', (stolbName, expectedWidth) => {
    const geometry = computeType2Geometry({ stolbName, hasStolby: 1 })

    expect(geometry.posts.left.width).toBe(expectedWidth)
    expect(geometry.posts.right.width).toBe(expectedWidth)
  })

  it.each([
    ['50/100/3', 100],
    ['60/30/2', 60],
    ['Труба 50×80×3', 80],
  ])('берёт видимую высоту перемычки из маркировки %s', (peremichkaSortamentName, expectedHeight) => {
    const geometry = computeType2Geometry({
      peremichkaPolozheniyeName: 'Над калиткой',
      peremichkaSortamentName,
    })

    expect(geometry.extraRail.height).toBe(expectedHeight)
    expect(geometry.drawing).toEqual({ width: 1000, height: 2000 })
    expect(geometry.opening).toEqual({ x: 0, y: 0, width: 1000, height: 2000 })
    expect(geometry.gate).toEqual({ x: 54, y: 0, width: 886, height: 1950 })
    expect(geometry.posts.left).toEqual({ x: 0, y: 0, width: 50, height: 2000 })
    expect(geometry.posts.right).toEqual({ x: 950, y: 0, width: 50, height: 2000 })
    expect(geometry.extraRail).toMatchObject({ x: 0, y: 0, width: 1000, visible: true, placement: 'above' })
  })

  it('uses only a valid explicit HEX and falls back safely', () => {
    expect(computeType2Geometry({
      colorFacade: 'RAL 7016',
      colorFacadeHex: '#A1b2C3',
    }).fill.color).toBe('#A1b2C3')

    expect(computeType2Geometry({
      colorFacade: 'RAL 7016',
      colorFacadeHex: 'A1b2C3',
    }).fill.color).toBe('#A1b2C3')

    expect(computeType2Geometry({
      colorFacade: 'RAL 7016',
      colorFacadeHex: '#123',
    }).fill.color).toBe('')

    expect(computeType2Geometry({ colorFacade: 'RAL 7016' }).fill.color).toBe('')
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
    if (subtype === 'type2' || subtype === 'type3') {
      expect(geometry.rails.lowerSubtype.height).toBe(50)
    }
    if (subtype === 'type3') {
      expect(geometry.rails.upperSubtype.height).toBe(50)
    }
  })

  it.each(['Тип_2', 'Тип_3'])('выделяет нижнюю область сетки для %s', (shieldType) => {
    const geometry = computeType2Geometry({
      shieldType,
      heightLowerPart: '300',
      lowerGrilleNetImage: '/uploads/nets/lower.webp',
    })

    expect(geometry.netArea.visible).toBe(true)
    expect(geometry.netArea.width).toBeGreaterThan(0)
    expect(geometry.netArea.height).toBeGreaterThan(0)
    expect(geometry.netArea.y).toBeGreaterThan(geometry.rails.lowerSubtype.y)
    expect(geometry.netImage).toBe('/uploads/nets/lower.webp')
  })

  it('выделяет верхнюю область сетки только для подтипа 3', () => {
    const geometry = computeType2Geometry({
      shieldType: 'Тип_3',
      heightTopPart: '300',
      upperGrilleNetImage: '/uploads/nets/upper.webp',
    })

    expect(geometry.upperNetArea.visible).toBe(true)
    expect(geometry.upperNetArea.width).toBeGreaterThan(0)
    expect(geometry.upperNetArea.height).toBeGreaterThan(0)
    expect(geometry.upperNetArea.y).toBe(geometry.gate.y + 50)
    expect(geometry.upperNetImage).toBe('/uploads/nets/upper.webp')

    expect(computeType2Geometry({
      shieldType: 'Тип_2',
      upperGrilleNetImage: '/uploads/nets/upper.webp',
    }).upperNetArea.visible).toBe(false)
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
