import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('.', () => ({ default: api }))

describe('opening options API', () => {
  beforeEach(() => { vi.resetModules(); api.get.mockReset() })
  afterEach(() => vi.unstubAllEnvs())

  it('preserves arbitrary foreign keys, duplicate labels and explicit properties', async () => {
    const response = {
      options: [
        { id: 819, name: 'Одинаковое название', pathPhoto: null, opensOutward: false, hingeSide: 'right' },
        { id: 920, name: 'Одинаковое название', pathPhoto: '/img/custom.jpg', opensOutward: true, hingeSide: 'left' },
      ], problems: [{ id: 1220, message: 'Не настроен' }],
    }
    api.get.mockResolvedValue({ data: { data: response } })
    const { getOpeningOptions } = await import('./wicket')
    expect(await getOpeningOptions()).toEqual(response)
    expect(api.get).toHaveBeenCalledWith('/api/wicket/base-model/get-opening-options')
  })

  it.each([
    { options: [{ id: 819, name: 'Наружу / Левая', pathPhoto: null }], problems: [] },
    { options: [{ id: 819, name: 'Название', opensOutward: '1', hingeSide: 'left' }], problems: [] },
    { options: [], problems: null },
    { options: [
      { id: 819, name: 'Первый', pathPhoto: null, opensOutward: true, hingeSide: 'left' },
      { id: 819, name: 'Второй', pathPhoto: null, opensOutward: false, hingeSide: 'right' },
    ], problems: [] },
    { options: [], problems: [{ id: 819, message: null }] },
  ])('rejects a broken response instead of guessing options', async (response) => {
    api.get.mockResolvedValue({ data: { data: response } })
    const { getOpeningOptions } = await import('./wicket')
    await expect(getOpeningOptions()).rejects.toThrow()
  })

  it('keeps mock loading consistent with mock reference properties', async () => {
    vi.stubEnv('VITE_MOCK', 'true')
    const { getOpeningOptions } = await import('./wicket')
    const { mockLoadWicketData } = await import('./mockWicket')
    const saved = await mockLoadWicketData(42)
    const options = await getOpeningOptions()
    const selected = options.options.find(option => option.id === saved.openingOptionId)
    expect(selected).toBeDefined()
    expect(saved.openingOrientation).toEqual({ opensOutward: selected!.opensOutward, hingeSide: selected!.hingeSide })
    expect(api.get).not.toHaveBeenCalled()
  })
})
