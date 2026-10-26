import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from './wicketFormStore'

describe('opening orientation hydration', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads server properties and does not interpret labels or IDs', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ openingOptionId: 819, openingOptionName: 'Внутрь / Правая', openingOrientation: { opensOutward: true, hingeSide: 'left' } })
    expect(store.openingOrientation).toEqual({ opensOutward: true, hingeSide: 'left' })
    expect(store.openingOrientationProblem).toBeNull()
    store.loadFromApi({ openingOptionId: 1, openingOptionName: 'Наружу / Правая' })
    expect(store.openingOrientation).toBeNull()
    expect(store.openingOrientationProblem).toMatchObject({ code: 'invalid' })
  })

  it('preserves the inactive diagnostic and clears derived state on reset', () => {
    const store = useWicketFormStore()
    store.loadFromApi({ openingOptionId: 819, openingOrientation: { opensOutward: false, hingeSide: 'right' }, openingOrientationProblem: { code: 'inactive', message: 'Неактивен' } })
    expect(store.openingOrientationProblem).toEqual({ code: 'inactive', message: 'Неактивен' })
    store.resetFormFields()
    expect(store.openingOrientation).toBeNull()
    expect(store.openingOrientationProblem).toBeNull()
  })

  it.each([true, 1.5, '3tail', '001'])('does not let general numeric hydration disguise malformed FK %j', (openingOptionId) => {
    const store = useWicketFormStore()
    store.loadFromApi({ openingOptionId, openingOrientation: { opensOutward: true, hingeSide: 'left' } })
    expect(store.openingOrientation).toBeNull()
    expect(store.openingOrientationProblem).toMatchObject({ code: 'invalid' })
  })
})
