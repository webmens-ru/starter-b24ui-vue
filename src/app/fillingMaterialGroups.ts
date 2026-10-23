export const fillingMaterialGroupCodes = ['siding', 'profnastil', 'fence', 'lamella', 'spSiding', 'louver', 'sheet'] as const
export type FillingMaterialGroup = typeof fillingMaterialGroupCodes[number]
export type FillingMaterialGroupSelection = FillingMaterialGroup | '' | null
export type FillingSide = 'facade' | 'yard'

const labels: Record<FillingMaterialGroup, string> = {
  siding: 'Сайдинг', profnastil: 'Профлист', fence: 'Штакетник', lamella: 'Ламель',
  spSiding: 'SP сайдинг', louver: 'Жалюзи', sheet: 'Лист',
}

export function isFillingMaterialGroup(value: unknown): value is FillingMaterialGroup {
  return typeof value === 'string' && fillingMaterialGroupCodes.some(code => code === value)
}

export function fillingMaterialGroupLabel(value: unknown): string {
  return isFillingMaterialGroup(value) ? labels[value] : ''
}

export function fillingMaterialGroupOptions(codes: readonly FillingMaterialGroup[]) {
  return codes.map(value => ({ value, label: fillingMaterialGroupLabel(value) }))
}

export function hasInvalidFillingGroupSelection(facade: unknown, yard: unknown): boolean {
  return [facade, yard].some(value => value !== null && value !== undefined && !isFillingMaterialGroup(value))
}
