import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadNavigation() {
  return import('./productRowReturnNavigation')
}

function setReturnUrl(returnUrl: unknown): void {
  window._PARAMS_ = {
    placement: 'DEFAULT',
    placementOptions: {
      type: 'openApplication',
      title: '',
      entity: '',
      viewMode: 'view',
      params: { returnUrl } as unknown as TPlacementParams,
    },
  }
}

function setProductRowsUrlTemplate(productRowsUrlTemplate: unknown): void {
  window._PARAMS_ = {
    placement: 'DEFAULT',
    placementOptions: {
      type: 'openApplication',
      title: '',
      entity: '',
      viewMode: 'view',
      params: { productRowsUrlTemplate } as unknown as TPlacementParams,
    },
  }
}

describe('product-row return navigation', () => {
  const navigateTop = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    Reflect.set(window, '__productRowsNavigateTop__', navigateTop)
  })

  it.each([
    '/dealer/orders/view?id=42',
    '/admin/orders/view?id=7',
  ])('accepts server-owned relative return URLs: %s', async (returnUrl) => {
    setReturnUrl(returnUrl)

    const { getProductRowReturnUrl } = await loadNavigation()

    expect(getProductRowReturnUrl()).toBe(returnUrl)
  })

  it.each([
    'https://attacker.example/orders/42',
    '//attacker.example/orders/42',
    '',
    '/dealer/\u0000orders/view',
    '/dealer/\u001forders/view',
    '/dealer/\u007forders/view',
    '/\\attacker.example/orders/42',
    '/\n/attacker.example/orders/42',
  ])('rejects an unsafe or malformed return URL: %s', async (returnUrl) => {
    setReturnUrl(returnUrl)

    const { getProductRowReturnUrl, navigateToProductRows } = await loadNavigation()

    expect(getProductRowReturnUrl()).toBeNull()
    expect(navigateToProductRows()).toBe(false)
    expect(navigateTop).not.toHaveBeenCalled()
  })

  it('navigates the top window only once for an exit generation', async () => {
    setReturnUrl('/dealer/orders/view?id=42')

    const { navigateToProductRows } = await loadNavigation()

    expect(navigateToProductRows()).toBe(true)
    expect(navigateToProductRows()).toBe(false)
    expect(navigateTop).toHaveBeenCalledTimes(1)
    expect(navigateTop).toHaveBeenCalledWith('/dealer/orders/view?id=42')
  })

  it('uses href assignment for the default top-window adapter', async () => {
    setReturnUrl('/dealer/orders/view?id=42')
    Reflect.deleteProperty(window, '__productRowsNavigateTop__')
    const ownTopDescriptor = Object.getOwnPropertyDescriptor(window, 'top')
    Object.defineProperty(window, 'top', {
      configurable: true,
      value: {
        location: {
          set href(url: string) {
            navigateTop(url)
          },
        },
      },
    })

    try {
      const { navigateToProductRows } = await loadNavigation()

      expect(navigateToProductRows()).toBe(true)
      expect(navigateTop).toHaveBeenCalledWith('/dealer/orders/view?id=42')
    } finally {
      if (ownTopDescriptor) Object.defineProperty(window, 'top', ownTopDescriptor)
      else Reflect.deleteProperty(window, 'top')
    }
  })

  it('navigates to the created order product rows using its ID', async () => {
    setProductRowsUrlTemplate('/dealer/orders/product-rows?id={orderId}')

    const { navigateToCreatedOrderProductRows } = await loadNavigation()

    expect(navigateToCreatedOrderProductRows(42)).toBe(true)
    expect(navigateTop).toHaveBeenCalledWith('/dealer/orders/product-rows?id=42')
  })

  it.each([
    [0, '/dealer/orders/product-rows?id={orderId}'],
    [-1, '/dealer/orders/product-rows?id={orderId}'],
    [Number.NaN, '/dealer/orders/product-rows?id={orderId}'],
    [Number.MAX_SAFE_INTEGER + 1, '/dealer/orders/product-rows?id={orderId}'],
    [42, 'https://attacker.example/orders?id={orderId}'],
    [42, '/dealer/orders/product-rows?id=42'],
    [42, '/dealer/orders/product-rows?id={orderId}&copy={orderId}'],
    [42, '/dealer/\u0000orders/product-rows?id={orderId}'],
    [42, '//attacker.example/orders?id={orderId}'],
  ])('rejects unsafe created-order navigation for %s and %s', async (orderId, template) => {
    setProductRowsUrlTemplate(template)

    const { navigateToCreatedOrderProductRows } = await loadNavigation()

    expect(navigateToCreatedOrderProductRows(orderId as number)).toBe(false)
    expect(navigateTop).not.toHaveBeenCalled()
  })
})
