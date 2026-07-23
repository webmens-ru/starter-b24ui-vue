export type ProfnastilColorMode = 'list' | 'combobox' | 'none'

const listCoatings = new Set([
  'глянец',
  'глянец двухсторонний',
  'матовый',
  'матовый двусторонний',
])
const printechCoatings = new Set(['printech', 'printech двусторонний'])

export function getProfnastilColorMode(coating: string): ProfnastilColorMode {
  const normalized = coating.trim().toLocaleLowerCase('ru-RU')
  if (listCoatings.has(normalized)) return 'list'
  if (printechCoatings.has(normalized)) return 'combobox'
  return 'none'
}
