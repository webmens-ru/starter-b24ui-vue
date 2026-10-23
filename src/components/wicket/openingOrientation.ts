import type { OpeningOrientation, OpeningOrientationProblem } from '../../app/api/wicket.types'
import { isPositiveSafeInteger, parsePositiveDecimalId } from '../../app/positiveDecimalId'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseOpeningOrientation(value: unknown): OpeningOrientation {
  if (!record(value) || typeof value.opensOutward !== 'boolean'
    || (value.hingeSide !== 'left' && value.hingeSide !== 'right')) {
    throw new Error('Не настроены направление открытия или сторона петель.')
  }
  return { opensOutward: value.opensOutward, hingeSide: value.hingeSide }
}

export function screenHingeSide(value: OpeningOrientation, yard: boolean): OpeningOrientation['hingeSide'] {
  return yard ? (value.hingeSide === 'left' ? 'right' : 'left') : value.hingeSide
}

export function parseOpeningSelection(id: unknown, value: unknown, problem: unknown): {
  openingOrientation: OpeningOrientation | null
  openingOrientationProblem: OpeningOrientationProblem | null
} {
  if (id === null || id === undefined || id === '') {
    return { openingOrientation: null, openingOrientationProblem: null }
  }
  if (!isPositiveSafeInteger(id) && parsePositiveDecimalId(id).kind !== 'valid') {
    return { openingOrientation: null, openingOrientationProblem: { code: 'invalid', message: 'Некорректный идентификатор варианта открытия.' } }
  }
  let openingOrientation: OpeningOrientation | null = null
  try {
    openingOrientation = parseOpeningOrientation(value)
  } catch {
    // Keep the saved FK visible; unavailable properties never become a guess.
  }
  const validProblem = record(problem)
    && (problem.code === 'invalid' || problem.code === 'missing' || problem.code === 'inactive')
    && typeof problem.message === 'string'
  if (validProblem) {
    return { openingOrientation, openingOrientationProblem: { code: problem.code as OpeningOrientationProblem['code'], message: problem.message as string } }
  }
  if (!openingOrientation || problem != null) {
    return { openingOrientation, openingOrientationProblem: { code: 'invalid', message: 'Не удалось получить корректные свойства выбранного варианта открытия.' } }
  }
  return { openingOrientation, openingOrientationProblem: null }
}
