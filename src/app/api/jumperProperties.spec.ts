import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('.', () => ({ default: api }))

describe('jumper options API properties', () => {
  beforeEach(() => { vi.resetModules(); api.post.mockReset() })
  afterEach(() => vi.unstubAllEnvs())

  it('preserves arbitrary keys and duplicate captions with independent properties', async () => {
    const response = { availablePolozheniyeJumper: [
      { id: 1733, name: 'Без перемычки', placement: 'behind', hasJumper: true },
      { id: 2941, name: 'Без перемычки', placement: 'above', hasJumper: true },
      { id: 4811, name: 'Любая подпись', placement: 'none', hasJumper: false },
    ] }
    api.post.mockResolvedValue({ data: { data: response } })
    const { getPolozhenieJumper } = await import('./wicket')
    expect(await getPolozhenieJumper(3, 819)).toEqual(response)
    expect(api.post).toHaveBeenCalledWith('/api/wicket/type3/get-available-polozheniye-jumper', { openingOptionId: 819 })
  })

  it.each([
    null, {}, { availablePolozheniyeJumper: null },
    { availablePolozheniyeJumper: [{ id: 1733, name: 'Перемычка над створкой' }] },
    ...[null, 'Перемычка за створкой', 3, ''].map(placement => ({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Перемычка над створкой', placement, hasJumper: true },
    ] })),
    ...[false, 1, '1', null].map(hasJumper => ({ availablePolozheniyeJumper: [
      { id: 1733, name: 'Подпись', placement: 'above', hasJumper },
    ] })),
    { availablePolozheniyeJumper: [{ id: 1733, name: 'Подпись', placement: 'none', hasJumper: true }] },
    ...[0, -1, '1733', true, 1.5].map(id => ({ availablePolozheniyeJumper: [
      { id, name: 'Подпись', placement: 'none', hasJumper: false },
    ] })),
    { availablePolozheniyeJumper: [{ id: 1733, name: null, placement: 'none', hasJumper: false }] },
    { availablePolozheniyeJumper: [
      { id: 1733, name: 'Первая', placement: 'none', hasJumper: false },
      { id: 1733, name: 'Вторая', placement: 'above', hasJumper: true },
    ] },
  ])('rejects incomplete, contradictory or ambiguous catalogs', async response => {
    api.post.mockResolvedValue({ data: { data: response } })
    const { getPolozhenieJumper } = await import('./wicket')
    await expect(getPolozhenieJumper(1, 819)).rejects.toThrow()
  })

  it('accepts an explicitly empty catalog', async () => {
    api.post.mockResolvedValue({ data: { data: { availablePolozheniyeJumper: [] } } })
    const { getPolozhenieJumper } = await import('./wicket')
    expect(await getPolozhenieJumper(1, 819)).toEqual({ availablePolozheniyeJumper: [] })
  })

  it('uses consistent mock properties and excludes behind for inward opening', async () => {
    vi.stubEnv('VITE_MOCK', 'true')
    const { getPolozhenieJumper } = await import('./wicket')
    const { mockLoadWicketData } = await import('./mockWicket')
    const saved = await mockLoadWicketData(42)
    const outward = await getPolozhenieJumper(1, 1)
    expect(outward.availablePolozheniyeJumper.map(option => option.placement)).toEqual(['none', 'above', 'behind'])
    expect(outward.availablePolozheniyeJumper.find(option => option.id === saved.peremichkaPolozheniyeId))
      .toMatchObject({ placement: saved.jumperPlacement, hasJumper: false })
    const inward = await getPolozhenieJumper(1, 1220)
    expect(inward.availablePolozheniyeJumper.map(option => option.placement)).toEqual(['none', 'above'])
    await expect(getPolozhenieJumper(1, 999999)).rejects.toThrow()
    expect(api.post).not.toHaveBeenCalled()
  })
})
