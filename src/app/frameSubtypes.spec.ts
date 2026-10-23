import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { frameSubtypeLabel, frameSubtypeOptions, isFrameSubtypeCode } from './frameSubtypes'
import { readFrameSubtype } from './api/legacyFrameSubtypes'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import { resolveFrameSubtype } from '../components/wicket/frameSubtype'
import { type2Route } from '../pages/wicket/type2Route'

describe('explicit frame subtype boundary', () => {
  it('keeps semantic codes separate from presentation and drawing metadata', () => {
    expect(frameSubtypeOptions()).toEqual([
      { value: 'noNet', label: 'Без сеток', imageIndex: 1 },
      { value: 'lowerNet', label: 'Сетка снизу', imageIndex: 2 },
      { value: 'upperNet', label: 'Сетка сверху', imageIndex: 5 },
      { value: 'upperAndLowerNet', label: 'Сетка снизу и сверху', imageIndex: 3 },
      { value: 'sideNet', label: 'Сетка сбоку', imageIndex: 4 },
    ])
    expect(frameSubtypeLabel('upperNet')).toBe('Сетка сверху')
    for (const value of [null, '', 'Тип_1', 'type1', 'NoNet', ' noNet ', [], 1]) expect(isFrameSubtypeCode(value)).toBe(false)
    expect(resolveFrameSubtype('upperNet')).toBe('type5')
    expect(resolveFrameSubtype(undefined)).toBe('type1')
    for (const value of [null, '', 'Тип_1', 'type1', 'bad']) expect(() => resolveFrameSubtype(value)).toThrow()
  })
  it('decodes old responses exactly without reviving invalid modern state', () => {
    expect(readFrameSubtype({ frameSubtypeCode: 'sideNet', shieldType: 'Тип_1' })).toBe('sideNet')
    expect(readFrameSubtype({ frameSubtypeCode: 'bad', shieldType: 'Тип_4' })).toBe('')
    expect(readFrameSubtype({ frameSubtypeCode: null, frameSubtypeProblem: { code: 'invalid' }, shieldType: 'Тип_4' })).toBe('')
    expect(readFrameSubtype({ shieldType: 'Тип_5' })).toBe('upperNet')
    for (const value of [null, undefined, '']) expect(readFrameSubtype({ shieldType: value })).toBe('noNet')
    for (const value of [' Тип_1', 'prefix3', 'type1', 1]) expect(readFrameSubtype({ shieldType: value })).toBe('')
  })
  it('hydrates refs without resetting unresolved selection on a partial response', () => {
    const refs = { shieldType: { value: 'noNet' as unknown } }
    applyWicketApiFieldMappings({ frameSubtypeCode: 'sideNet', shieldType: ['bad'] }, refs)
    expect(refs.shieldType.value).toBe('sideNet')
    applyWicketApiFieldMappings({ frameSubtypeCode: 'bad', shieldType: 'Тип_1' }, refs)
    expect(refs.shieldType.value).toBe('')
    applyWicketApiFieldMappings({ widthProyema: 1000 }, refs)
    expect(refs.shieldType.value).toBe('')
  })
  it('sends property only, preserves null clears and omits unresolved choice', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', shieldType: 'upperNet', frameSubtypeProblem: null }
    const result = canonicalizeWicketRootSavePayload(source)
    expect(result.frameSubtypeCode).toBe('upperNet')
    expect(result).not.toHaveProperty('shieldType')
    expect(result).not.toHaveProperty('frameSubtypeProblem')
    expect(source.shieldType).toBe('upperNet')
    expect(canonicalizeWicketRootSavePayload({ ...source, frameSubtypeCode: null }).frameSubtypeCode).toBe(null)
    expect(canonicalizeWicketRootSavePayload({ ...source, frameSubtypeCode: 'sideNet' }).frameSubtypeCode).toBe('sideNet')
    expect(canonicalizeWicketRootSavePayload({ ...source, shieldType: '' })).not.toHaveProperty('frameSubtypeCode')
    expect(() => canonicalizeWicketRootSavePayload({ ...source, shieldType: 'Тип_5' })).toThrow()
  })
  it('uses semantic selection in the actual store and display summary', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    expect(store.shieldType).toBe('noNet')
    store.loadFromApi({ frameSubtypeCode: 'upperNet', shieldType: 'Переименовано' })
    expect(store.shieldType).toBe('upperNet')
    expect(store.data.find(block => block.blockName === 'Тип щита')?.params)
      .toContainEqual({ paramCode: 'frameSubtype', name: 'Тип щита', value: 'Сетка сверху' })
    store.resetFormFields()
    expect(store.shieldType).toBe('noNet')
  })
  it('blocks leaving an explicitly unresolved subtype step', () => {
    const state = { modelId: '2', materialFacadeGlob: 'siding', materialYardGlob: null, fillSide: 1,
      isThereLock: 1, providesLock: 'manufacturer', availableSections: [], shieldType: '' }
    expect(type2Route.next('page3', state)).toBe('page3')
    expect(type2Route.validations(state).get('page3')?.valid).toBe(false)
    expect(type2Route.validations({ ...state, shieldType: 'sideNet' }).get('page3')?.valid).toBe(true)
  })
})
