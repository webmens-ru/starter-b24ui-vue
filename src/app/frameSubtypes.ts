export type FrameSubtypeCode = 'noNet' | 'lowerNet' | 'upperAndLowerNet' | 'sideNet' | 'upperNet'
export type FrameSubtypeSelection = FrameSubtypeCode | '' | null

const variants = {
  noNet: { label: 'Без сеток', imageIndex: 1, top: false, lower: false, side: false },
  lowerNet: { label: 'Сетка снизу', imageIndex: 2, top: false, lower: true, side: false },
  upperAndLowerNet: { label: 'Сетка снизу и сверху', imageIndex: 3, top: true, lower: true, side: false },
  sideNet: { label: 'Сетка сбоку', imageIndex: 4, top: false, lower: false, side: true },
  upperNet: { label: 'Сетка сверху', imageIndex: 5, top: true, lower: false, side: false },
} as const

export function isFrameSubtypeCode(value: unknown): value is FrameSubtypeCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(variants, value)
}

export function frameSubtypeLabel(value: unknown): string {
  return isFrameSubtypeCode(value) ? variants[value].label : ''
}

export function frameSubtypeZones(value: unknown): { top: boolean; lower: boolean; side: boolean } {
  const variant = isFrameSubtypeCode(value) ? variants[value] : null
  return { top: variant?.top ?? false, lower: variant?.lower ?? false, side: variant?.side ?? false }
}

export function frameSubtypeOptions(): { value: FrameSubtypeCode; label: string; imageIndex: number }[] {
  return (['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'] as const)
    .map(value => ({ value, label: variants[value].label, imageIndex: variants[value].imageIndex }))
}

export function frameSubtypeImageIndex(value: FrameSubtypeCode): number {
  return variants[value].imageIndex
}
