/** Boundary adapter for pre-code provider controls and historical API responses. */
export function participantRoleCode(value: string): 'manufacturer' | 'customer' {
  return value === 'Выполняет заказчик' || value === 'Предоставляет заказчик' ? 'customer' : 'manufacturer'
}
export function participantRoleLabel(code: unknown, performer: boolean): string {
  return performer ? (code === 'customer' ? 'Выполняет заказчик' : 'Выполняет изготовитель') : (code === 'customer' ? 'Предоставляет заказчик' : 'Предоставляет изготовитель')
}
