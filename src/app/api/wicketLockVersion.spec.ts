import { describe, expect, it } from 'vitest'

import {
  forgetWicketLockVersion,
  rememberWicketLockVersion,
  requireWicketLockVersion,
} from './wicketLockVersion'

describe('wicket lock version registry', () => {
  it('remembers versions separately for each order item and forgets only the requested item', () => {
    const first = { orderId: 42, orderItemId: 7, modelId: '1' }
    const second = { orderId: 42, orderItemId: 8, modelId: '1' }

    expect(rememberWicketLockVersion(first, 4)).toBe(4)
    expect(requireWicketLockVersion(first)).toBe(4)
    expect(() => requireWicketLockVersion(second)).toThrow('Версия позиции не загружена')
    expect(() => rememberWicketLockVersion(first, null)).toThrow('Некорректная версия позиции')
    expect(requireWicketLockVersion(first)).toBe(4)
    forgetWicketLockVersion(first)
    expect(() => requireWicketLockVersion(first)).toThrow('Версия позиции не загружена')
  })
})
