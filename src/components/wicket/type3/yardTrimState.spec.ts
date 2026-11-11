import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../../composables/useCalculation'
import { getNextPage, getPrevPage, type3Route } from '../../../pages/wicket/type3Route'
beforeEach(() => setActivePinia(createPinia()))
it('persists, restores and resets the explicit trim choice', () => {
  const calc = useCalculation(); calc.modelId.value = '3'
  calc.loadFromApi({ modelId: '3', yardTrimCode: 'edge', orderId: 42, productRowId: 7 })
  expect(calc.getFullSavePayload()).toMatchObject({ yardTrimCode: 'edge' })
  calc.resetYardFilling()
  expect(calc.getFullSavePayload()).toMatchObject({ yardTrimCode: null })
  calc.loadFromApi({ modelId: '3' })
  expect(calc.getFullSavePayload()).toMatchObject({ yardTrimCode: null })
})
it('requires the trim step only for two sides with a positive gap', () => {
  const state = { materialFacadeGlob: 'fence', materialYardGlob: 'fence', isThereLock: 0, providesLock: 'manufacturer', availableSections: [], modelId: '3', fillSide: 2, gapName: 28, idFacade: 10, idYard: 20, layingFacadeCode: 'gap' as const, gapYardMm: 28, thicknessFacade: '100', thicknessYard: '100' }
  expect(getNextPage('page2_yard_fence', state)).toBe('page2_yard_fence_trim')
  expect(getPrevPage('page_painting', state)).toBe('page2_yard_fence_trim')
  expect(getPrevPage('page2_yard_fence_trim', state)).toBe('page2_yard_fence')
  expect(type3Route.validations(state).get('page2')?.valid).toBe(false)
  expect(type3Route.validations({ ...state, yardTrimCode: 'none' }).get('page2')?.valid).toBe(true)
  expect(getNextPage('page2_yard_fence', { ...state, gapName: 0 })).toBe('page_painting')
})
it('restores trim in the summary with stable codes', () => {
  const calc = useCalculation()
  calc.loadFromApi({ modelId: '3', fillingSideCount: 2, gapName: 28, yardTrimCode: 'edge', idYard: 20 })
  expect(calc.data.value.find(block => block.blockCode === 'yardFenceTrim')?.params).toEqual([{ paramCode: 'yardTrimCode', name: 'Подрезка планок', value: 'С подрезкой' }])
})
it('rejects an invalid display caption during restoration', () => {
  const calc = useCalculation()
  calc.loadFromApi({ modelId: '3', yardTrimCode: 'С подрезкой', orderId: 42, productRowId: 7 })
  expect(calc.yardTrimCode.value).toBeNull()
  expect(calc.getFullSavePayload().yardTrimCode).toBeNull()
})

it('guards route navigation against missing, wrong-orientation and unavailable facade cuts', () => {
  const state = { materialFacadeGlob: 'fence', materialYardGlob: null, isThereLock: 0, providesLock: 'manufacturer', availableSections: [], modelId: '3', fillSide: 1, gapName: 0, idFacade: 10, layingFacadeCode: 'butt' as const, raspolozheniyePolotna: 'vertical', facadeButtTrimCode: 'single' as const }
  expect(type3Route.canNavigate?.('page2', 'page12', state)).toBe(false)
  expect(type3Route.validations({ ...state, facadeButtTrimSide: 'top' }).get('page2')?.valid).toBe(false)
  expect(type3Route.validations({ ...state, facadeButtTrimSide: 'lock' }).get('page2')?.valid).toBe(true)
  expect(type3Route.validations({ ...state, facadeButtTrimCode: null, facadeButtTrim: { mode: 'unavailable' } }).get('page2')?.valid).toBe(false)
})

it('restores facade trim, omits virtual metadata from saves and clears trim with material reset', () => {
  const calc = useCalculation()
  calc.loadFromApi({ modelId: '3', orderId: 42, productRowId: 7, facadeButtTrimCode: 'single', facadeButtTrimSide: 'lock', facadeButtTrim: { mode: 'single', widthMm: 44, quantity: 1, requiresSide: true } })
  expect(calc.getFullSavePayload()).toMatchObject({ facadeButtTrimCode: 'single', facadeButtTrimSide: 'lock' })
  expect(calc.getFullSavePayload()).not.toHaveProperty('facadeButtTrim')
  expect(calc.facadeButtTrim.value?.widthMm).toBe(44)
  calc.resetFacadeFilling()
  expect(calc.facadeButtTrim.value).toBeNull()
  expect(calc.facadeButtTrimCode.value).toBeNull()
})
