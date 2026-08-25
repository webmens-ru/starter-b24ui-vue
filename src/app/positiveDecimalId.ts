export type PositiveDecimalId =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'valid', value: number }

export function parsePositiveDecimalId(raw: unknown): PositiveDecimalId {
  if (raw === undefined) return { kind: 'absent' }
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return { kind: 'invalid' }
  const value = Number(raw)
  return Number.isSafeInteger(value) ? { kind: 'valid', value } : { kind: 'invalid' }
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
