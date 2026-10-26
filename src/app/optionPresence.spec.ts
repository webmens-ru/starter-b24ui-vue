import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isOptionPresence, optionPresenceLabel, optionPresenceOptions, parseOptionPresence, presenceFromLockSetId } from './optionPresence'
import { readPenPresence } from './api/legacyOptionPresence'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { applyWicketApiFieldMappings } from '../stores/wicket/wicketLoadApiApply'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import { type2Route } from '../pages/wicket/type2Route'

describe('numeric option presence boundary', () => {
  it('keeps labels separate from exact numeric current values', () => {
    expect(optionPresenceOptions('lock')).toEqual([{ value: 1, label: 'Есть' }, { value: 0, label: 'Нет' }])
    expect(optionPresenceOptions('optional')).toEqual([{ value: 1, label: 'Будет' }, { value: 0, label: 'Не будет' }])
    expect(optionPresenceLabel(1, 'optional')).toBe('Будет')
    expect(optionPresenceLabel(null, 'optional')).toBe('')
    for (const raw of [null, '', '1', true, 'Будет', 7, []]) expect(isOptionPresence(raw)).toBe(false)
    for (const raw of [1, '1', true]) expect(parseOptionPresence(raw)).toBe(1)
    for (const raw of [0, '0', false]) expect(parseOptionPresence(raw)).toBe(0)
    for (const raw of [null, '', ' 1', 7, -1, 'Будет', [], undefined]) expect(parseOptionPresence(raw)).toBe(null)
  })
  it('derives root lock presence from a validated reference, not its label', () => {
    for (const raw of [7, '819']) expect(presenceFromLockSetId(raw)).toBe(1)
    for (const raw of [null, undefined, '']) expect(presenceFromLockSetId(raw)).toBe(0)
    for (const raw of [0, '0', -1, true, [], 'Есть', '7x']) expect(presenceFromLockSetId(raw)).toBe(null)
  })
  it('gives an existing property priority and isolates exact historical caption decoding', () => {
    expect(readPenPresence({ isTherePen: 1, isTherePenName: 'Не будет' })).toBe(1)
    expect(readPenPresence({ isTherePen: 0, isTherePenName: 'Будет' })).toBe(0)
    expect(readPenPresence({ isTherePen: 7, isTherePenName: 'Будет' })).toBe(null)
    expect(readPenPresence({ isTherePenName: 'Будет' })).toBe(1)
    expect(readPenPresence({ isTherePenName: 'Не будет' })).toBe(0)
    expect(readPenPresence({ isTherePen: null, isTherePenName: '' })).toBe(0)
    expect(readPenPresence({})).toBe(0)
    for (const raw of [' БУДЕТ ', 'Неизвестно', []]) expect(readPenPresence({ isTherePenName: raw })).toBe(null)
  })
  it('hydrates refs without reviving invalid numeric state or resetting it on a partial response', () => {
    const refs = { isTherePen: { value: 0 as unknown }, isTherePenName: { value: 'Не будет' as unknown } }
    applyWicketApiFieldMappings({ isTherePen: 1, isTherePenName: 'Переименовано' }, refs)
    expect(refs.isTherePen.value).toBe(1)
    expect(refs.isTherePenName.value).toBe('Будет')
    applyWicketApiFieldMappings({ isTherePen: 7, isTherePenName: 'Будет' }, refs)
    expect(refs.isTherePen.value).toBe(null)
    applyWicketApiFieldMappings({ widthProyema: 1000 }, refs)
    expect(refs.isTherePen.value).toBe(null)
  })
  it('serializes existing numeric pen flag and lock reference, never presence captions or retired lock header', () => {
    const source = { orderId: 42, productRowId: 7, modelId: '1', lockSetId: 819,
      isThereLock: 0, isThereLockName: 'Нет', isTherePen: 1, isTherePenName: 'Не будет' }
    const payload = canonicalizeWicketRootSavePayload(source)
    expect(payload).toMatchObject({ lockSetId: 819, isTherePen: 1 })
    for (const field of ['isThereLock', 'isThereLockName', 'isTherePenName']) expect(payload).not.toHaveProperty(field)
    expect(source.isTherePenName).toBe('Не будет')
  })
  it('keeps actual store behavior independent of stale captions and derives presence labels', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    store.loadFromApi({ isTherePen: 1, isTherePenName: 'Не будет', lockSetId: 819, isThereLockName: 'Нет' })
    expect(store.isTherePen).toBe(1)
    expect(store.isTherePenName).toBe('Будет')
    expect(store.isThereLock).toBe(1)
    expect(store.isThereLockName).toBe('Есть')
    store.loadFromApi({ isTherePen: 7, isTherePenName: 'Будет', lockSetId: 'bad' })
    expect(store.isTherePen).toBe(null)
    expect(store.isThereLock).toBe(null)
  })
  it.each([true, false, '1e2', ' 7', '7 ', '0x10', [7]])('rejects raw invalid lock FK %j before numeric coercion', raw => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    store.loadFromApi({ lockSetId: raw })
    expect(store.isThereLock).toBe(null)
  })
  it('does not navigate past unresolved lock presence as though it were absence', () => {
    const state = { modelId: '2', materialFacadeGlob: 'siding', materialYardGlob: null, fillSide: 1,
      isThereLock: null, providesLock: 'manufacturer', availableSections: [] }
    expect(type2Route.next('page9', state)).toBe('page9')
    expect(type2Route.validations(state).get('page9')?.valid).toBe(false)
    expect(type2Route.validations({ ...state, isThereLock: 0 }).get('page9')?.valid).toBe(true)
  })
})
