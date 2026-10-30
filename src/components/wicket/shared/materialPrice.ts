import { formatOrderPrice } from '../../order/orderPrice'

export function formatMaterialPrice(value: string | number | null | undefined): string {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return '—'
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? (formatOrderPrice(price) ?? '—') : '—'
}
