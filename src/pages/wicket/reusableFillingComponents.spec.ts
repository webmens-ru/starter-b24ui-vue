import { describe, expect, it } from 'vitest'
import type9 from './Type9.vue?raw'
import type10 from './Type10.vue?raw'
import type11 from './Type11.vue?raw'
import sidingYard from '../../components/wicket/type1/SidingYard.vue?raw'
import profnastilYard from '../../components/wicket/type1/ProfnastilYard.vue?raw'

describe('reusable filling components', () => {
  it.each([
    ['type 9', type9],
    ['type 10', type10],
    ['type 11', type11],
  ])('reuses the color-aware profnastil component in %s', (_type, source) => {
    expect(source).toContain("components/wicket/type1/ProfnastilFacade.vue")
  })

  it.each([
    ['siding yard', sidingYard],
    ['profnastil yard', profnastilYard],
  ])('exposes required-color validation to wizard navigation for %s', (_type, source) => {
    expect(source).toContain('defineExpose({ validateBeforeLeave })')
  })
})
