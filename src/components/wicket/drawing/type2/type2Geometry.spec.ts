import { describe, expect, it } from 'vitest'

import { computeType2Geometry } from './type2Geometry'

describe('computeType2Geometry', () => {
  it('использует размеры по умолчанию при явных свойствах открытия', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' }, jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 })

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
      postProfile: null, hasStolby: 0,
      stolbName: 'Труба 60×60×2',
      openingOptionName: 'Произвольная подпись',
      openingOrientation: { opensOutward: false, hingeSide: 'right' },
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
      jumperProfile: { sizeA: 40, sizeB: 20 }, jumperPlacement: 'behind',
    })

    expect(geometry.drawing).toEqual({ width: 1250, height: 2300 })
    expect(geometry.posts.visible).toBe(false)
    expect(geometry.posts.left.width).toBe(0)
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
    ['60/60/2', { sizeA: 60, sizeB: 60 }, 60],
    ['80/80/3', { sizeA: 80, sizeB: 80 }, 80],
    ['50/100/3', { sizeA: 100, sizeB: 50 }, 100],
    ['60/100/3', { sizeA: 100, sizeB: 60 }, 100],
    ['Труба 50×80×3', { sizeA: 80, sizeB: 50 }, 80],
    ['Труба 100×100×4', { sizeA: 100, sizeB: 100 }, 100],
  ])('берёт ширину из свойств независимо от подписи %s', (stolbName, postProfile, expectedWidth) => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' }, stolbName, postProfile, hasStolby: 1 , jumperProfile: null, jumperPlacement: 'none' })

    expect(geometry.posts.left.width).toBe(expectedWidth)
    expect(geometry.posts.right.width).toBe(expectedWidth)
  })

  it.each([
    ['50/100/3', { sizeA: 100, sizeB: 50 }, 100],
    ['60/30/2', { sizeA: 60, sizeB: 30 }, 60],
    ['Труба 50×80×3', { sizeA: 80, sizeB: 50 }, 80],
  ])('берёт видимую высоту из свойств независимо от подписи %s', (peremichkaSortamentName, jumperProfile, expectedHeight) => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      peremichkaPolozheniyeName: 'За калиткой',
      peremichkaSortamentName,
      jumperProfile, jumperPlacement: 'behind',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.extraRail.height).toBe(expectedHeight)
    expect(geometry.extraRail).toMatchObject({ x: 0, y: 0, width: 1000, visible: true, placement: 'behind' })
  })

  it('сдвигает створку и столбы ниже верхней перемычки', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      heightProyema: '2000',
      clearanceProyema: '50',
      peremichkaPolozheniyeName: 'Над калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperProfile: { sizeA: 60, sizeB: 50 }, jumperPlacement: 'above',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.gate).toMatchObject({ y: 65, height: 1885 })
    expect(geometry.posts.left).toMatchObject({ y: 65, height: 1935 })
    expect(geometry.extraRail).toMatchObject({ y: 0, height: 60, placement: 'above' })
  })

  it('сохраняет вертикальную геометрию для задней перемычки', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      heightProyema: '2000',
      clearanceProyema: '50',
      peremichkaPolozheniyeName: 'За калиткой',
      peremichkaSortamentName: '60/60/2',
      jumperProfile: { sizeA: 60, sizeB: 60 }, jumperPlacement: 'behind',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.gate.y).toBe(0)
    expect(geometry.gate.height).toBe(1950)
    expect(geometry.extraRail.y).toBe(0)
  })

  it('uses only a valid explicit HEX and falls back safely', () => {
    expect(computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      colorFacade: 'RAL 7016',
      colorFacadeHex: '#A1b2C3',
     jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 }).fill.color).toBe('#A1b2C3')

    expect(computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      colorFacade: 'RAL 7016',
      colorFacadeHex: 'A1b2C3',
     jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 }).fill.color).toBe('#A1b2C3')

    expect(computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      colorFacade: 'RAL 7016',
      colorFacadeHex: '#123',
     jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 }).fill.color).toBe('')

    expect(computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' }, colorFacade: 'RAL 7016' , jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 }).fill.color).toBe('')
  })

  it.each([
    ['Тип_1', 'type1'],
    ['Тип_2', 'type2'],
    ['Тип_3', 'type3'],
    ['Тип_4', 'type4'],
  ] as const)('строит геометрию подтипа %s', (shieldType, subtype) => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' }, shieldType , jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 })

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
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      shieldType,
      heightLowerPart: '300',
      lowerGrilleNetImage: '/uploads/nets/lower.webp',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.netArea.visible).toBe(true)
    expect(geometry.netArea.width).toBeGreaterThan(0)
    expect(geometry.netArea.height).toBeGreaterThan(0)
    expect(geometry.netArea.y).toBeGreaterThan(geometry.rails.lowerSubtype.y)
    expect(geometry.netImage).toBe('/uploads/nets/lower.webp')
  })

  it('строит только верхнюю сетку и положительное заполнение Тип_5 при 600×1000', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      widthProyema: 600,
      heightProyema: 1000,
      shieldType: 'Тип_5',
      heightTopPart: 300,
      upperGrilleNetImage: '/u.png',
      lowerGrilleNetImage: '/l.png',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.subtype).toBe('type5')
    expect(geometry.rails.upperSubtype.visible).toBe(true)
    expect(geometry.rails.lowerSubtype.visible).toBe(false)
    expect(geometry.rails.verticalSubtype.visible).toBe(false)
    expect(geometry.upperNetArea.visible).toBe(true)
    expect(geometry.netArea.visible).toBe(false)
    expect(geometry.upperNetImage).toBe('/u.png')
    expect(geometry.netImage).toBe('')
    expect(geometry.fillArea.y).toBe(geometry.rails.upperSubtype.y + geometry.rails.upperSubtype.height)
    expect(geometry.fillArea.width).toBeGreaterThan(0)
    expect(geometry.fillArea.height).toBeGreaterThan(0)
  })

  it('выделяет верхнюю область сетки для подтипа 3', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      shieldType: 'Тип_3',
      heightTopPart: '300',
      upperGrilleNetImage: '/uploads/nets/upper.webp',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
    })

    expect(geometry.upperNetArea.visible).toBe(true)
    expect(geometry.upperNetArea.width).toBeGreaterThan(0)
    expect(geometry.upperNetArea.height).toBeGreaterThan(0)
    expect(geometry.upperNetArea.y).toBe(geometry.gate.y + 50)
    expect(geometry.upperNetImage).toBe('/uploads/nets/upper.webp')

    expect(computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      shieldType: 'Тип_2',
      upperGrilleNetImage: '/uploads/nets/upper.webp',
     jumperProfile: null, jumperPlacement: 'none', postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1 }).upperNetArea.visible).toBe(false)
  })

  it('не возвращает отрицательные размеры для предельных значений', () => {
    const geometry = computeType2Geometry({openingOrientation: { opensOutward: true, hingeSide: 'left' },
      widthProyema: '-10',
      heightProyema: '100',
      clearanceProyema: '9999',
      widthSidePart: '9999',
      heightLowerPart: '9999',
      heightTopPart: '9999',
      jumperProfile: null, jumperPlacement: 'none',
      postProfile: { sizeA: 50, sizeB: 50 }, hasStolby: 1,
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
