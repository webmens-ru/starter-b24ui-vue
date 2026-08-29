import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    api.get
      .mockResolvedValueOnce({ data: { data: { items: [item] } } })
      .mockResolvedValueOnce({ data: { data: { items: [item] } } })

    const { getMaterialItem, getMaterialItems } = await import('./wicket')
    const query = {
      typeCode: 'plug',
      productType: 'wicket' as const,
      modelId: 1,
      attributes: { profileWidth: 60, withFlange: true },
    }

    await expect(getMaterialItems(query)).resolves.toEqual([item])
    await expect(getMaterialItem(101)).resolves.toEqual(item)
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/dict/material/items', { params: query })
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/dict/material/view', { params: { id: 101 } })
  })
})
