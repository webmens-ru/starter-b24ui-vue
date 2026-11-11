import type { FacadeButtTrim, FenceGapOption } from './wicket.types'
import { isPositiveSafeInteger } from '../positiveDecimalId'

export function parseFacadeButtTrim(value: unknown): FacadeButtTrim | null {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Некорректная подрезка')
  const row = value as Record<string, unknown>
  if (!['none', 'both', 'single', 'unavailable'].includes(String(row.mode))
    || !(row.widthMm === null || (typeof row.widthMm === 'number' && Number.isFinite(row.widthMm) && row.widthMm > 0))
    || !Number.isSafeInteger(row.quantity) || Number(row.quantity) < 0 || typeof row.requiresSide !== 'boolean') throw new Error('Некорректная подрезка')
  return { mode: row.mode as FacadeButtTrim['mode'], widthMm: row.widthMm as number | null, quantity: Number(row.quantity), requiresSide: row.requiresSide }
}

export function parseFenceGapOptions(value: unknown): FenceGapOption[] {
  if (!Array.isArray(value)) throw new Error('Некорректный список зазоров')
  const ids = new Set<number>()
  return value.map(row => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)
      || !isPositiveSafeInteger(row.id) || !(row.gapMm === 0 || isPositiveSafeInteger(row.gapMm))
      || !(isPositiveSafeInteger(row.quantity) || (row.quantity === 0 && row.gapMm === 0 && row.buttTrim?.mode === 'unavailable')) || typeof row.label !== 'string'
      || !row.label.trim() || ids.has(row.id)) {
      throw new Error('Некорректный вариант зазора')
    }
    ids.add(row.id)
    return { ...(row.buttTrim == null ? {} : { buttTrim: parseFacadeButtTrim(row.buttTrim)! }), ...(typeof row.yardEdgeTrimAvailable === 'boolean' ? { yardEdgeTrimAvailable: row.yardEdgeTrimAvailable, yardEdgeTrimWidthMm: typeof row.yardEdgeTrimWidthMm === 'number' ? row.yardEdgeTrimWidthMm : null } : {}), id: row.id, gapMm: row.gapMm, label: row.label, quantity: row.quantity }
  })
}
