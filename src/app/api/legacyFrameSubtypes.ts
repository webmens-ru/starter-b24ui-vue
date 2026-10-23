import { isFrameSubtypeCode, type FrameSubtypeSelection } from '../frameSubtypes'

/** Exact old response boundary; missing legacy drafts retain the old NoNet default. */
export function readFrameSubtype(response: Record<string, unknown>): FrameSubtypeSelection {
  const code = response.frameSubtypeCode
  if (code !== null && code !== undefined) return isFrameSubtypeCode(code) ? code : ''
  const problem = response.frameSubtypeProblem
  if (problem && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  switch (response.shieldType) {
    case 'Тип_1': return 'noNet'
    case 'Тип_2': return 'lowerNet'
    case 'Тип_3': return 'upperAndLowerNet'
    case 'Тип_4': return 'sideNet'
    case 'Тип_5': return 'upperNet'
    case null:
    case undefined:
    case '': return 'noNet'
    default: return ''
  }
}
