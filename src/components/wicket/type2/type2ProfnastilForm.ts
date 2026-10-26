export type ProfnastilColorMode = 'list' | 'combobox' | 'none'

export function getProfnastilColorMode(mode: unknown): ProfnastilColorMode {
  if (mode === 'list' || mode === 'combobox' || mode === 'none') return mode
  throw new Error('Некорректный режим цвета покрытия. Проверьте настройки справочника.')
}

export interface ColorInputItem { id: string | number; label: string }

export function getPrintechSelectItems(items: ColorInputItem[], currentValue: string): ColorInputItem[] {
  const customValue = currentValue.trim()
  if (customValue === '') return items
  return [...items, { id: `custom:${customValue}`, label: customValue }]
}
