import { frameSubtypeImageIndex, frameSubtypeZones, isFrameSubtypeCode } from '../../app/frameSubtypes'

export type FrameSubtype = 'type1' | 'type2' | 'type3' | 'type4' | 'type5'

export function resolveFrameSubtype(value: unknown): FrameSubtype {
  if (value === undefined) return 'type1'
  if (!isFrameSubtypeCode(value)) throw new Error('Выберите тип щита: frameSubtypeCode')
  return `type${frameSubtypeImageIndex(value)}` as FrameSubtype
}

export function frameSubtypeCapabilities(value: unknown): { top: boolean; lower: boolean; side: boolean } {
  return frameSubtypeZones(value)
}
