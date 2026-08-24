import { describe, expect, it } from 'vitest'

import { router } from './router'

describe('order composition route', () => {
  it('resolves product rows and no longer registers the legacy items route', () => {
    const route = router.resolve('/order/12/product-rows')

    expect(route.matched).toHaveLength(1)
    expect(route.name).toBe('product-rows')
    expect(route.params.orderId).toBe('12')
    expect(router.resolve('/order/12/items').matched).toHaveLength(0)
  })
})
