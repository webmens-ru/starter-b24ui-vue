import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from './wicketFormStore'

const payload = {
  hasStolby: 1, postsPresenceProblem: null, stolbId: 819, stolbName: 'не размеры',
  postProfile: { sizeA: 80, sizeB: 40 }, postProfileProblem: null,
  peremichkaPolozheniyeId: 721, jumperPlacement: 'above', jumperPlacementProblem: null,
  assortmentJumperId: '923', peremichkaSortamentName: '60/60',
  jumperProfile: { sizeA: 50, sizeB: 25 }, jumperProfileProblem: null,
}

describe('pipe profile hydration', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads numeric properties independently of captions and resets all descriptors', () => {
    const store = useWicketFormStore()
    store.loadFromApi(payload)
    expect(store.postProfile).toEqual({ sizeA: 80, sizeB: 40 })
    expect(store.jumperProfile).toEqual({ sizeA: 50, sizeB: 25 })
    expect(store.postProfileProblem).toBeNull()
    expect(store.jumperProfileProblem).toBeNull()
    store.resetFormFields()
    expect([store.postProfile, store.postProfileProblem, store.jumperProfile, store.jumperProfileProblem]).toEqual([null, null, null, null])
  })

  it.each([true, 1.5, '819tail', '0819', 0])('rejects malformed raw selected FK %j before numeric hydration', (id) => {
    const store = useWicketFormStore()
    store.loadFromApi({ ...payload, stolbId: id, assortmentJumperId: id })
    expect(store.postProfile).toBeNull()
    expect(store.jumperProfile).toBeNull()
    expect(store.postProfileProblem).toMatchObject({ code: 'invalid' })
    expect(store.jumperProfileProblem).toMatchObject({ code: 'invalid' })
  })

  it('does not retain profiles from a previous load or derive them from captions', () => {
    const store = useWicketFormStore()
    store.loadFromApi(payload)
    store.loadFromApi({ ...payload, postProfile: undefined, jumperProfile: { sizeA: '50', sizeB: 25 } })
    expect(store.postProfile).toBeNull()
    expect(store.jumperProfile).toBeNull()
    expect(store.postProfileProblem).toMatchObject({ code: 'invalid' })
    expect(store.jumperProfileProblem).toMatchObject({ code: 'invalid' })
  })

  it.each([
    { hasStolby: 0, jumperPlacement: 'none' },
    { hasStolby: null, jumperPlacement: 'unknown' },
    { postsPresenceProblem: { code: 'invalid', message: 'Ошибка' }, jumperPlacementProblem: { code: 'inactive', message: 'Неактивно' } },
  ])('does not hydrate profiles for unused or untrusted usage flags %j', (flags) => {
    const store = useWicketFormStore()
    store.loadFromApi({ ...payload, ...flags })
    expect([store.postProfile, store.postProfileProblem, store.jumperProfile, store.jumperProfileProblem]).toEqual([null, null, null, null])
  })

  it('retains authoritative unavailable diagnostics without inventing dimensions', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ ...payload, postProfile: null, postProfileProblem: { code: 'unavailable', message: 'Столб недоступен' } })
    expect(store.postProfile).toBeNull()
    expect(store.postProfileProblem).toEqual({ code: 'unavailable', message: 'Столб недоступен' })
  })

  it('reports missing required selections rather than accepting detached profiles', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ ...payload, stolbId: null, assortmentJumperId: '' })
    expect(store.postProfile).toBeNull()
    expect(store.jumperProfile).toBeNull()
    expect(store.postProfileProblem).toMatchObject({ code: 'missing' })
    expect(store.jumperProfileProblem).toMatchObject({ code: 'missing' })
  })
})
