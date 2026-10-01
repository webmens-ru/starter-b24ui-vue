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

export function navigateToProductRows(): boolean {
  if (hasNavigated) return false

  const returnUrl = getProductRowReturnUrl()
  if (!returnUrl) return false

  hasNavigated = true
  const testNavigateTop = window.__productRowsNavigateTop__
  if (testNavigateTop) {
    testNavigateTop(returnUrl)
  } else {
    const topWindow = window.top
    if (topWindow) topWindow.location.href = returnUrl
  }
  return true
}
