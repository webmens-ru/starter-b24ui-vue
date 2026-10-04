export type ShieldNetProvider = 'executor' | 'customer' | ''

export function restoreShieldNetProvider(value: unknown): ShieldNetProvider {
  return value === '' || value === 'customer' || value === 'executor' ? value : 'executor'
}
