import type { OrderItemContext } from './wicket.types'

const lockVersions = new Map<string, number>()
const mutationTails = new Map<string, Promise<void>>()
const conflictKeys = new Set<string>()
const conflictListeners = new Set<(context: OrderItemContext) => void>()

export class WicketLockConflictError extends Error {
  public constructor() {
    super('Конфликт версии позиции. Перезагрузите расчёт.')
  }
}

function getKey(context: OrderItemContext): string {
  if (!Number.isInteger(context.orderId) || context.orderId <= 0) {
    throw new Error('Некорректный orderId позиции')
  }
  if (!Number.isInteger(context.orderItemId) || context.orderItemId <= 0) {
    throw new Error('Некорректный orderItemId позиции')
  }

  return `${context.orderId}:${context.orderItemId}`
}

function assertLockVersion(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error('Некорректная версия позиции')
  }
}

export function rememberWicketLockVersion(context: OrderItemContext, value: unknown): number {
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

export function requireWicketLockVersion(context: OrderItemContext): number {
  const version = lockVersions.get(getKey(context))
  if (version === undefined) {
    throw new Error('Версия позиции не загружена')
  }

  return version
}

export function forgetWicketLockVersion(context: OrderItemContext): void {
  const key = getKey(context)
  lockVersions.delete(key)
  conflictKeys.delete(key)
}

export function onWicketLockConflict(listener: (context: OrderItemContext) => void): () => void {
  conflictListeners.add(listener)
  return () => conflictListeners.delete(listener)
}

function isHttpConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false
  const response = error.response
  return typeof response === 'object' && response !== null && 'status' in response && response.status === 409
}

function notifyConflict(context: OrderItemContext, key: string): void {
  if (conflictKeys.has(key)) return
  conflictKeys.add(key)
  conflictListeners.forEach(listener => listener(context))
}

export async function runWicketLockMutation<T>(
  context: OrderItemContext,
  mutation: (lockVersion: number) => Promise<T>,
): Promise<T> {
  const key = getKey(context)
  const previous = mutationTails.get(key) ?? Promise.resolve()
  const operation = previous.then(async () => {
    if (conflictKeys.has(key)) throw new WicketLockConflictError()
    return mutation(requireWicketLockVersion(context))
  }).catch(error => {
    if (isHttpConflict(error)) notifyConflict(context, key)
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
