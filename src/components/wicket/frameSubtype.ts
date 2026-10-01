export type FrameSubtype = 'type1' | 'type2' | 'type3' | 'type4' | 'type5'

const CAPABILITIES = Object.freeze({
  type1: Object.freeze({ top: false, lower: false, side: false }),
  type2: Object.freeze({ top: false, lower: true, side: false }),
  type3: Object.freeze({ top: true, lower: true, side: false }),
  type4: Object.freeze({ top: false, lower: false, side: true }),
  type5: Object.freeze({ top: true, lower: false, side: false }),
} satisfies Record<FrameSubtype, { top: boolean; lower: boolean; side: boolean }>)

export function resolveFrameSubtype(value: unknown): FrameSubtype {
  if (typeof value !== 'string') return 'type1'
  const normalized = value.replace(/^Тип_([1-5])$/, 'type$1')
  return normalized in CAPABILITIES ? normalized as FrameSubtype : 'type1'
}

export function frameSubtypeCapabilities(value: unknown): { top: boolean; lower: boolean; side: boolean } {
  return CAPABILITIES[resolveFrameSubtype(value)]
}
