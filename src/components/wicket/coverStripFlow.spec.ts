import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import { type1Route } from '../../pages/wicket/type1Route'
import { WICKET_PROGRESS_STEP_ORDER } from '../../stores/wicket/wicketStepProgress'
import { canonicalizeWicketRootSavePayload } from '../../app/api/wicketRootSavePayload'

beforeEach(() => { setActivePinia(createPinia()) })
it('retains incomplete cards and blocks full-save instead of dropping them', () => {
  const calc = useCalculation()
  calc.orderId.value = 1; calc.productRowId.value = 2; calc.modelId.value = '1'
  expect(calc.coverStripDrafts).toBeDefined()
  calc.coverStripDrafts.value = [{ materialItemId: null, parameters: [] }]
  expect(() => calc.getFullSavePayload()).toThrow(/нащельник/i)
  expect(calc.coverStripDrafts.value).toHaveLength(1)
})
it('round trips four repeated independently colored pieces and clears on old load/reset', () => {
  const calc = useCalculation()
  const pieces = [1, 2, 1, 2].map(colorId => ({ materialItemId: 10, parameters: [{ attributeId: 5, colorId }] }))
  calc.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: pieces })
  expect(calc.getFullSavePayload().coverStrips).toEqual(pieces)
  calc.loadFromApi({ orderId: 1, productRowId: 3, modelId: '1' })
  expect(calc.coverStrips.value).toEqual([])
  expect(calc.coverStripDrafts.value).toEqual([])
  calc.coverStripDrafts.value = [{ materialItemId: null, parameters: [] }]
  calc.reset()
  expect(calc.coverStripDrafts.value).toEqual([])
})
it('inserts shared step and validates its drafts', () => {
  const state = { modelId: '1', fillSide: 0, materialFacadeGlob: null, materialYardGlob: null, isThereLock: 0, providesLock: 'manufacturer', availableSections: [], coverStripDrafts: [{ materialItemId: null, parameters: [] }] }
  expect(type1Route.next('page10', state)).toBe('page_cover_strip')
  expect(type1Route.prev('page12', state)).toBe('page_cover_strip')
  expect(type1Route.validations(state).get('page_cover_strip')?.valid).toBe(false)
  expect(WICKET_PROGRESS_STEP_ORDER.indexOf('page_cover_strip')).toBe(WICKET_PROGRESS_STEP_ORDER.indexOf('page10') + 1)
})
it('rejects fifth or malformed wire piece and preserves omitted vs explicit empty', () => {
  const base = { orderId: 1, productRowId: 2, modelId: '1' }
  const piece = { materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }] }
  expect(() => canonicalizeWicketRootSavePayload({ ...base, coverStrips: Array(5).fill(piece) })).toThrow()
  expect(() => canonicalizeWicketRootSavePayload({ ...base, coverStrips: [{ materialItemId: 10, parameters: [] }] })).toThrow()
  expect(canonicalizeWicketRootSavePayload(base)).not.toHaveProperty('coverStrips')
  expect(canonicalizeWicketRootSavePayload({ ...base, coverStrips: [] }).coverStrips).toEqual([])
})
it('registers the shared component for every supported model', () => {
  const pages = import.meta.glob('../../pages/wicket/Type*.vue', { query: '?raw', import: 'default', eager: true })
  expect(Object.keys(pages)).toHaveLength(11)
  for (const source of Object.values(pages)) expect(source).toContain('page_cover_strip: CoverStrip')
})
it('keeps server-provided unavailable descriptions separately from wire choices', () => {
  const calc = useCalculation()
  calc.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }] }], coverStripSummary: { blockCode: 'coverStrips', blockName: 'Any caption', params: [{ paramCode: 'coverStrip1', name: 'Any caption', value: 'Frozen description' }] } })
  expect(calc.data.value.find(block => block.blockCode === 'coverStrips')?.params[0]?.value).toBe('Frozen description')
  expect(calc.getFullSavePayload().coverStrips).toEqual([{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }] }])
  expect(calc.getFullSavePayload()).not.toHaveProperty('coverStripDescriptions')
})

