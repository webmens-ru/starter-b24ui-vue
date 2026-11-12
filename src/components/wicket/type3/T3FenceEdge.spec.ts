import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import Edge from './T3FenceEdge.vue'
vi.mock('../../../app/api/wicket', async original => ({ ...(await original<typeof import('../../../app/api/wicket')>()), saveWicketData: vi.fn() }))
function page(side: 'facade' | 'yard') {
  return mount(Edge, { props: { side }, global: { stubs: { B24Button: { props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' } } } })
}
beforeEach(() => {
  setActivePinia(createPinia())
  const c = useCalculation(); c.reset()
  c.orderId.value = 42; c.productRowId.value = 7; c.modelId.value = '3'; c.raspolozheniyePolotna.value = 'vertical'
  c.fenceEdgeOptions.value = [{ id: 7, name: 'Любое имя', isHorizontal: 0, isVertical: 1, maskFile: '/mask.svg' }, { id: 8, name: 'Второй', isHorizontal: 1, isVertical: 0, maskFile: null }]
  vi.mocked(saveWicketData).mockReset().mockResolvedValue({ lockVersion: 3 })
})
it.each(['facade', 'yard'] as const)('filters and saves %s by ID without selecting a default', async side => {
  const w = page(side)
  expect(w.findAll('input')).toHaveLength(1)
  expect((w.get('input').element as HTMLInputElement).checked).toBe(false)
  const next = w.findAll('button').find(b => b.text() === 'Далее')!
  await next.trigger('click'); await flushPromises()
  expect(saveWicketData).not.toHaveBeenCalled()
  await w.get('input').setValue(); await flushPromises()
  await next.trigger('click'); await flushPromises()
  expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({ [side === 'yard' ? 'fenceEdgeYardId' : 'fenceEdgeFacadeId']: 7 }))
  expect(w.emitted('next')).toHaveLength(1)
})
it('keeps saved choice after failed persistence and filters horizontal options', async () => {
  const c = useCalculation(); c.raspolozheniyePolotna.value = 'horizontal'
  c.fenceEdgeFacadeId.value = 7
  const w = page('facade')
  expect(w.text()).toContain('Второй')
  expect(w.text()).not.toContain('Любое имя')
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('network'))
  await w.get('input').setValue(); await flushPromises()
  expect(c.fenceEdgeFacadeId.value).toBe(7)
  expect(w.emitted('next')).toBeUndefined()
  expect(w.get('[role="alert"]').text()).toContain('Не удалось')
})
it('allows returning without a choice and does not save a confirmed selection twice', async () => {
  const w = page('facade')
  await w.findAll('button').find(b => b.text() === 'Назад')!.trigger('click')
  const step = w.vm as unknown as { validateBeforeLeave(): boolean | Promise<boolean> }
  expect(await step.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).not.toHaveBeenCalled()
  await w.get('input').setValue(); await flushPromises()
  expect(await step.validateBeforeLeave()).toBe(true)
  expect(await step.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenCalledTimes(1)
})
