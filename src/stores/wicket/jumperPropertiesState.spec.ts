import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../app/api'
import { useWicketFormStore } from './wicketFormStore'
import { useCalculation } from '../../composables/useCalculation'

describe('jumper and posts hydration', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('uses explicit properties despite a contradictory display caption', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: 1733, peremichkaPolozheniyeName: 'Без перемычки', jumperPlacement: 'behind', hasStolby: '0' })
    expect(store.jumperPlacement).toBe('behind')
    expect(store.jumperPlacementProblem).toBeNull()
    expect(store.hasStolby).toBe(0)
    expect(store.postsPresenceProblem).toBeNull()
  })

  it('preserves an unavailable selection and its server diagnostic', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: '1733', jumperPlacement: 'above',
      jumperPlacementProblem: { code: 'inactive', message: 'Неактивно' }, hasStolby: 1,
      postsPresenceProblem: { code: 'invalid', message: 'Нужно исправить' } })
    expect(String(store.peremichkaPolozheniyeId)).toBe('1733')
    expect(store.jumperPlacement).toBe('above')
    expect(store.jumperPlacementProblem).toEqual({ code: 'inactive', message: 'Неактивно' })
    expect(store.hasStolby).toBeNull()
    expect(store.postsPresenceProblem).toEqual({ code: 'invalid', message: 'Нужно исправить' })
  })

  it.each([undefined, null, '', true, false, 2, '01', '1tail', 0.5, 'Со столбами'])('never guesses posts from invalid value %j', hasStolby => {
    const store = useWicketFormStore()
    store.loadFromApi({ hasStolby, nalichieStolbovName: 'Со столбами' })
    expect(store.hasStolby).toBeNull()
    expect(store.postsPresenceProblem).toMatchObject({ code: 'invalid' })
  })

  it.each([0, 1, '0', '1'])('accepts exact posts value %j', hasStolby => {
    const store = useWicketFormStore()
    store.loadFromApi({ hasStolby })
    expect(store.hasStolby).toBe(Number(hasStolby))
    expect(store.postsPresenceProblem).toBeNull()
  })

  it.each([true, 1.5, '001', '1733tail'])('does not let generic hydration disguise invalid FK %j', id => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: id, jumperPlacement: 'above' })
    expect(store.jumperPlacement).toBeNull()
    expect(store.jumperPlacementProblem).toMatchObject({ code: 'invalid' })
  })

  it.each([null, undefined, 'Над створкой', 2])('keeps unresolved placement %j unknown', jumperPlacement => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement, peremichkaPolozheniyeName: 'Перемычка над створкой' })
    expect(store.jumperPlacement).toBeNull()
    expect(store.jumperPlacementProblem).toMatchObject({ code: 'invalid' })
  })

  it('does not retain previous-row properties when the next response omits them', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement: 'behind', hasStolby: 1 })
    store.loadFromApi({ peremichkaPolozheniyeId: 1733 })
    expect(store.jumperPlacement).toBeNull()
    expect(store.hasStolby).toBeNull()
    store.resetFormFields()
    expect(store.jumperPlacement).toBeNull()
    expect(store.jumperPlacementProblem).toBeNull()
    expect(store.hasStolby).toBeNull()
    expect(store.postsPresenceProblem).toBeNull()
  })

  it('does not submit an unknown posts choice while saving unrelated draft fields', () => {
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement: 'above', hasStolby: null })
    expect(calc.getFullSavePayload()).not.toHaveProperty('hasStolby')
    calc.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement: 'above', hasStolby: '0' })
    expect(calc.getFullSavePayload().hasStolby).toBe(0)
    expect(String(calc.getFullSavePayload().peremichkaPolozheniyeId)).toBe('1733')
    expect(calc.getFullSavePayload()).not.toHaveProperty('jumperPlacement')
    expect(calc.getFullSavePayload()).not.toHaveProperty('postsPresenceProblem')
  })

  it('hydrates diagnostics and saved prices without issuing a save or calculation request', () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('Unexpected mutation'))
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement: 'behind',
      jumperPlacementProblem: { code: 'inactive', message: 'История' },
      hasStolby: 1, priceRetail: '123.45', priceDealer: '100.00' })
    expect(store.priceRetail).toBe('123.45')
    expect(store.priceDealer).toBe('100.00')
    expect(post).not.toHaveBeenCalled()
  })

  it.each([{ code: ['inactive'], message: 'Ошибка' }, { code: 'future', message: 'Ошибка' }, { code: 'invalid', message: null }])('marks malformed diagnostic %j invalid without accepting it as clear', problem => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: 1733, jumperPlacement: 'above', jumperPlacementProblem: problem,
      hasStolby: 1, postsPresenceProblem: problem })
    expect(store.jumperPlacement).toBe('above')
    expect(store.jumperPlacementProblem).toMatchObject({ code: 'invalid' })
    expect(store.hasStolby).toBeNull()
    expect(store.postsPresenceProblem).toMatchObject({ code: 'invalid' })
  })

  it('never attaches a configured placement to a missing foreign key', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ peremichkaPolozheniyeId: null, jumperPlacement: 'above' })
    expect(store.jumperPlacement).toBeNull()
    expect(store.jumperPlacementProblem).toBeNull()
  })
})
