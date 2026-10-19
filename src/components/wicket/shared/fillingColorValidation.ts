export type FillingColorId = string | number | null | undefined

export function hasRequiredFillingColor(
  colorId: FillingColorId,
  colorName: string,
  allowNameOnly = false,
): boolean {
  return String(colorId ?? '').trim() !== '' || (allowNameOnly && colorName.trim() !== '')
}
