import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { navigateToPlacementPath } from './placementInitialNavigation'

describe('placement initial navigation', () => {
  it('preserves strict product row query parameters', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/wicket/type1', component: { template: '<div />' } }],
    })

    await navigateToPlacementPath(
      router,
      '/wicket/type1?orderId=3&productRowId=3',
    )

    expect(router.currentRoute.value.path).toBe('/wicket/type1')
    expect(router.currentRoute.value.query).toEqual({ orderId: '3', productRowId: '3' })
  })
})
