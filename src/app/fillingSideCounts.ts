export type FillingSideCount = 0 | 1 | 2
export type FillingSideCountSelection = FillingSideCount | '' | null

export function isFillingSideCount(value: unknown): value is FillingSideCount {
  return value === 0 || value === 1 || value === 2
}

export function fillingSideCountLabel(value: unknown): string {
  return value === 0 ? 'Без заполнения' : value === 1 ? 'Одна сторона' : value === 2 ? 'Две стороны' : ''
}

export function fillingSideCountOptions(): { value: FillingSideCount; label: string }[] {
  return ([1, 2] as const).map(value => ({ value, label: fillingSideCountLabel(value) }))
}

export function hasInvalidFillingSideCountSelection(value: unknown): boolean {
  return value !== null && value !== undefined && !isFillingSideCount(value)
}
