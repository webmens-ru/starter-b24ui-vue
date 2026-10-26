import { describe, expect, it } from 'vitest'
import { fillingSideCountLabel, fillingSideCountOptions, isFillingSideCount } from './fillingSideCounts'
import { readFillingSideCount } from './api/legacyFillingSideCounts'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'
import { type2Route } from '../pages/wicket/type2Route'
import { createPinia, setActivePinia } from 'pinia'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'

describe('numeric filling side count boundary', () => {
  const navigation = { modelId: '2', materialFacadeGlob: 'siding', materialYardGlob: 'profnastil',
    fillSide: 1, isThereLock: 1, providesLock: 'manufacturer', availableSections: [], idFacade: 21, idYard: null }
  it.each([null, '', 3] as const)('keeps unresolved count %s at the choice page instead of choosing a side layout', fillSide => {
    const state = { ...navigation, fillSide }
    expect(type2Route.next('page2', state)).toBe('page2')
    expect(type2Route.prev('page6', state)).toBe('page2')
    expect(type2Route.validations(state).get('page2')?.valid).toBe(false)
  })
  it('requires and routes to the yard for numeric Double independently of captions', () => {
    const state = { ...navigation, fillSide: 2 }
    expect(type2Route.next('page2_facade_siding', state)).toBe('page2_yard_profnastil')
    expect(type2Route.validations(state).get('page2')?.valid).toBe(false)
    expect(type2Route.validations({ ...state, idYard: 39 }).get('page2')?.valid).toBe(true)
  })
  it('uses numeric count for actual store completeness and separate summary labels', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    store.fillSide = 2
    store.idFacade = 21
    store.idYard = ''
    expect(store.isFillSectionIncomplete).toBe(true)
    store.idYard = 39
    expect(store.isFillSectionIncomplete).toBe(false)
    store.fillSide = ''
    expect(store.isFillSectionIncomplete).toBe(true)
    store.loadFromApi({ fillingSideCount: 2, fillSide: 'Произвольная подпись', idFacade: 21, idYard: 39 })
    expect(store.fillSide).toBe(2)
    expect(store.data.find(block => block.blockName === 'Заполнение')?.params)
      .toContainEqual({ paramCode: 'sideCount', name: 'Сторона заполнения', value: 'Две стороны' })
  })
  it('keeps numeric options separate from display labels and rejects coercible values', () => {
    expect(fillingSideCountOptions()).toEqual([{ value: 1, label: 'Одна сторона' }, { value: 2, label: 'Две стороны' }])
    expect(fillingSideCountLabel(2)).toBe('Две стороны')
    for (const raw of ['1', '2', 'Две стороны', true, false, null, 0, 3, 1.5, NaN]) expect(isFillingSideCount(raw)).toBe(false)
    expect(fillingSideCountLabel('unknown')).toBe('')
  })
  it('prefers count, honors invalid diagnostics and confines legacy defaults to the read boundary', () => {
    expect(readFillingSideCount({ fillingSideCount: 2, fillSide: 'Одна сторона' })).toBe(2)
    expect(readFillingSideCount({ fillingSideCount: 3, fillSide: 'Две стороны' })).toBe('')
    expect(readFillingSideCount({ fillingSideCount: '2', fillSide: 'Две стороны' })).toBe('')
    expect(readFillingSideCount({ fillingSideCount: null, fillSide: 'Две стороны', fillingSideCountProblem: { code: 'invalid' } })).toBe('')
    expect(readFillingSideCount({ fillingSideCount: null, fillSide: 'Две стороны' })).toBe(2)
    expect(readFillingSideCount({ fillSide: 'Одна сторона' })).toBe(1)
    for (const raw of [' Две стороны ', 'constructor', '2', 2, []]) expect(readFillingSideCount({ fillSide: raw })).toBe('')
    expect(readFillingSideCount({ fillSide: null })).toBe(1)
    expect(readFillingSideCount({})).toBe(1)
  })
  it('hydrates actual refs without reviving invalid selection or resetting unrelated partial data', () => {
    const refs = { fillSide: { value: 1 as unknown } }
    applyWicketApiFieldMappings({ fillingSideCount: 2, fillSide: ['Любая подпись'] }, refs)
    expect(refs.fillSide.value).toBe(2)
    applyWicketApiFieldMappings({ fillingSideCount: null, fillSide: 'Две стороны', fillingSideCountProblem: { code: 'invalid' } }, refs)
    expect(refs.fillSide.value).toBe('')
    applyWicketApiFieldMappings({ widthProyema: 1000 }, refs)
    expect(refs.fillSide.value).toBe('')
  })
  it('sends only count and explicit clears without mutating the source', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', fillSide: 2, fillingSideCountProblem: null }
    const result = canonicalizeWicketRootSavePayload(source)
    expect(result.fillingSideCount).toBe(2)
    expect(result).not.toHaveProperty('fillSide')
    expect(result).not.toHaveProperty('fillingSideCountProblem')
    expect(source.fillSide).toBe(2)
    expect(canonicalizeWicketRootSavePayload({ ...source, fillingSideCount: 1 }).fillingSideCount).toBe(1)
    expect(canonicalizeWicketRootSavePayload({ ...source, fillingSideCount: null }).fillingSideCount).toBe(null)
    expect(canonicalizeWicketRootSavePayload({ ...source, fillSide: null }).fillingSideCount).toBe(null)
    expect(canonicalizeWicketRootSavePayload({ ...source, fillSide: '' })).not.toHaveProperty('fillingSideCount')
    expect(() => canonicalizeWicketRootSavePayload({ ...source, fillSide: 'Две стороны' })).toThrow()
    expect(() => canonicalizeWicketRootSavePayload({ ...source, fillingSideCount: 3 } as never)).toThrow()
  })
})
