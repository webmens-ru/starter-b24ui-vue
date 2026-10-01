import { beforeEach, describe, expect, it, vi } from 'vitest'

type RequestConfig = { url?: string; baseURL?: string; headers: Record<string, string> }
const requestHandlers: Array<(config: RequestConfig) => RequestConfig> = []
const axiosInstance = {
  interceptors: {
    request: {
      use: vi.fn((handler) => {
        requestHandlers.push(handler)
      }),
    },
    response: {
      use: vi.fn(),
    },
  },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosInstance),
  },
}))

describe('api client', () => {
  beforeEach(() => {
    vi.resetModules()
    requestHandlers.length = 0
    Reflect.deleteProperty(window, '_HOSTNAME_')
    Reflect.deleteProperty(window, '_ACCESS_TOKEN_')
  })

  it('uses current window host even when it appears after module import', async () => {
    await import('./index')
    window._HOSTNAME_ = 'https://test-lk.doorhan-krd.ru'

    const config = requestHandlers[0]({ url: '/api/check', headers: {} })

    expect(config.baseURL).toBe('https://test-lk.doorhan-krd.ru')
  })
})
