import { WicketProductRowLockConflictError } from './api/wicketProductRowLockVersion'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function messages(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  return Array.isArray(value) ? value.flatMap(item => typeof item === 'string' ? messages(item) : []) : []
}

/** User-facing validation details only; unexpected server errors keep the local fallback. */
export function wicketFailureMessage(error: unknown, fallback: string): string {
  const conflict = 'Позиция уже изменилась. Перезагрузите страницу и повторите сохранение.'
  if (error instanceof WicketProductRowLockConflictError) return conflict
  if (!record(error) || !record(error.response)) return fallback
  const response = error.response
  if (response.status === 409) return conflict
  if (response.status !== 422 || !record(response.data)) return fallback
  const data = response.data
  const problems = Array.isArray(data.problems)
    ? data.problems.flatMap(problem => record(problem) ? messages(problem.message) : []) : []
  const fields = record(data.errors) ? Object.values(data.errors).flatMap(messages) : []
  const details = [...new Set([...problems, ...fields])]
  return details.length ? details.join('\n') : messages(data.message)[0] ?? messages(data.error)[0] ?? fallback
}
