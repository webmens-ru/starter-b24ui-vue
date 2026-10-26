import type { FenceGapOption } from './wicket.types'
import { isPositiveSafeInteger } from '../positiveDecimalId'

export function parseFenceGapOptions(value: unknown): FenceGapOption[] {
  if (!Array.isArray(value)) throw new Error('Некорректный список зазоров')
  const ids = new Set<number>()
  return value.map(row => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)
      || !isPositiveSafeInteger(row.id) || !isPositiveSafeInteger(row.gapMm)
      || !isPositiveSafeInteger(row.quantity) || typeof row.label !== 'string'
      || !row.label.trim() || ids.has(row.id)) {
      throw new Error('Некорректный вариант зазора')
    }
    ids.add(row.id)
    return { id: row.id, gapMm: row.gapMm, label: row.label, quantity: row.quantity }
  })
}
