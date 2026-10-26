let hasNavigated = false

function isSafeReturnUrl(value: unknown): value is string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.startsWith('/\\')
    || [...value].some(char => char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  ) return false

  try {
    return new URL(value, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

export function getProductRowReturnUrl(): string | null {
  const returnUrl = window._PARAMS_?.placementOptions?.params?.returnUrl
  return isSafeReturnUrl(returnUrl) ? returnUrl : null
}

function navigateToSafeUrl(url: string): boolean {
  if (hasNavigated) return false

  hasNavigated = true
  const testNavigateTop = window.__productRowsNavigateTop__
  if (testNavigateTop) {
    testNavigateTop(url)
  } else {
    const topWindow = window.top
    if (topWindow) topWindow.location.href = url
  }
  return true
}

export function navigateToProductRows(): boolean {
  const returnUrl = getProductRowReturnUrl()
  if (!returnUrl) return false

  return navigateToSafeUrl(returnUrl)
}

export function navigateToCreatedOrderProductRows(orderId: number): boolean {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return false

  const template = window._PARAMS_?.placementOptions?.params?.productRowsUrlTemplate
  if (typeof template !== 'string') return false

  const marker = '{orderId}'
  const markerIndex = template.indexOf(marker)
  if (markerIndex === -1 || template.indexOf(marker, markerIndex + marker.length) !== -1) return false

  const url = `${template.slice(0, markerIndex)}${String(orderId)}${template.slice(markerIndex + marker.length)}`
  if (!isSafeReturnUrl(url)) return false

  return navigateToSafeUrl(url)
}
