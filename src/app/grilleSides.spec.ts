import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { grilleSideLabel, grilleSideOptions, isGrilleSide, parseDrawingGrilleSide } from './grilleSides'
import { readGrilleSide } from './api/legacyGrilleSides'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import { type2Route } from '../pages/wicket/type2Route'

describe('explicit grille side boundary', () => {
  it('separates codes and labels and rejects explicit invalid active drawing state', () => {
    expect(grilleSideOptions()).toEqual([{ value: 'hinge', label: 'Возле петель' }, { value: 'lock', label: 'Возле замка' }])
    expect(grilleSideLabel('lock')).toBe('Возле замка')
    expect(parseDrawingGrilleSide(undefined, true)).toBe('hinge')
    expect(parseDrawingGrilleSide('lock', true)).toBe('lock')
    for (const raw of [null, '', 'Возле замка', 'LOCK', ' lock ', [], 1]) {
      expect(isGrilleSide(raw)).toBe(false)
      expect(() => parseDrawingGrilleSide(raw, true)).toThrow('grilleSideCode')
      expect(parseDrawingGrilleSide(raw, false)).toBe('hinge')
    }
  })
  it('decodes old response exactly without reviving invalid modern state', () => {
    expect(readGrilleSide({ grilleSideCode: 'lock', grilleLocation: 'Возле петель' })).toBe('lock')
    expect(readGrilleSide({ grilleSideCode: 'bad', grilleLocation: 'Возле петель' })).toBe('')
    expect(readGrilleSide({ grilleSideCode: null, grilleSideProblem: { code: 'invalid' }, grilleLocation: 'Возле замка' })).toBe('')
    expect(readGrilleSide({ grilleLocation: 'Возле замка' })).toBe('lock')
    expect(readGrilleSide({ grilleLocation: 'Возле петель' })).toBe('hinge')
    for (const raw of [undefined, null, '']) expect(readGrilleSide({ grilleLocation: raw })).toBe('hinge')
    for (const raw of [' Возле замка', 'ЗАМКА', 'lock', []]) expect(readGrilleSide({ grilleLocation: raw })).toBe('')
  })
  it('hydrates real refs without resetting unresolved choice on partial responses', () => {
    const refs = { grilleLocation: { value: 'hinge' as unknown } }
    applyWicketApiFieldMappings({ grilleSideCode: 'lock', grilleLocation: ['ignored old'] }, refs)
    expect(refs.grilleLocation.value).toBe('lock')
    applyWicketApiFieldMappings({ grilleSideCode: 'bad', grilleLocation: 'Возле петель' }, refs)
    expect(refs.grilleLocation.value).toBe('')
    applyWicketApiFieldMappings({ widthProyema: 1000 }, refs)
    expect(refs.grilleLocation.value).toBe('')
  })
  it('sends code only, permits explicit null clear and omits unresolved blank', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', grilleLocation: 'lock', grilleSideProblem: null }
    const result = canonicalizeWicketRootSavePayload(source)
    expect(result.grilleSideCode).toBe('lock')
    expect(result).not.toHaveProperty('grilleLocation')
    expect(result).not.toHaveProperty('grilleSideProblem')
    expect(source.grilleLocation).toBe('lock')
    expect(canonicalizeWicketRootSavePayload({ ...source, grilleSideCode: null }).grilleSideCode).toBe(null)
    expect(canonicalizeWicketRootSavePayload({ ...source, grilleSideCode: 'hinge' }).grilleSideCode).toBe('hinge')
    expect(canonicalizeWicketRootSavePayload({ ...source, grilleLocation: '' })).not.toHaveProperty('grilleSideCode')
    expect(() => canonicalizeWicketRootSavePayload({ ...source, grilleLocation: 'Возле замка' })).toThrow()
  })
  it('uses the semantic side in the actual store and display summary', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    expect(store.grilleLocation).toBe('hinge')
    store.loadFromApi({ frameSubtypeCode: 'sideNet', grilleSideCode: 'lock', grilleLocation: 'Переименовано' })
    expect(store.grilleLocation).toBe('lock')
    expect(store.data.find(block => block.blockName === 'Тип щита')?.params)
      .toContainEqual({ name: 'Расположение решётки', value: 'Возле замка' })
    store.resetFormFields()
    expect(store.grilleLocation).toBe('hinge')
  })
  it('blocks leaving an explicitly unresolved active grille side but ignores inactive side', () => {
    const state = { modelId: '2', materialFacadeGlob: 'siding', materialYardGlob: null, fillSide: 1,
      isThereLock: 1, providesLock: 'manufacturer', availableSections: [], shieldType: 'sideNet', grilleLocation: '' }
    expect(type2Route.next('page3', state)).toBe('page3')
    expect(type2Route.validations(state).get('page3')?.valid).toBe(false)
    expect(type2Route.validations(state).get('page3')?.errors).toEqual(['Выберите расположение решётки'])
    expect(type2Route.validations({ ...state, grilleLocation: 'lock' }).get('page3')?.valid).toBe(true)
    expect(type2Route.validations({ ...state, shieldType: 'noNet' }).get('page3')?.valid).toBe(true)
  })
})
