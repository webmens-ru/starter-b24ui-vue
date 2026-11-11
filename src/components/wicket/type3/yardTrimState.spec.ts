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
  expect(getPrevPage('page3', state)).toBe('page2_yard_fence_trim')
  expect(getPrevPage('page2_yard_fence_trim', state)).toBe('page2_yard_fence')
  expect(type3Route.validations(state).get('page2')?.valid).toBe(false)
  expect(type3Route.validations({ ...state, yardTrimCode: 'none' }).get('page2')?.valid).toBe(true)
  expect(getNextPage('page2_yard_fence', { ...state, gapName: 0 })).toBe('page3')
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
