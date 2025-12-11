import api from './index'

export const currencyList = ['руб', 'usd', 'eur'] as const
export type Currency = (typeof currencyList)[number]

export type Good = {
  id: number
  title: string
  type: {
    id: number
    title: string
  }
  unit: {
    id: number
    title: string
  }
  price_rub: number
  price_usd: number
  price_eur: number
  contractor: {
    id: number
    title: string
  }
  cost_per_unit: number // себестоимость всегда в рублях
}

type FetchGoodsParams = {
  dealTypeBuildingId?: number
  productTypeId?: number
}

export async function fetchGoods(params: FetchGoodsParams = {}): Promise<Good[]> {
  try {
    const { dealTypeBuildingId, productTypeId } = params

    const response = await api.post<Good[]>('/api/sp1222/list', {
      dealTypeBuildingId,
      productTypeId,
    })
    const data = response.data ?? []

    console.log(data)

    return data.map(item => ({
      id: item.id,
      title: (item as any).title ?? '',
      type: (item as any).type ?? { id: 0, title: '' },
      unit: (item as any).unit ?? { id: 0, title: '' },
      price_rub: (item as any).price_rub ?? (item as any).priceByCurrency?.руб ?? 0,
      price_usd: (item as any).price_usd ?? (item as any).priceByCurrency?.usd ?? 0,
      price_eur: (item as any).price_eur ?? (item as any).priceByCurrency?.eur ?? 0,
      contractor: (item as any).contractor ?? { id: 0, title: '' },
      cost_per_unit: item.cost_per_unit ?? 0,
    }))
  } catch (error) {
    console.warn('[fetch goods error]', error)
    return []
  }
}

