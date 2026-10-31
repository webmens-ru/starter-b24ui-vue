import type { Type2DrawingSource } from '../type2/type2Geometry'
import { buildMitredRetainerFrame, type RetainerFrame, type RetainerPart } from '../mitredRetainerGeometry'
import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'

export interface Type5Source extends Type2DrawingSource {
  netWidthProviderTop?: unknown
  netWidthProviderLower?: unknown
  netWidthProviderSide?: unknown
}

export type Type5RetainerPart = RetainerPart
export type Type5RetainerFrame = RetainerFrame
export function buildType5Geometry(source: Type5Source) {
  const shared = buildRetainedFrameGeometry(source, 60, {
    top: source.netWidthProviderTop !== '',
    lower: source.netWidthProviderLower !== '',
    side: source.netWidthProviderSide !== '',
  })
  const c = shared.central
  if (c.width <= 60 || c.height <= 60) throw new Error('Размеры секций не оставляют места для внутренней рамки.')
  const yard: Type5RetainerFrame = { face: 'yard', depth: 40, parts: [
    { x: c.x + 0.5, y: c.y, width: c.width - 1, height: 20, position: 5 },
    { x: c.x + 0.5, y: c.y + c.height - 20, width: c.width - 1, height: 20, position: 5 },
    { x: c.x, y: c.y + 20.5, width: 20, height: c.height - 41, position: 4 },
    { x: c.x + c.width - 20, y: c.y + 20.5, width: 20, height: c.height - 41, position: 4 },
  ] }
  const street = buildMitredRetainerFrame(c, 'street', -4)
  return { ...shared, innerFrames: { street, yard } }
}
