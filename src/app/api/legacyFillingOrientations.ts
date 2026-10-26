import { isFillingOrientation, type FillingOrientationSelection } from '../fillingOrientations'

/** Exact historical response decoding; the old new-draft default remains Vertical. */
export function readFillingOrientation(response: Record<string, unknown>): FillingOrientationSelection {
  const code = response.fillingOrientationCode
  if (code !== null && code !== undefined) return isFillingOrientation(code) ? code : ''
  const problem = response.fillingOrientationProblem
  if (problem && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  switch (response.raspolozheniyePolotna) {
    case 'Горизонтально': return 'horizontal'
    case 'Вертикально': return 'vertical'
    case null:
    case undefined:
    case '': return 'vertical'
    default: return ''
  }
}
