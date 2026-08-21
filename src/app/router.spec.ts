import { describe, expect, it } from 'vitest'

import { router } from './router'

describe('order composition route', () => {
  it('resolves a canonical named route with the order id parameter', () => {
    const route = router.resolve('/order/42/items')

    expect(route.name).toBe('order-items')
    expect(route.params.orderId).toBe('42')
  })
})
