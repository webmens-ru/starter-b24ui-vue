import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'

describe.each([['Type1', computeType1Geometry], ['Type2', computeType2Geometry]] as const)('%s opening geometry', (_, compute) => {
  it.each([
    { opensOutward: true, hingeSide: 'left' as const, x: 54, hingeX: 44 },
    { opensOutward: true, hingeSide: 'right' as const, x: 60, hingeX: 940 },
    { opensOutward: false, hingeSide: 'left' as const, x: 54, hingeX: 44 },
    { opensOutward: false, hingeSide: 'right' as const, x: 60, hingeX: 940 },
  ])('uses explicit properties: $opensOutward / $hingeSide', ({ opensOutward, hingeSide, x, hingeX }) => {
    const source = { widthProyema: 1000, heightProyema: 2000, openingOrientation: { opensOutward, hingeSide } }
    const geometry = compute({ ...source, openingOptionName: 'Переименовано' })
    expect(geometry.gate.x).toBe(x)
    expect(geometry.hinges[0]?.x).toBe(hingeX)
    expect(compute({ ...source, openingOptionName: 'Внутрь / Правая' })).toEqual(geometry)
  })

  it.each([undefined, null, {}, { opensOutward: 'false', hingeSide: 'left' }])('rejects missing or malformed orientation: %j', openingOrientation => {
    expect(() => compute({ openingOrientation, openingOptionName: 'Наружу / Левая' })).toThrow()
  })
})
