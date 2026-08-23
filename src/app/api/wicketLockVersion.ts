import type { OrderItemContext } from './wicket.types'

const lockVersions = new Map<string, number>()

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
  lockVersions.set(getKey(context), value)
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
  lockVersions.delete(getKey(context))
}
