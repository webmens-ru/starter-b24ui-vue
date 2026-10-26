import { isPositiveSafeInteger, parsePositiveDecimalId } from './positiveDecimalId'

export type OptionPresence = 0 | 1
export type OptionPresenceSelection = OptionPresence | null
export type PresenceLabelStyle = 'lock' | 'optional'

export function isOptionPresence(value: unknown): value is OptionPresence {
  return value === 0 || value === 1
}

export function parseOptionPresence(value: unknown): OptionPresenceSelection {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

export function optionPresenceLabel(value: unknown, style: PresenceLabelStyle): string {
  if (!isOptionPresence(value)) return ''
  return style === 'lock' ? (value === 1 ? 'Есть' : 'Нет') : (value === 1 ? 'Будет' : 'Не будет')
}

export function optionPresenceOptions(style: PresenceLabelStyle): { value: OptionPresence; label: string }[] {
  return ([1, 0] as const).map(value => ({ value, label: optionPresenceLabel(value, style) }))
}

export function presenceFromLockSetId(value: unknown): OptionPresenceSelection {
  if (value === null || value === undefined || value === '') return 0
  return isPositiveSafeInteger(value) || parsePositiveDecimalId(value).kind === 'valid' ? 1 : null
}
