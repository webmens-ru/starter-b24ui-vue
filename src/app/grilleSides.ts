export type GrilleSide = 'hinge' | 'lock'
export type GrilleSideSelection = GrilleSide | '' | null

export function isGrilleSide(value: unknown): value is GrilleSide {
  return value === 'hinge' || value === 'lock'
}

export function grilleSideLabel(value: unknown): string {
  return value === 'hinge' ? 'Возле петель' : value === 'lock' ? 'Возле замка' : ''
}

export function grilleSideOptions(): { value: GrilleSide; label: string }[] {
  return (['hinge', 'lock'] as const).map(value => ({ value, label: grilleSideLabel(value) }))
}

/** Only active side nets require a side. Omitted low-level input keeps the old default. */
export function parseDrawingGrilleSide(value: unknown, active: boolean): GrilleSide {
  if (!active || value === undefined) return 'hinge'
  if (!isGrilleSide(value)) throw new Error('Выберите расположение решётки: grilleSideCode')
  return value
}
