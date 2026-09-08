import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { type AxiosRequestConfig } from 'axios'

const api = {
  get: vi.fn(),
}

vi.mock('.', () => ({ default: api }))

describe('material directory API', () => {
  beforeEach(() => {
    api.get.mockReset()
    vi.resetModules()
  })

  it('unwraps types and attribute definitions from item envelopes', async () => {
    const type = { id: 1, code: 'plug', name: 'Заглушка' }
    const attribute = {
      id: 11,
      code: 'profileWidth',
      name: 'Ширина профиля',
      dataType: 'decimal',
      unit: { code: 'mm', name: 'Миллиметр', symbol: 'мм' },
      isRequired: true,
      isFilterable: true,
      options: [],
    }
    api.get
      .mockResolvedValueOnce({ data: { data: { items: [type] } } })
      .mockResolvedValueOnce({ data: { data: { items: [attribute] } } })

    const { getMaterialAttributes, getMaterialTypes } = await import('./wicket')

    await expect(getMaterialTypes()).resolves.toEqual([type])
    await expect(getMaterialAttributes('plug')).resolves.toEqual([attribute])
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/dict/material/types')
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/dict/material/attributes', {
      params: { typeCode: 'plug' },
    })
  })

  it('passes typed filters and unwraps list and item responses', async () => {
    const item = {
      id: 101,
      typeCode: 'plug',
      name: 'Заглушка 60',
      article: 'PLUG-60',
      price: 125.5,
      unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
      attributes: { profileWidth: 60, withFlange: true },
      imageUrls: [],
      documents: [],
    }
    let serializedUrl = ''
    api.get
      .mockImplementationOnce((url: string, config?: AxiosRequestConfig) => {
        serializedUrl = axios.getUri({ url, ...config })
        return Promise.resolve({ data: { data: { items: [item] } } })
      })
      .mockResolvedValueOnce({ data: { data: { items: [item] } } })

    const { getMaterialItem, getMaterialItems } = await import('./wicket')
    const query = {
      typeCode: 'plug',
      productType: 'wicket' as const,
      modelId: 1,
      attributes: { profileWidth: 60, withFlange: true, isPainted: false },
    }

    await expect(getMaterialItems(query)).resolves.toEqual([item])
    await expect(getMaterialItem(101)).resolves.toEqual(item)
    expect(serializedUrl).toBe(
      '/api/dict/material/items?typeCode=plug&productType=wicket&modelId=1&attributes%5BprofileWidth%5D=60&attributes%5BwithFlange%5D=1&attributes%5BisPainted%5D=0',
    )
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/dict/material/view', { params: { id: 101 } })
  })

  it('loads standalone catalog items without wicket applicability parameters', async () => {
    const item = {
      id: 104,
      typeCode: 'plug',
      name: 'Универсальная заглушка',
      article: 'PLUG-STANDALONE',
      price: 75,
      unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
      attributes: {},
      imageUrls: [],
      documents: [],
    }
    api.get.mockResolvedValue({ data: { data: { items: [item] } } })

    const { getStandaloneMaterialItems } = await import('./wicket')

    await expect(getStandaloneMaterialItems('plug')).resolves.toEqual([item])
    expect(api.get).toHaveBeenCalledWith('/api/dict/material/standalone-items', {
      params: { typeCode: 'plug' },
    })
  })
})
