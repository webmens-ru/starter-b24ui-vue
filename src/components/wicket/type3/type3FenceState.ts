export interface FenceGeometryInput {
  widthProyema: number | string
  hasStolby: number | null
  stolbId: number | string | null
  shieldType: string
  widthSidePart: number | string
  raspolozheniyePolotna: string
  idFacade: number | string | null
}

export function fenceGeometryKey(input: FenceGeometryInput): string {
  return JSON.stringify({
    widthProyema: String(input.widthProyema),
    hasStolby: input.hasStolby,
    stolbId: input.stolbId == null ? null : String(input.stolbId),
    shieldType: input.shieldType,
    widthSidePart: String(input.widthSidePart),
    raspolozheniyePolotna: input.raspolozheniyePolotna,
    idFacade: input.idFacade == null ? null : String(input.idFacade),
  })
}

export function shouldInvalidateFenceGap(
  previous: FenceGeometryInput,
  next: FenceGeometryInput,
): boolean {
  return fenceGeometryKey(previous) !== fenceGeometryKey(next)
}