it('preserves server review metadata on reload and blocks full payload while pending', () => {
  const calc = useCalculation()
  calc.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStripFrameColor: { token: 'b'.repeat(64), mode: 'fixed', paintId: 1, colorId: 9, colorName: 'Renamed', note: null }, coverStrips: [{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], frameColorToken: 'a'.repeat(64), requiresColorConfirmation: true }] })
  expect(calc.coverStripDrafts.value[0]).toMatchObject({ frameColorToken: 'a'.repeat(64), requiresColorConfirmation: true })
  expect(type1Route.validations({ modelId: '1', coverStripDrafts: calc.coverStripDrafts.value } as never).get('page_cover_strip')?.valid).toBe(false)
  expect(() => calc.getFullSavePayload()).toThrow(/цвет/i)
})
it('sends tokens but never derived review booleans in canonical payloads', () => {
  const payload = canonicalizeWicketRootSavePayload({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], frameColorToken: 'a'.repeat(64), requiresColorConfirmation: true }] })
  expect(payload.coverStrips).toEqual([{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], frameColorToken: 'a'.repeat(64) }])
})
it('applies canonical save metadata while preserving newer drafts, old responses, and reload generations', () => {
  const c = useCalculation(); const frame = { token: 'b'.repeat(64), paintId: 1, colorId: 9, mode: 'fixed' as const, colorName: 'Display', note: null }
  const piece = { materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], frameColorToken: 'a'.repeat(64), requiresColorConfirmation: true }
  c.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [piece], coverStripFrameColor: frame })
  const first = c.beginCoverStripMutation()
  c.coverStripDrafts.value[0]!.parameters[0]!.colorId = 3
  first({ lockVersion: 3, coverStripFrameColor: frame, coverStrips: [{ ...piece, requiresColorConfirmation: false, frameColorToken: frame.token }] })
  expect(c.coverStrips.value[0]?.requiresColorConfirmation).toBe(false)
  expect(c.coverStripDrafts.value[0]?.parameters[0]?.colorId).toBe(3)
  const second = c.beginCoverStripMutation()
  second({ lockVersion: 4 })
  expect(c.coverStripDrafts.value[0]?.requiresColorConfirmation).toBe(true)
  c.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [], coverStripFrameColor: { ...frame, token: 'c'.repeat(64) } })
  expect(second({ lockVersion: 5, coverStripFrameColor: frame, coverStrips: [piece] })).toBe(false)
  expect(c.coverStrips.value).toEqual([])
  expect(c.coverStripFrameColor.value?.token).toBe('c'.repeat(64))
})
it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('blocks pending cover review in type %i shared navigation validations', async modelId => {
  const module = await import(`../../pages/wicket/type${modelId}Route.ts`)
  const route = module[`type${modelId}Route`] as typeof type1Route
  const state = { modelId: String(modelId), fillSide: 0 as const, materialFacadeGlob: null, materialYardGlob: null, isThereLock: 0, providesLock: 'manufacturer', availableSections: [], coverStripDrafts: [{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], requiresColorConfirmation: true }] }
  expect(route.validations(state).get('page_cover_strip')?.valid).toBe(false)
  expect(route.validations({ ...state, coverStripDrafts: [] }).get('page_cover_strip')?.valid).toBe(true)
})
it('preserves newer typed edits but marks their stale tokens pending when another save changes frame context', () => {
  const c = useCalculation(); const frame = { token: 'b'.repeat(64), paintId: 1, colorId: 9, mode: 'fixed' as const, colorName: 'Saved', note: null }
  const piece = { materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }], frameColorToken: 'a'.repeat(64), requiresColorConfirmation: false }
  c.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [piece] })
  const complete = c.beginCoverStripMutation()
  c.coverStripDrafts.value[0]!.parameters[0]!.colorId = 3
  complete({ lockVersion: 3, coverStripFrameColor: frame, coverStrips: [{ ...piece, requiresColorConfirmation: true }] })
  expect(c.coverStripDrafts.value[0]?.parameters[0]?.colorId).toBe(3)
  expect(c.coverStripDrafts.value[0]?.requiresColorConfirmation).toBe(true)
  expect(() => c.getFullSavePayload()).toThrow(/цвет/i)
})
