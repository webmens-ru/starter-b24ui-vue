import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { getFenceGapOptions, saveWicketData, recalculate } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import Trim from './T3FenceYardTrim.vue'
vi.mock('../../../app/api/wicket', async original => ({ ...(await original<typeof import('../../../app/api/wicket')>()), getFenceGapOptions: vi.fn(), saveWicketData: vi.fn(), recalculate: vi.fn() }))
beforeEach(() => {
  setActivePinia(createPinia()); const calc = useCalculation(); calc.reset()
  calc.orderId.value = calc.number.value = 42; calc.productRowId.value = 7; calc.modelId.value = '3'; calc.gapName.value = 28
  vi.mocked(getFenceGapOptions).mockReset().mockImplementation(async payload => [{ id: 1, gapMm: 28, quantity: payload.yardTrimCode === 'edge' ? 9 : 7, label: 'Переписанная подпись', yardEdgeTrimAvailable: true, yardEdgeTrimWidthMm: 40 }])
  vi.mocked(recalculate).mockReset().mockResolvedValue({ priceDealer: '200', priceRetail: '300' } as never)
  vi.mocked(saveWicketData).mockReset().mockResolvedValue(undefined as never)
})
function page() { return mount(Trim, { global: { stubs: { B24Button: { props: ['label','disabled'], template: '<button :disabled="disabled">{{ label }}</button>' } } } }) }
it('requires explicit choice and saves only its code before refreshing normalized count', async () => {
  const wrapper = page(); await flushPromises()
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(false)
  await wrapper.get('[data-testid="trim-edge"]').setValue(); await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith({ orderId: 42, productRowId: 7, modelId: '3', manufacturerFacadeId: null, colorFacadeId: null, manufacturerYardId: null, colorYardId: null, reachedStep: 'page2_yard_fence_trim', visitedPages: '["page2_yard_fence_trim"]', applySharedFenceLaying: true, yardTrimCode: 'edge' })
  expect(useCalculation().numberOfSticksYard.value).toBe(9)
})
it('retains an unsaved choice and blocks leaving until retry succeeds', async () => {
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  const wrapper = page(); await flushPromises(); await wrapper.get('[data-testid="trim-none"]').setValue(); await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  expect(useCalculation().yardTrimCode.value).toBeNull()
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(true)
  expect(useCalculation().yardTrimCode.value).toBe('none')
})
it('disables impossible edge trimming without choosing a replacement gap', async () => {
  vi.mocked(getFenceGapOptions).mockResolvedValue([{ id: 1, gapMm: 28, quantity: 7, label: 'Другое имя', yardEdgeTrimAvailable: false, yardEdgeTrimWidthMm: -1 }])
  const wrapper = page(); await flushPromises()
  expect((wrapper.get('[data-testid="trim-edge"]').element as HTMLInputElement).disabled).toBe(true)
  expect(wrapper.text()).toContain('Подрезка недоступна')
  expect(useCalculation().gapName.value).toBe(28)
  expect(saveWicketData).not.toHaveBeenCalled()
})

it('refreshes an existing price after saving the trim choice', async () => {
  const calc = useCalculation(); calc.priceRetail.value = '100'
  const wrapper = page(); await flushPromises(); await wrapper.get('[data-testid="trim-edge"]').setValue(); await flushPromises()
  expect(recalculate).toHaveBeenCalledWith(expect.objectContaining({ orderId: 42, productRowId: 7, modelId: '3' }))
  expect(calc.priceRetail.value).toBe('300')
  expect(calc.priceDealer.value).toBe('200')
})
it('does not calculate a price before the initial calculation', async () => {
  const wrapper = page(); await flushPromises(); await wrapper.get('[data-testid="trim-none"]').setValue(); await flushPromises()
  expect(recalculate).not.toHaveBeenCalled()
})

