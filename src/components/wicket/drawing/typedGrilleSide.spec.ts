import { describe, expect, it } from 'vitest'
import { computeType1Geometry } from './type1/type1Geometry'
import { computeType2Geometry } from './type2/type2Geometry'

const base = { widthProyema: 1000, heightProyema: 2000, hasStolby: 0,
  openingOrientation: { opensOutward: true, hingeSide: 'left' as const },
  jumperPlacement: 'none' as const, postProfile: null, jumperProfile: null,
  raspolozheniyePolotna: 'vertical', shieldType: 'sideNet', widthSidePart: 150 }

describe('current drawing side uses semantic properties', () => {
  it.each(['left', 'right'] as const)('places hinge/lock net using %s physical hinges', hingeSide => {
    for (const calculate of [computeType1Geometry, computeType2Geometry]) {
      const values = { ...base, openingOrientation: { opensOutward: false, hingeSide } }
      const hinge = calculate({ ...values, grilleLocation: 'hinge' })
      const lock = calculate({ ...values, grilleLocation: 'lock' })
      expect(hinge.netArea.width).toBe(150)
      expect(lock.netArea.width).toBe(150)
      if (hingeSide === 'left') expect(lock.netArea.x).toBeGreaterThan(hinge.netArea.x)
      else expect(lock.netArea.x).toBeLessThan(hinge.netArea.x)
    }
  })
  it.each(['', null, 'Возле замка', 'нестандартно замк', ' lock ', true])('rejects explicit invalid active side %s', value => {
    for (const calculate of [computeType1Geometry, computeType2Geometry]) {
      expect(() => calculate({ ...base, grilleLocation: value })).toThrow('grilleSideCode')
      expect(() => calculate({ ...base, shieldType: 'noNet', grilleLocation: value })).not.toThrow()
    }
  })
})
