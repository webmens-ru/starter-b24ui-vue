export type PipeProfile = Readonly<{ sizeA: number; sizeB: number }>
export type PipeProfileProblem = Readonly<{ code: 'missing' | 'unavailable' | 'invalid'; message: string }>
export type PipeProfileDescriptor = Readonly<{ profile: PipeProfile | null; profileProblem: PipeProfileProblem | null }>
export type PipeOption = PipeProfileDescriptor & Readonly<{ id: number; name: string; disabled: boolean }>

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parsePipeProfile(value: unknown): PipeProfile {
  if (!record(value) || !isPositiveSafeInteger(value.sizeA) || !isPositiveSafeInteger(value.sizeB)
    || value.sizeA < value.sizeB) {
    throw new Error('Недостоверные числовые размеры трубы.')
  }
  return { sizeA: value.sizeA, sizeB: value.sizeB }
}

export function parsePipeProfileDescriptor(profile: unknown, problem: unknown, used: boolean | null = true): PipeProfileDescriptor {
  if (used !== true) return { profile: null, profileProblem: null }
  if (profile === null && record(problem)
    && (problem.code === 'missing' || problem.code === 'unavailable' || problem.code === 'invalid')
    && typeof problem.message === 'string' && problem.message.trim() !== '') {
    return { profile: null, profileProblem: { code: problem.code, message: problem.message } }
  }
  if (problem === null) {
    try {
      return { profile: parsePipeProfile(profile), profileProblem: null }
    } catch {
      // Missing or invalid numbers never become a profile extracted from a label.
    }
  }
  return { profile: null, profileProblem: { code: 'invalid', message: 'Не удалось получить достоверный профиль трубы.' } }
}

export function parsePipeOptions(value: unknown, key: 'assortmentPipe' | 'assortmentJumper'): PipeOption[] {
  if (!record(value) || !Array.isArray(value[key])) throw new Error('Некорректный ответ справочника труб.')
  const seen = new Set<number>()
  return value[key].map((item: unknown) => {
    if (!record(item) || !isPositiveSafeInteger(item.id) || typeof item.name !== 'string' || seen.has(item.id)) {
      throw new Error('Некорректная запись справочника труб.')
    }
    seen.add(item.id)
    const descriptor = parsePipeProfileDescriptor(item.profile, item.profileProblem)
    return { id: item.id, name: item.name, ...descriptor, disabled: descriptor.profileProblem !== null }
  })
}
import { isPositiveSafeInteger } from '../positiveDecimalId'
