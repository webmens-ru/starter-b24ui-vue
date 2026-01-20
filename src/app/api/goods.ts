import api from './index'

export const currencyList = ['руб', 'usd', 'eur'] as const
export type Currency = (typeof currencyList)[number]

export type Good = {
  id: number
  title: string
  allowPriceEdit?: boolean
  allowTitleEdit?: boolean

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
  quantityFactorArea?: boolean
  enableDates?: string[]
  enableArea?: number[]
  serviceStartTimes?: string[]
  minServiceDurationMinutes?: number
  serviceDurationMinutes?: number
  servicePeriod?: {
    id: number
    title: string
  }
}

export type Contractor = {
  id: number
  title: string
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
      allowPriceEdit: Boolean((item as any).allowPriceEdit),
      allowTitleEdit: Boolean((item as any).allowTitleEdit),
      unit: (item as any).unit ?? { id: 0, title: '' },
      price_rub: (item as any).price_rub ?? (item as any).priceByCurrency?.руб ?? 0,
      price_usd: (item as any).price_usd ?? (item as any).priceByCurrency?.usd ?? 0,
      price_eur: (item as any).price_eur ?? (item as any).priceByCurrency?.eur ?? 0,
      contractor: (item as any).contractor ?? { id: 0, title: '' },
      cost_per_unit: item.cost_per_unit ?? 0,
      quantityFactorArea: Boolean((item as any).quantityFactorArea),
      enableArea: Array.isArray((item as any).enableArea)
        ? (item as any).enableArea.map((v: unknown) => Number(v)).filter((v: number) => !Number.isNaN(v))
        : [],
      enableDates: Array.isArray((item as any).enableDates)
        ? (item as any).enableDates.map((d: any) => {
            try {
              const parsed = new Date(d)
              if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
            } catch (e) {
              /* ignore */
            }
            return typeof d === 'string' ? d.slice(0, 10) : ''
          }).filter(Boolean)
        : [],
      serviceStartTimes: Array.isArray((item as any).serviceStartTimes)
        ? (item as any).serviceStartTimes
            .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean)
        : [],
      minServiceDurationMinutes: Number.isFinite(
        Number((item as any).minServiceDurationMinutes ?? (item as any).minDurationMinutes),
      )
        ? Number((item as any).minServiceDurationMinutes ?? (item as any).minDurationMinutes)
        : undefined,
      serviceDurationMinutes: Number.isFinite(
        Number((item as any).serviceDurationMinutes ?? (item as any).durationMinutes),
      )
        ? Number((item as any).serviceDurationMinutes ?? (item as any).durationMinutes)
        : undefined,
      servicePeriod: (item as any).servicePeriod ?? { id: 1, title: 'Весь период' },
    }))
  } catch (error) {
    console.warn('[fetch goods error]', error)
    return []
  }
}

export async function fetchContractors(): Promise<Contractor[]> {
  try {
    const response = await api.get<Contractor[]>('/api/sp1222/contractor')
    const data = response.data ?? []

    return data
      .map(item => {
        const raw = item as any
        const id = Number(raw?.id ?? raw?.ID ?? raw?.value ?? 0)
        const title = String(raw?.title ?? raw?.name ?? raw?.TITLE ?? raw?.label ?? '')
        return { id, title }
      })
      .filter(item => item.id > 0 && item.title)
  } catch (error) {
    console.warn('[fetch contractors error]', error)
    return []
  }
}
