import { expect, it } from 'vitest'
import { ref } from 'vue'
import { applyWicketApiPayloadForModel } from './wicketLoadApiByModel'

it('restores physical fence widths and nullable laying codes from the Type3 API', () => {
  const fields = { thicknessFacade: ref<unknown>(''), thicknessYard: ref<unknown>(''), layingFacadeCode: ref<unknown>(null), layingYardCode: ref<unknown>(null) }
  applyWicketApiPayloadForModel('3', { widthFenceFacade: 100, widthFenceYard: '120', layingFacadeCode: null, layingYardCode: null, materialFacade: 'Любая подпись' }, fields)
  expect(fields.thicknessFacade.value).toBe('100')
  expect(fields.thicknessYard.value).toBe('120')
  expect(fields.layingFacadeCode.value).toBeNull()
  expect(fields.layingYardCode.value).toBeNull()
})
it('keeps other models thickness independent from fence width fields', () => {
  const fields = { thicknessFacade: ref<unknown>('') }
  applyWicketApiPayloadForModel('1', { thicknessFacade: '0.5', widthFenceFacade: 100 }, fields)
  expect(fields.thicknessFacade.value).toBe('0.5')
})
