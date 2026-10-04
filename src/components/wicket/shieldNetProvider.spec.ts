import { describe, expect, it } from 'vitest'

import { restoreShieldNetProvider } from './shieldNetProvider'

describe('restoreShieldNetProvider', () => {
  it.each([
    ['executor', 'executor'],
    ['customer', 'customer'],
    ['', ''],
  ])('restores saved provider %j', (saved, expected) => {
    expect(restoreShieldNetProvider(saved)).toBe(expected)
  })

  it.each([undefined, null, 'unexpected'])('uses executor for missing or unsupported value %j', (saved) => {
    expect(restoreShieldNetProvider(saved)).toBe('executor')
  })
})
