import { beforeEach, describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('.', () => ({ default: api }))
const context = { orderId: 5, productRowId: 84, modelId: '5' }
describe('calculation failure version propagation', () => {
  beforeEach(() => { vi.resetModules(); api.post.mockReset() })
  it.each(['finalCalculate', 'recalculate'] as const)('%s advances the failed calculation version before the queued painting save', async method => {
    const wicket = await import('./wicket')
    const locks = await import('./wicketProductRowLockVersion')
    locks.rememberWicketProductRowLockVersion(context, 40)
    const changed = vi.fn(); const dispose = locks.onWicketProductRowLockVersionAdvanced(changed)
    const failure = { response: { status: 422, data: { lockVersion: 42, problems: [{ message: 'Заглушка 60×60 не настроена' }] } } }
    api.post.mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: { data: { lockVersion: 43 } } })
    const calculation = wicket[method](context)
    const saving = wicket.saveWicketData({ ...context, doesPaintingFrameCode: 'customer' })
    await expect(calculation).rejects.toBe(failure)
    await expect(saving).resolves.toMatchObject({ lockVersion: 43 })
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/wicket/type5/data', expect.objectContaining({ lockVersion: 42, doesPaintingFrameCode: 'customer' }))
    expect(changed).toHaveBeenCalledWith({ context, expectedLockVersion: 40, lockVersion: 42 })
    dispose()
  })
  it.each([undefined, null, 0, '42'])('preserves the original failure when its version is invalid: %s', async lockVersion => {
    const { finalCalculate } = await import('./wicket')
    const locks = await import('./wicketProductRowLockVersion')
    locks.rememberWicketProductRowLockVersion(context, 40)
    const failure = { response: { status: 422, data: { lockVersion } } }
    api.post.mockRejectedValueOnce(failure)
    await expect(finalCalculate(context)).rejects.toBe(failure)
    expect(locks.requireWicketProductRowLockVersion(context)).toBe(40)
  })
  it('keeps a true 409 conflict blocked instead of accepting a newer version or retrying', async () => {
    const wicket = await import('./wicket'); const locks = await import('./wicketProductRowLockVersion')
    locks.rememberWicketProductRowLockVersion(context, 40)
    const failure = { response: { status: 409, data: { lockVersion: 99 } } }
    api.post.mockRejectedValueOnce(failure)
    await expect(wicket.finalCalculate(context)).rejects.toBe(failure)
    await expect(wicket.saveWicketData({ ...context, doesPaintingFrameCode: 'customer' })).rejects.toBeInstanceOf(locks.WicketProductRowLockConflictError)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})
