import type { ProductRowContext } from './wicket.types'
import { isPositiveSafeInteger } from '../positiveDecimalId'

const lockVersions = new Map<string, number>()
const mutationTails = new Map<string, Promise<void>>()
const conflictKeys = new Set<string>()
const conflictListeners = new Set<(context: ProductRowContext) => void>()
const localMutationListeners = new Set<(advance: WicketProductRowLockVersionAdvance) => void>()

export interface WicketProductRowLockVersionAdvance {
  context: ProductRowContext
  expectedLockVersion: number
  lockVersion: number
}

export class WicketProductRowLockConflictError extends Error {
  public constructor() {
    super('Конфликт версии позиции. Перезагрузите расчёт.')
  }
}

function getKey(context: ProductRowContext): string {
  if (!isPositiveSafeInteger(context.orderId)) {
    throw new Error('Некорректный orderId позиции')
  }
  if (!isPositiveSafeInteger(context.productRowId)) {
    throw new Error('Некорректный productRowId позиции')
  }

  return `${context.orderId}:${context.productRowId}`
}

function assertLockVersion(value: unknown): asserts value is number {
  if (!isPositiveSafeInteger(value)) {
    throw new Error('Некорректная версия позиции')
  }
}

export function rememberWicketProductRowLockVersion(context: ProductRowContext, value: unknown): number {
  assertLockVersion(value)
  const key = getKey(context)
  const current = lockVersions.get(key)
  if (current !== undefined && value < current) {
    return current
  }

  lockVersions.set(key, value)
  conflictKeys.delete(key)
  return value
}

export function initializeWicketProductRowLockVersion(
  context: ProductRowContext,
  value: unknown,
): void {
  assertLockVersion(value)
  const key = getKey(context)
  if (!lockVersions.has(key) && !conflictKeys.has(key)) {
    lockVersions.set(key, value)
  }
}

export function requireWicketProductRowLockVersion(context: ProductRowContext): number {
  const version = lockVersions.get(getKey(context))
  if (version === undefined) {
    throw new Error('Версия позиции не загружена')
  }

  return version
}

export function forgetWicketProductRowLockVersion(context: ProductRowContext): void {
  const key = getKey(context)
  lockVersions.delete(key)
  conflictKeys.delete(key)
}

export function onWicketProductRowLockConflict(listener: (context: ProductRowContext) => void): () => void {
  conflictListeners.add(listener)
  return () => conflictListeners.delete(listener)
}

export function onWicketProductRowLockVersionAdvanced(
  listener: (advance: WicketProductRowLockVersionAdvance) => void,
): () => void {
  localMutationListeners.add(listener)
  return () => localMutationListeners.delete(listener)
}

export function notifyWicketProductRowLockVersionAdvanced(
  context: ProductRowContext,
  expectedLockVersion: number,
  lockVersion: unknown,
): void {
  assertLockVersion(expectedLockVersion)
  assertLockVersion(lockVersion)
  if (lockVersion < expectedLockVersion) return

  const advance = {
    context: { ...context },
    expectedLockVersion,
    lockVersion,
  }
  localMutationListeners.forEach(listener => listener(advance))
}

function isHttpConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false
  const response = error.response
  return typeof response === 'object' && response !== null && 'status' in response && response.status === 409
}

function notifyConflict(context: ProductRowContext, key: string): void {
  if (conflictKeys.has(key)) return
  conflictKeys.add(key)
  conflictListeners.forEach(listener => listener(context))
}

export async function runWicketProductRowLockMutation<T>(
  context: ProductRowContext,
  mutation: (lockVersion: number) => Promise<T>,
  options: { silent?: boolean } = {},
): Promise<T> {
  const key = getKey(context)
  const previous = mutationTails.get(key) ?? Promise.resolve()
  const operation = previous.then(async () => {
    if (conflictKeys.has(key)) throw new WicketProductRowLockConflictError()
    return mutation(requireWicketProductRowLockVersion(context))
  }).catch(error => {
    if (isHttpConflict(error) && !options.silent) notifyConflict(context, key)
    throw error
  })
  const tail = operation.then(() => undefined, () => undefined)
  mutationTails.set(key, tail)

  try {
    return await operation
  } finally {
    if (mutationTails.get(key) === tail) mutationTails.delete(key)
  }
}
