import { isPositiveSafeInteger } from '../positiveDecimalId'

export type JumperPlacement = 'none' | 'above' | 'behind'

export interface JumperOption {
  id: number
  name: string
  placement: JumperPlacement
  hasJumper: boolean
}

export interface JumperOptionsResponse {
  availablePolozheniyeJumper: JumperOption[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJumperPlacement(value: unknown): value is JumperPlacement {
  return value === 'none' || value === 'above' || value === 'behind'
}

/** Catalog identities and behavior are independent of editable display captions. */
export function parseJumperOptions(value: unknown): JumperOptionsResponse {
  if (!record(value) || !Array.isArray(value.availablePolozheniyeJumper)) {
    throw new Error('Некорректный список положений перемычки.')
  }
  const seen = new Set<number>()
  const availablePolozheniyeJumper = value.availablePolozheniyeJumper.map((item: unknown): JumperOption => {
    if (!record(item) || !isPositiveSafeInteger(item.id) || seen.has(item.id)
      || typeof item.name !== 'string' || !isJumperPlacement(item.placement)
      || typeof item.hasJumper !== 'boolean' || item.hasJumper !== (item.placement !== 'none')) {
      throw new Error('Не настроены согласованные свойства положения перемычки.')
    }
    seen.add(item.id)
    return { id: item.id, name: item.name, placement: item.placement, hasJumper: item.hasJumper }
  })
  return { availablePolozheniyeJumper }
}
