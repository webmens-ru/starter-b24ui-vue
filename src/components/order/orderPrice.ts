const rubleFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
})

export function formatOrderPrice(value: number | null): string | null {
  return value === null ? null : rubleFormatter.format(value)
}
