import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'

describe('persisted filling recalculation requirement', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  function setup() {
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '3'
    calc.fillSide.value = 2
    calc.idFacade.value = 91
    calc.idYard.value = 92
    return calc
  }
  it('preserves materials while marking geometry dirty and ignores an older acknowledgement', () => {
    const calc = setup()
    const complete = calc.beginCoverStripMutation()
    calc.markFillingForRecalculation()
    complete({ lockVersion: 2, fillingNeedsRecalculation: false })
    expect(calc.fillingNeedsRecalculation.value).toBe(true)
    expect(calc.idFacade.value).toBe(91)
    expect(calc.idYard.value).toBe(92)
    calc.beginCoverStripMutation()({ lockVersion: 3, fillingNeedsRecalculation: false })
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
  })
  it('does not mark filling absent or clear the requirement from a previous position response', () => {
    const calc = setup()
    calc.fillSide.value = 0
    calc.markFillingForRecalculation()
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
    const complete = calc.beginCoverStripMutation()
    calc.productRowId.value = 8
    complete({ lockVersion: 5, fillingNeedsRecalculation: true })
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
  })
  it('loads partial readiness and preserves the facade through yard drafts and acknowledgements', () => {
    const calc = setup()
    calc.loadFromApi({ modelId: '3', fillingNeedsRecalculation: true, fillingFacadeReady: true, fillingYardReady: false, lockVersion: 4 })
    expect(calc.fillingFacadeReady.value).toBe(true)
    calc.invalidateFillingPreview('yard')
    expect(calc.fillingFacadeReady.value).toBe(true)
    expect(calc.fillingYardReady.value).toBe(false)
    const complete = calc.beginCoverStripMutation()
    complete({ lockVersion: 5, fillingNeedsRecalculation: true, fillingFacadeReady: true, fillingYardReady: true })
    expect(calc.fillingYardReady.value).toBe(true)
    expect(calc.fillingNeedsRecalculation.value).toBe(true)
    calc.invalidateFillingPreview('facade')
    expect(calc.fillingFacadeReady.value).toBe(false)
    expect(calc.fillingYardReady.value).toBe(false)
    complete({ lockVersion: 6, fillingFacadeReady: true, fillingYardReady: true })
    expect(calc.fillingFacadeReady.value).toBe(false)
  })
  it('keeps omitted metadata nullable and rejects readiness from an older context', () => {
    const calc = setup()
    expect(calc.fillingFacadeReady.value).toBeNull()
    const complete = calc.beginCoverStripMutation()
    calc.productRowId.value = 8
    complete({ lockVersion: 9, fillingFacadeReady: true, fillingYardReady: true })
    expect(calc.fillingFacadeReady.value).toBeNull()
    calc.loadFromApi({ modelId: '3', fillingFacadeReady: true, fillingYardReady: false })
    calc.loadFromApi({ modelId: '3' })
    expect(calc.fillingFacadeReady.value).toBeNull()
  })

  it.each(['1', '2', '4', '5', '6', '7', '8', '9', '10', '11'])('ignores dirty state for model %s', modelId => {
    const calc = setup()
    calc.modelId.value = modelId
    calc.markFillingForRecalculation()
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
    calc.beginCoverStripMutation()({ lockVersion: 7, fillingNeedsRecalculation: true })
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
    calc.loadFromApi({ modelId, fillingNeedsRecalculation: true })
    expect(calc.fillingNeedsRecalculation.value).toBe(false)
  })

})
