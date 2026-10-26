import { isGrilleSide, type GrilleSideSelection } from '../grilleSides'

/** Exact old response boundary; missing legacy drafts retain the old hinge default. */
export function readGrilleSide(response: Record<string, unknown>): GrilleSideSelection {
  const code = response.grilleSideCode
  if (code !== null && code !== undefined) return isGrilleSide(code) ? code : ''
  const problem = response.grilleSideProblem
  if (problem && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  switch (response.grilleLocation) {
    case 'Возле петель': return 'hinge'
    case 'Возле замка': return 'lock'
    case null:
    case undefined:
    case '': return 'hinge'
    default: return ''
  }
}
