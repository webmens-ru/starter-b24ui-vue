import { isPositiveSafeInteger, parsePositiveDecimalId } from '../positiveDecimalId'

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

export interface JumperPlacementProblem {
  code: 'invalid' | 'missing' | 'inactive'
  message: string
}

function parseProblem(value: unknown): JumperPlacementProblem | null {
  if (!record(value) || (value.code !== 'invalid' && value.code !== 'missing' && value.code !== 'inactive')
    || typeof value.message !== 'string') return null
  return { code: value.code as JumperPlacementProblem['code'], message: value.message }
}

export function parseJumperSelection(id: unknown, placement: unknown, problem: unknown): {
  jumperPlacement: JumperPlacement | null
  jumperPlacementProblem: JumperPlacementProblem | null
} {
  if (id === null || id === undefined || id === '') {
    return { jumperPlacement: null, jumperPlacementProblem: null }
  }
  const invalid = { code: 'invalid', message: 'Не удалось получить корректные свойства выбранной перемычки.' } as const
  if (!isPositiveSafeInteger(id) && parsePositiveDecimalId(id).kind !== 'valid') {
    return { jumperPlacement: null, jumperPlacementProblem: invalid }
  }
  const configured = isJumperPlacement(placement) ? placement : null
  return {
    jumperPlacement: configured,
    jumperPlacementProblem: parseProblem(problem) ?? (configured === null || problem != null ? invalid : null),
  }
}

export function parsePostsSelection(value: unknown, problem: unknown): {
  hasStolby: 0 | 1 | null
  postsPresenceProblem: JumperPlacementProblem | null
} {
  const hasStolby = value === 0 || value === '0' ? 0 : value === 1 || value === '1' ? 1 : null
  const diagnostic = parseProblem(problem)
  if (hasStolby === null || problem != null) {
    return { hasStolby: null, postsPresenceProblem: diagnostic
      ?? { code: 'invalid', message: 'Необходимо явно выбрать наличие столбов (0 или 1).' } }
  }
  return { hasStolby, postsPresenceProblem: null }
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
