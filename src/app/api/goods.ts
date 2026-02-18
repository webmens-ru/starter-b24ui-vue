import api from './index'

export const currencyList = ['руб', 'usd', 'eur'] as const
export type Currency = (typeof currencyList)[number]

export type Good = {
  id: number
  title: string
  allowPriceEdit?: boolean
  allowTitleEdit?: boolean
  categoryId?: number
  typeBuildingIds?: string[]

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
  requiresToApproval?: boolean
  requiresOmApproval?: boolean
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

function normalizeGood(item: any): Good {
  return {
    id: Number(item?.id ?? 0),
    title: item?.title ?? '',
    allowPriceEdit: Boolean(item?.allowPriceEdit),
    allowTitleEdit: Boolean(item?.allowTitleEdit),
    categoryId: Number(item?.categoryId ?? item?.category_id ?? NaN) || undefined,
    unit: item?.unit ?? { id: 0, title: '' },
    price_rub: item?.price_rub ?? item?.priceByCurrency?.руб ?? 0,
    price_usd: item?.price_usd ?? item?.priceByCurrency?.usd ?? 0,
    price_eur: item?.price_eur ?? item?.priceByCurrency?.eur ?? 0,
    contractor: item?.contractor ?? { id: 0, title: '' },
    requiresToApproval: Boolean(
      item?.requiresToApproval ??
        item?.requiresApprovalTech ??
        item?.requiresToApprovalTech ??
        item?.needToApproveTech ??
        item?.need_approval_tech ??
        item?.needApprovalTO ??
        item?.need_approval_to,
    ),
    requiresOmApproval: Boolean(
      item?.requiresOmApproval ??
        item?.requiresApprovalMarketing ??
        item?.requiresToApprovalMarketing ??
        item?.needToApproveMarketing ??
        item?.need_approval_marketing ??
        item?.needApprovalOM ??
        item?.need_approval_om,
    ),
    cost_per_unit: item?.cost_per_unit ?? 0,
    quantityFactorArea: Boolean(item?.quantityFactorArea),
    typeBuildingIds: Array.isArray(item?.typeBuildingIds)
      ? item.typeBuildingIds.map((v: unknown) => String(v)).filter((v: string) => Boolean(v))
      : undefined,
    enableArea: Array.isArray(item?.enableArea)
      ? item.enableArea.map((v: unknown) => Number(v)).filter((v: number) => !Number.isNaN(v))
      : [],
    enableDates: Array.isArray(item?.enableDates)
      ? item.enableDates
          .map((d: any) => {
            try {
              const parsed = new Date(d)
              if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
            } catch (e) {
              /* ignore */
            }
            return typeof d === 'string' ? d.slice(0, 10) : ''
          })
          .filter(Boolean)
      : [],
    serviceStartTimes: Array.isArray(item?.serviceStartTimes)
      ? item.serviceStartTimes
          .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
          .filter(Boolean)
      : [],
    minServiceDurationMinutes: Number.isFinite(
      Number(item?.minServiceDurationMinutes ?? item?.minDurationMinutes),
    )
      ? Number(item?.minServiceDurationMinutes ?? item?.minDurationMinutes)
      : undefined,
    serviceDurationMinutes: Number.isFinite(Number(item?.serviceDurationMinutes ?? item?.durationMinutes))
      ? Number(item?.serviceDurationMinutes ?? item?.durationMinutes)
      : undefined,
    servicePeriod: item?.servicePeriod ?? { id: 1, title: 'Весь период' },
  }
}

function extractGood(rawPayload: unknown): any | null {
  const payload = (rawPayload as any)?.result ?? (rawPayload as any)?.data ?? rawPayload
  if (Array.isArray(payload)) return payload[0] ?? null
  if (payload && typeof payload === 'object') return payload
  return null
}

export async function fetchGoods(params: FetchGoodsParams = {}): Promise<Good[]> {
  try {
    const { dealTypeBuildingId, productTypeId } = params

    const response = await api.post<Good[]>('/api/sp1222/list', {
      dealTypeBuildingId,
      productTypeId,
    })
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(item => normalizeGood(item))
  } catch (error) {
    console.warn('[fetch goods error]', error)
    return []
  }
}

export async function fetchGoodById(id: number): Promise<Good | null> {
  const productId = Number(id)
  if (!Number.isFinite(productId) || productId <= 0) return null

  const requests = [
    () => api.get(`/api/sp1222/view?id=${productId}`),
  ]

  for (const request of requests) {
    try {
      const response = await request()
      const goodRaw = extractGood(response.data)
      if (goodRaw) {
        return normalizeGood(goodRaw)
      }
    } catch (error) {
      // Пробуем альтернативный формат endpoint.
    }
  }

  console.warn('[fetch good by id error]', { id: productId })
  return null
}

export async function fetchContractors(): Promise<Contractor[]> {
  try {
    const response = await api.get<Contractor[]>('/api/company/contractor')
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
