export type ParticipantRole = 'manufacturer' | 'customer'
export type ParticipantRoleSelection = ParticipantRole | ''
export type ParticipantRoleAction = 'provide' | 'perform' | 'install'
export interface ParticipantRoleOption { value: ParticipantRole; label: string }

export const participantRoleFields = [
  'providesMaterial', 'providesPaint', 'providesPrimer', 'doesPaintingFrame', 'doesAssembly',
  'providesLock', 'lockInstaller', 'penProvided', 'penInstalled',
] as const
export type ParticipantRoleField = typeof participantRoleFields[number]

export function isParticipantRole(value: unknown): value is ParticipantRole {
  return value === 'manufacturer' || value === 'customer'
}

const verbs: Record<ParticipantRoleAction, string> = {
  provide: 'Предоставляет', perform: 'Выполняет', install: 'Устанавливает',
}

export function participantRoleLabel(action: ParticipantRoleAction, value: unknown): string {
  if (!isParticipantRole(value)) return ''
  return `${verbs[action]} ${value === 'manufacturer' ? 'изготовитель' : 'заказчик'}`
}

export function participantRoleOptions(action: ParticipantRoleAction): ParticipantRoleOption[] {
  return (['manufacturer', 'customer'] as const).map(value => ({ value, label: participantRoleLabel(action, value) }))
}
