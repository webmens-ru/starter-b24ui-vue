import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'

beforeEach(() => setActivePinia(createPinia()))
it('applies server edge clearing to the current configuration and ignores stale acknowledgements', () => {
  const c = useCalculation()
  c.orderId.value = 42; c.productRowId.value = 7; c.modelId.value = '3'
  c.fenceEdgeFacadeId.value = 31; c.fenceEdgeYardId.value = 32
  c.beginCoverStripMutation()({ lockVersion: 4, fenceEdgeFacadeId: null, fenceEdgeYardId: 32 })
  expect(c.fenceEdgeFacadeId.value).toBeNull()
  expect(c.fenceEdgeYardId.value).toBe(32)
  c.beginCoverStripMutation()({ lockVersion: 3, fenceEdgeFacadeId: 31, fenceEdgeYardId: null })
  expect(c.fenceEdgeFacadeId.value).toBeNull()
  expect(c.fenceEdgeYardId.value).toBe(32)
  const late = c.beginCoverStripMutation()
  c.productRowId.value = 8
  late({ lockVersion: 5, fenceEdgeFacadeId: 99, fenceEdgeYardId: null })
  expect(c.fenceEdgeFacadeId.value).toBeNull()
  expect(c.fenceEdgeYardId.value).toBe(32)
})
