import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it } from 'vitest'
import { useWicketFormStore } from './wicketFormStore'

const payload = {
  idFacade: 725, idYard: '819', materialFacade: 'Одинаковая подпись', materialYard: 'Одинаковая подпись',
  fillingProfileFacade: { kind: 'logSiding' }, fillingProfileFacadeProblem: null,
  fillingProfileYard: { kind: 'shipLap' }, fillingProfileYardProblem: null,
}

beforeEach(() => setActivePinia(createPinia()))

it('hydrates independent material relief modes and clears them when resetting', () => {
  const store = useWicketFormStore()
  store.loadFromApi({ ...payload, reliefFacadeAlongMode: 'repeat', reliefFacadeAcrossMode: 'stretch', reliefYardAlongMode: 'stretch', reliefYardAcrossMode: 'repeat' })
  expect([store.reliefFacadeAlongMode, store.reliefFacadeAcrossMode, store.reliefYardAlongMode, store.reliefYardAcrossMode]).toEqual(['repeat', 'stretch', 'stretch', 'repeat'])
  store.loadFromApi(payload)
  expect([store.reliefFacadeAlongMode, store.reliefFacadeAcrossMode, store.reliefYardAlongMode, store.reliefYardAcrossMode]).toEqual(['stretch', 'repeat', 'stretch', 'repeat'])
  store.resetFormFields()
  expect([store.reliefFacadeAlongMode, store.reliefFacadeAcrossMode, store.reliefYardAlongMode, store.reliefYardAcrossMode]).toEqual(['stretch', 'repeat', 'stretch', 'repeat'])
})

it('loads independent explicit side profiles and clears all four fields on reset', () => {
  const store = useWicketFormStore()
  store.loadFromApi(payload)
  expect(store.fillingProfileFacade).toEqual({ kind: 'logSiding' })
  expect(store.fillingProfileYard).toEqual({ kind: 'shipLap' })
  expect(store.fillingProfileFacadeProblem).toBeNull()
  expect(store.fillingProfileYardProblem).toBeNull()
  store.resetFormFields()
  expect([store.fillingProfileFacade, store.fillingProfileYard, store.fillingProfileFacadeProblem, store.fillingProfileYardProblem])
    .toEqual([null, null, null, null])
})

it.each([true, false, 1.5, 0, '0725', '725tail', ' 725', Number.MAX_SAFE_INTEGER + 1])('checks original selected FK %j before general numeric hydration', id => {
  const store = useWicketFormStore()
  store.loadFromApi({ ...payload, idFacade: id, idYard: id })
  expect(store.fillingProfileFacade).toBeNull()
  expect(store.fillingProfileYard).toBeNull()
  expect(store.fillingProfileFacadeProblem).toMatchObject({ code: 'invalid' })
  expect(store.fillingProfileYardProblem).toMatchObject({ code: 'invalid' })
})

it('does not retain a previous renderer or infer one from a renamed caption on reload', () => {
  const store = useWicketFormStore()
  store.loadFromApi(payload)
  store.loadFromApi({ idFacade: 725, idYard: 819, materialFacade: 'С-8', materialYard: 'Бревно' })
  expect(store.fillingProfileFacade).toBeNull()
  expect(store.fillingProfileYard).toBeNull()
  expect(store.fillingProfileFacadeProblem).toMatchObject({ code: 'invalid' })
  expect(store.fillingProfileYardProblem).toMatchObject({ code: 'invalid' })
})

it.each([null, '', undefined])('does not attach a renderer to an unselected material %j', id => {
  const store = useWicketFormStore()
  store.loadFromApi({ ...payload, idFacade: id, idYard: id })
  expect([store.fillingProfileFacade, store.fillingProfileYard, store.fillingProfileFacadeProblem, store.fillingProfileYardProblem])
    .toEqual([null, null, null, null])
})

it('retains the saved caption and unavailable diagnostic without a fabricated renderer', () => {
  const store = useWicketFormStore()
  store.loadFromApi({ ...payload, fillingProfileFacade: null,
    fillingProfileFacadeProblem: { code: 'unavailable', message: 'Материал недоступен' } })
  expect(store.materialFacade).toBe('Одинаковая подпись')
  expect(store.fillingProfileFacade).toBeNull()
  expect(store.fillingProfileFacadeProblem).toEqual({ code: 'unavailable', message: 'Материал недоступен' })
  expect(store.fillingProfileYard).toEqual({ kind: 'shipLap' })
})

it('treats an explicitly selected but unconfigured profile as missing rather than empty selection', () => {
  const store = useWicketFormStore()
  store.loadFromApi({ ...payload, fillingProfileFacade: null })
  expect(store.fillingProfileFacade).toBeNull()
  expect(store.fillingProfileFacadeProblem).toMatchObject({ code: 'missing' })
})
