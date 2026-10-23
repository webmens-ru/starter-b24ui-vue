import { isFillingSideCount, type FillingSideCountSelection } from '../fillingSideCounts'

/** Exact frozen response compatibility, including the existing new-draft Single default. */
export function readFillingSideCount(response: Record<string, unknown>): FillingSideCountSelection {
  const count = response.fillingSideCount
  if (count !== null && count !== undefined) return isFillingSideCount(count) ? count : ''
  const problem = response.fillingSideCountProblem
  if (problem && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  switch (response.fillSide) {
    case 'Одна сторона': return 1
    case 'Две стороны': return 2
    case null:
    case undefined:
    case '': return 1
    default: return ''
  }
}
