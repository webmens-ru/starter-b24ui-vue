export type FillingColorId = string | number | null | undefined

export function hasRequiredFillingColor(colorId: FillingColorId, colorName: string): boolean {
  return String(colorId ?? '').trim() !== '' || colorName.trim() !== ''
}
