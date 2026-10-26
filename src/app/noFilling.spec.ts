import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isFillingSideCount, fillingSideCountLabel } from './fillingSideCounts'
import { readFillingSideCount } from './api/legacyFillingSideCounts'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'
import { useWicketWizardStore } from '../stores/wicket/wicketWizardStore'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
const routes = Object.values(import.meta.glob('../pages/wicket/type*Route.ts', { eager: true })) as Array<Record<string, any>>
describe('explicit no filling', () => {
  it('accepts numeric zero, keeps invalid coercions invalid and serializes zero', () => {
    expect(isFillingSideCount(0)).toBe(true)
    expect(fillingSideCountLabel(0)).toBe('Без заполнения')
    expect(readFillingSideCount({ fillingSideCount: 0 })).toBe(0)
    expect(canonicalizeWicketRootSavePayload({ orderId: 1, productRowId: 1, modelId: '1', fillSide: 0 }).fillingSideCount).toBe(0)
    for (const value of ['0', false, null]) expect(isFillingSideCount(value)).toBe(false)
  })
  it.each(routes)('skips material and orientation in both directions', module => {
    const route = Object.values(module).find(value => value && typeof value === 'object' && 'sections' in value)
    const state = { fillSide: 0, modelId: '1', materialFacadeGlob: null, materialYardGlob: null, availableSections: [], isThereLock: 0 }
    expect(route.next('page2', state)).toBe('page3')
    expect(route.prev('page3', state)).toBe('page2')
    expect(route.menu(state).some((item: any) => item.page === 'page6')).toBe(false)
    expect(route.validations(state).get('page2')?.valid).toBe(true)
  })
  it('does not reopen a hidden saved orientation step', () => {
    setActivePinia(createPinia())
    useWicketFormStore().loadFromApi({ modelId: '1', fillingSideCount: 0, activePage: 'page6', visitedPages: ['page7', 'page5', 'page2', 'page6'] })
    expect(useWicketWizardStore().activePage).toBe('page3')
    expect(useWicketWizardStore().visitedPages).not.toContain('page6')
  })
  it('loads zero as complete and removes stale filling choices without changing paint', () => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    store.loadFromApi({ fillingSideCount: 0, idFacade: 123, idYard: 456, materialFacade: 'stale', materialFacadeGlob: 'siding' })
    expect(store.fillSide).toBe(0)
    expect(store.isFillSectionIncomplete).toBe(false)
    expect(store.idFacade).toBe('')
    expect(store.idYard).toBe('')
    expect(store.materialFacadeGlob).toBe(null)
    expect(store.data.some(block => block.blockCode === 'fillingFacade')).toBe(false)
  })
})
