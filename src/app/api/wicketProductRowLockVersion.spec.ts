import { describe, expect, it, vi } from 'vitest'

import {
  forgetWicketProductRowLockVersion,
  onWicketProductRowLockConflict,
  rememberWicketProductRowLockVersion,
  requireWicketProductRowLockVersion,
  runWicketProductRowLockMutation,
  WicketProductRowLockConflictError,
} from './wicketProductRowLockVersion'

describe('wicket lock version registry', () => {
  it('remembers versions separately for each order item and forgets only the requested item', () => {
    const first = { orderId: 42, productRowId: 7, modelId: '1' }
    const second = { orderId: 42, productRowId: 8, modelId: '1' }

    expect(rememberWicketProductRowLockVersion(first, 4)).toBe(4)
    expect(requireWicketProductRowLockVersion(first)).toBe(4)
    expect(() => requireWicketProductRowLockVersion(second)).toThrow('Версия позиции не загружена')
    expect(() => rememberWicketProductRowLockVersion(first, null)).toThrow('Некорректная версия позиции')
    expect(requireWicketProductRowLockVersion(first)).toBe(4)
    forgetWicketProductRowLockVersion(first)
    expect(() => requireWicketProductRowLockVersion(first)).toThrow('Версия позиции не загружена')
  })

  it('does not let a delayed lower load overwrite a newer version', () => {
    const context = { orderId: 42, productRowId: 7, modelId: '1' }

    expect(rememberWicketProductRowLockVersion(context, 5)).toBe(5)
    expect(rememberWicketProductRowLockVersion(context, 4)).toBe(5)
    expect(requireWicketProductRowLockVersion(context)).toBe(5)
  })

  it('serializes same-product-row mutations with the version advanced by the first response', async () => {
    const context = { orderId: 42, productRowId: 17, modelId: '1' }
    let resolveFirst!: () => void
    const firstFinished = new Promise<void>(resolve => { resolveFirst = resolve })
    const seenVersions: number[] = []
    rememberWicketProductRowLockVersion(context, 4)

    const first = runWicketProductRowLockMutation(context, async version => {
      seenVersions.push(version)
      await firstFinished
      rememberWicketProductRowLockVersion(context, 5)
    })
    const second = runWicketProductRowLockMutation(context, async version => { seenVersions.push(version) })

    await Promise.resolve()
    expect(seenVersions).toEqual([4])
    resolveFirst()
    await Promise.all([first, second])
    expect(seenVersions).toEqual([4, 5])
  })

  it('does not start a mutation queued behind a deferred 409 and notifies once', async () => {
    const context = { orderId: 42, productRowId: 18, modelId: '1' }
    const conflict = { response: { status: 409 } }
    const listener = vi.fn()
    const secondMutation = vi.fn()
    let rejectFirst!: (reason: unknown) => void
    const firstResponse = new Promise<never>((_resolve, reject) => { rejectFirst = reject })
    const unsubscribe = onWicketProductRowLockConflict(listener)
    rememberWicketProductRowLockVersion(context, 4)

    const first = runWicketProductRowLockMutation(context, async () => firstResponse)
    const second = runWicketProductRowLockMutation(context, async () => secondMutation())
    await Promise.resolve()
    expect(secondMutation).not.toHaveBeenCalled()
    rejectFirst(conflict)

    await expect(first).rejects.toBe(conflict)
    await expect(second).rejects.toBeInstanceOf(WicketProductRowLockConflictError)

    expect(secondMutation).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(context)
    unsubscribe()
  })
})
