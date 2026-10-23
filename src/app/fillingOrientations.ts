export type FillingOrientation = 'horizontal' | 'vertical'
export type FillingOrientationSelection = FillingOrientation | '' | null

export function isFillingOrientation(value: unknown): value is FillingOrientation {
  return value === 'horizontal' || value === 'vertical'
}

export function fillingOrientationLabel(value: unknown): string {
  return value === 'horizontal' ? 'Горизонтально' : value === 'vertical' ? 'Вертикально' : ''
}

export function fillingOrientationOptions(): { value: FillingOrientation; label: string }[] {
  return (['vertical', 'horizontal'] as const).map(value => ({ value, label: fillingOrientationLabel(value) }))
}

/** Omitted low-level drawing input retains its old fallback; explicit invalid state never does. */
export function parseDrawingFillingOrientation(value: unknown): FillingOrientation | null {
  if (value === undefined) return null
  if (!isFillingOrientation(value)) throw new Error('Выберите расположение полотна: fillingOrientationCode')
  return value
}
