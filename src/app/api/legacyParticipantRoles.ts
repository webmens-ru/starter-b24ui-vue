import { isParticipantRole, type ParticipantRoleField, type ParticipantRoleSelection } from '../participantRoles'

/** Frozen response compatibility only. Presentation changes must not change this codec. */
const legacyPairs = {
  provide: ['Предоставляет изготовитель', 'Предоставляет заказчик'],
  perform: ['Выполняет изготовитель', 'Выполняет заказчик'],
  install: ['Устанавливает изготовитель', 'Устанавливает заказчик'],
} as const

export function readParticipantRole(response: Record<string, unknown>, field: ParticipantRoleField): ParticipantRoleSelection {
  const code = response[`${field}Code`]
  if (code !== null && code !== undefined) return isParticipantRole(code) ? code : ''
  const problems = response.participantRoleProblems
  if (problems !== null && typeof problems === 'object' && !Array.isArray(problems)) {
    const problem = (problems as Record<string, unknown>)[field]
    if (problem !== null && typeof problem === 'object' && 'code' in problem && problem.code === 'invalid') return ''
  }
  const raw = response[field]
  if (raw === null || raw === undefined || raw === '') return 'manufacturer'
  const pair = field === 'penInstalled' ? legacyPairs.install
    : field === 'doesPaintingFrame' || field === 'doesAssembly' || field === 'lockInstaller' ? legacyPairs.perform
      : legacyPairs.provide
  return raw === pair[0] ? 'manufacturer' : raw === pair[1] ? 'customer' : ''
}
