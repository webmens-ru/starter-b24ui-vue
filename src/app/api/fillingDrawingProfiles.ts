export type FillingDrawingKind = 'c8' | 'c20' | 'mp10' | 'mp20' | 'logSiding' | 'shipLap'
export type FillingDrawingProfile = Readonly<{ kind: FillingDrawingKind }>
export type FillingDrawingProfileProblem = Readonly<{ code: 'missing' | 'unavailable' | 'invalid'; message: string }>
export type FillingDrawingDescriptor = Readonly<{
  profile: FillingDrawingProfile | null
  problem: FillingDrawingProfileProblem | null
}>
export type FillingDrawingMetadata = Readonly<{
  drawingProfile: FillingDrawingProfile | null
  drawingProfileProblem: FillingDrawingProfileProblem | null
}>

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseFillingDrawingDescriptor(profile: unknown, problem: unknown): FillingDrawingDescriptor {
  if (profile === null && problem === null) return { profile: null, problem: null }
  if (profile === null && record(problem)
    && (problem.code === 'missing' || problem.code === 'unavailable' || problem.code === 'invalid')
    && typeof problem.message === 'string' && problem.message.trim() !== '') {
    return { profile: null, problem: { code: problem.code, message: problem.message } }
  }
  if (problem === null && record(profile)) {
    switch (profile.kind) {
      case 'c8': case 'c20': case 'mp10': case 'mp20': case 'logSiding': case 'shipLap':
        return { profile: { kind: profile.kind }, problem: null }
    }
  }
  return { profile: null, problem: { code: 'invalid', message: 'Не удалось получить достоверный профиль заполнения.' } }
}

export function parseFillingDrawingRow<T extends FillingDrawingMetadata>(row: T): T {
  const descriptor = parseFillingDrawingDescriptor(row.drawingProfile, row.drawingProfileProblem)
  return { ...row, drawingProfile: descriptor.profile, drawingProfileProblem: descriptor.problem }
}