it('uses independent yard butt width and automatically confirms two equal cuts', async () => {
  const calc = useCalculation(); calc.gapName.value = 0; calc.layingFacadeCode.value = 'butt'; calc.thicknessFacade.value = '100'; calc.thicknessYard.value = '120'
  vi.mocked(getFenceGapOptions).mockResolvedValue([{ id: 0, gapMm: 0, quantity: 8, label: 'Любая подпись', buttTrim: { mode: 'both', widthMm: 46, quantity: 2, requiresSide: false } }])
  const wrapper = page(); await flushPromises()
  expect(wrapper.text()).toContain('46 мм')
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({ yardButtTrimCode: 'both', yardButtTrimSide: null }))
  expect(calc.yardButtTrim.value?.widthMm).toBe(46)
  expect(calc.facadeButtTrimCode.value).toBeNull()
})
it('requires a logical side for single yard butt trimming', async () => {
  const calc = useCalculation(); calc.gapName.value = 0; calc.layingFacadeCode.value = 'butt'; calc.raspolozheniyePolotna.value = 'horizontal'
  vi.mocked(getFenceGapOptions).mockResolvedValue([{ id: 0, gapMm: 0, quantity: 8, label: '', buttTrim: { mode: 'single', widthMm: 43, quantity: 1, requiresSide: true } }])
  const wrapper = page(); await flushPromises()
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(false)
  await wrapper.get('input[value="top"]').setValue()
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({ yardButtTrimCode: 'single', yardButtTrimSide: 'top' }))
})
it('blocks an unavailable yard butt layout', async () => {
  const calc = useCalculation(); calc.gapName.value = 0; calc.layingFacadeCode.value = 'butt'
  vi.mocked(getFenceGapOptions).mockResolvedValue([{ id: 0, gapMm: 0, quantity: 0, label: '', buttTrim: { mode: 'unavailable', widthMm: 0, quantity: 0, requiresSide: false } }])
  const wrapper = page(); await flushPromises()
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
})

it('keeps the facade ready during a failed yard trim edit and accepts server readiness on retry', async () => {
  const calc = useCalculation()
  calc.fillingFacadeReady.value = calc.fillingYardReady.value = true
  calc.fillingNeedsRecalculation.value = true
  calc.yardTrimCode.value = 'none'
  const wrapper = page(); await flushPromises()
  expect(calc.fillingYardReady.value).toBe(true)
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  await wrapper.get('[data-testid="trim-edge"]').setValue(); await flushPromises()
  expect(calc.fillingFacadeReady.value).toBe(true)
  expect(calc.fillingYardReady.value).toBe(false)
  vi.mocked(saveWicketData).mockImplementationOnce(async () => {
    calc.beginCoverStripMutation()({ lockVersion: 2, fillingFacadeReady: true, fillingYardReady: true, fillingNeedsRecalculation: false })
    return undefined as never
  })
  expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
  expect(calc.fillingYardReady.value).toBe(true)
  expect(calc.fillingNeedsRecalculation.value).toBe(false)
})

it('has matching yard geometry when the successful save restores readiness', async () => {
  const calc = useCalculation()
  calc.yardTrimCode.value = 'none'
  calc.fillingFacadeReady.value = calc.fillingYardReady.value = true
  const wrapper = page(); await flushPromises()
  let atAcknowledgement: unknown
  vi.mocked(saveWicketData).mockImplementationOnce(async () => {
    atAcknowledgement = [calc.yardTrimCode.value, calc.numberOfSticksYard.value]
    calc.beginCoverStripMutation()({ lockVersion: 3, fillingFacadeReady: true, fillingYardReady: true })
    return undefined as never
  })
  await wrapper.get('[data-testid="trim-edge"]').setValue(); await flushPromises()
  expect(calc.fillingYardReady.value).toBe(true)
  expect(atAcknowledgement).toEqual(['edge', 9])
})
it('keeps the edited yard hidden when candidate geometry cannot be refreshed', async () => {
  const calc = useCalculation()
  calc.yardTrimCode.value = 'none'
  calc.fillingFacadeReady.value = calc.fillingYardReady.value = true
  const wrapper = page(); await flushPromises()
  vi.mocked(getFenceGapOptions).mockRejectedValueOnce(new Error('options'))
  await wrapper.get('[data-testid="trim-edge"]').setValue(); await flushPromises()
  expect(saveWicketData).not.toHaveBeenCalled()
  expect(calc.fillingYardReady.value).toBe(false)
  expect(calc.yardTrimCode.value).toBe('none')
})
