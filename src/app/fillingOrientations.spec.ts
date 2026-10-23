import { describe, expect, it } from 'vitest'
import { fillingOrientationLabel, fillingOrientationOptions, isFillingOrientation } from './fillingOrientations'
import { readFillingOrientation } from './api/legacyFillingOrientations'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'
import { createPinia, setActivePinia } from 'pinia'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import { type2Route } from '../pages/wicket/type2Route'

describe('explicit filling orientation boundary', () => {
  it('keeps technical values separate from labels', () => {
    expect(fillingOrientationOptions()).toEqual([
      { value: 'vertical', label: 'Вертикально' }, { value: 'horizontal', label: 'Горизонтально' },
    ])
    expect(fillingOrientationLabel('vertical')).toBe('Вертикально')
    for (const raw of [null, '', true, 1, 'Вертикально', 'Vertical', ' vertical ', [], undefined]) expect(isFillingOrientation(raw)).toBe(false)
    expect(fillingOrientationLabel('bad')).toBe('')
  })
  it('prioritizes exact property and masks invalid data without reviving a caption', () => {
    expect(readFillingOrientation({ fillingOrientationCode: 'horizontal', raspolozheniyePolotna: 'Вертикально' })).toBe('horizontal')
    expect(readFillingOrientation({ fillingOrientationCode: 'bad', raspolozheniyePolotna: 'Вертикально' })).toBe('')
    expect(readFillingOrientation({ fillingOrientationCode: null, fillingOrientationProblem: { code: 'invalid' }, raspolozheniyePolotna: 'Вертикально' })).toBe('')
    expect(readFillingOrientation({ raspolozheniyePolotna: 'Горизонтально' })).toBe('horizontal')
    expect(readFillingOrientation({ raspolozheniyePolotna: 'Вертикально' })).toBe('vertical')
    for (const raw of [' Вертикально ', 'ВЕРТИКАЛЬНО', 'horizontal', [], true]) expect(readFillingOrientation({ raspolozheniyePolotna: raw })).toBe('')
    for (const raw of [null, undefined, '']) expect(readFillingOrientation({ raspolozheniyePolotna: raw })).toBe('vertical')
  })
  it('hydrates real refs and preserves unresolved state on unrelated partial responses', () => {
    const refs = { raspolozheniyePolotna: { value: 'vertical' as unknown } }
    applyWicketApiFieldMappings({ fillingOrientationCode: 'horizontal', raspolozheniyePolotna: ['bad caption'] }, refs)
    expect(refs.raspolozheniyePolotna.value).toBe('horizontal')
    applyWicketApiFieldMappings({ fillingOrientationCode: null, fillingOrientationProblem: { code: 'invalid' }, raspolozheniyePolotna: 'Горизонтально' }, refs)
    expect(refs.raspolozheniyePolotna.value).toBe('')
    applyWicketApiFieldMappings({ widthProyema: 1000 }, refs)
    expect(refs.raspolozheniyePolotna.value).toBe('')
  })
  it('serializes only codes and explicit clears without changing the source', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', raspolozheniyePolotna: 'horizontal', fillingOrientationProblem: null }
    const result = canonicalizeWicketRootSavePayload(source)
    expect(result.fillingOrientationCode).toBe('horizontal')
    expect(result).not.toHaveProperty('raspolozheniyePolotna')
    expect(result).not.toHaveProperty('fillingOrientationProblem')
    expect(source.raspolozheniyePolotna).toBe('horizontal')
    expect(canonicalizeWicketRootSavePayload({ ...source, fillingOrientationCode: 'vertical' }).fillingOrientationCode).toBe('vertical')
    expect(canonicalizeWicketRootSavePayload({ ...source, fillingOrientationCode: null }).fillingOrientationCode).toBe(null)
    expect(canonicalizeWicketRootSavePayload({ ...source, raspolozheniyePolotna: '' })).not.toHaveProperty('fillingOrientationCode')
    expect(() => canonicalizeWicketRootSavePayload({ ...source, raspolozheniyePolotna: 'Вертикально' })).toThrow()
  })
  it('uses typed codes for actual store and summary and resets to the existing draft default', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    expect(store.raspolozheniyePolotna).toBe('vertical')
    store.loadFromApi({ fillingOrientationCode: 'horizontal', raspolozheniyePolotna: 'Иная подпись' })
    expect(store.raspolozheniyePolotna).toBe('horizontal')
    expect(store.data.find(block => block.blockName === 'Расположение полотна')?.params)
      .toContainEqual({ name: 'Расположение полотна', value: 'Горизонтально' })
    store.resetFormFields()
    expect(store.raspolozheniyePolotna).toBe('vertical')
  })
  it('does not leave an explicitly unresolved orientation step', () => {
    const state = { modelId: '2', materialFacadeGlob: 'siding', materialYardGlob: null, fillSide: 1,
      isThereLock: 1, providesLock: 'manufacturer', availableSections: [], raspolozheniyePolotna: '' }
    expect(type2Route.next('page6', state)).toBe('page6')
    expect(type2Route.validations(state).get('page6')?.valid).toBe(false)
    expect(type2Route.validations({ ...state, raspolozheniyePolotna: 'horizontal' }).get('page6')?.valid).toBe(true)
  })
})
