import { describe, expect, it } from 'vitest'

import { computeJumperGeometry, resolveJumperPresentation } from './jumperGeometry'

describe('computeJumperGeometry', () => {
  it('опускает створку и столбы под верхнюю перемычку и зазор 5 мм', () => {
    expect(computeJumperGeometry({
      openingHeight: 2000,
      bottomClearance: 50,
      hasPosts: true,
      jumperName: 'Над калиткой',
      jumperHeight: 60,
    })).toEqual({
      visible: true,
      placement: 'above',
      railY: 0,
      gateY: 65,
      gateHeight: 1885,
      postY: 65,
      postHeight: 1935,
    })
  })

  it('не меняет вертикальную геометрию для перемычки за калиткой', () => {
    expect(computeJumperGeometry({
      openingHeight: 2000,
      bottomClearance: 50,
      hasPosts: true,
      jumperName: 'За калиткой',
      jumperHeight: 60,
    })).toEqual({
      visible: true,
      placement: 'behind',
      railY: 0,
      gateY: 0,
      gateHeight: 1950,
      postY: 0,
      postHeight: 2000,
    })
  })

  it('нормализует отсутствие перемычки и столбов', () => {
    expect(computeJumperGeometry({
      openingHeight: 40,
      bottomClearance: 50,
      hasPosts: false,
      jumperName: 'Без перемычки',
      jumperHeight: 60,
    })).toMatchObject({ visible: false, gateHeight: 0, postHeight: 0 })
  })
})

describe('resolveJumperPresentation', () => {
  it('показывает заднюю перемычку фоном с улицы и передним планом со двора', () => {
    expect(resolveJumperPresentation('behind', 'street'))
      .toEqual({ layer: 'background', dashed: true })
    expect(resolveJumperPresentation('behind', 'yard'))
      .toEqual({ layer: 'foreground', dashed: false })
    expect(resolveJumperPresentation('above', 'street'))
      .toEqual({ layer: 'foreground', dashed: false })
  })
})
