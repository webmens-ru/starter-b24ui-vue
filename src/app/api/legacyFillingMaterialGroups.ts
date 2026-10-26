import { isFillingMaterialGroup, type FillingMaterialGroup, type FillingMaterialGroupSelection, type FillingSide } from '../fillingMaterialGroups'

// Frozen response compatibility; independent of current presentation labels.
const legacy: Record<string, FillingMaterialGroup> = {
  'Сайдинг': 'siding', 'Профлист': 'profnastil', 'Профнастил': 'profnastil',
  'Штакетник': 'fence', 'Ламель': 'lamella', 'SP сайдинг': 'spSiding', 'Жалюзи': 'louver', 'Лист': 'sheet',
}

export function readFillingMaterialGroup(response: Record<string, unknown>, side: FillingSide): FillingMaterialGroupSelection {
  const prefix = side === 'facade' ? 'materialFacade' : 'materialYard'
  const code = response[`${prefix}GroupCode`]
  if (code !== null && code !== undefined) return isFillingMaterialGroup(code) ? code : ''
  const problems = response.fillingGroupProblems
  if (problems && typeof problems === 'object' && !Array.isArray(problems)) {
    const problem = (problems as Record<string, unknown>)[side]
    if (problem && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  }
  const raw = response[`${prefix}Glob`]
  if (raw === null || raw === undefined || raw === '') return null
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(legacy, raw.trim()) ? legacy[raw.trim()]! : ''
}
