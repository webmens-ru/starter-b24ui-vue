import type { Type2DrawingSource } from '../type2/type2Geometry'
import type { BaseRect } from '../wicketBaseGeometry'
import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'

export interface Type5Source extends Type2DrawingSource {
  netWidthProviderTop?: unknown
  netWidthProviderLower?: unknown
  netWidthProviderSide?: unknown
}

export interface Type5RetainerPart extends BaseRect {
  position: number
  points?: string
}
export interface Type5RetainerFrame {
  face: 'street' | 'yard'
  depth: number
  parts: Type5RetainerPart[]
}
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
  const x = c.x - 10, y = c.y - 10, w = c.width + 20, h = c.height + 20
  const points = (pairs: number[][]) => pairs.map(pair => pair.join(',')).join(' ')
  const street: Type5RetainerFrame = { face: 'street', depth: -4, parts: [
    { x: x + 0.5, y, width: w - 1, height: 40, position: 10,
      points: points([[x + 0.5, y], [x + w - 0.5, y], [x + w - 40.5, y + 40], [x + 40.5, y + 40]]) },
    { x: x + 0.5, y: y + h - 40, width: w - 1, height: 40, position: 10,
      points: points([[x + 40.5, y + h - 40], [x + w - 40.5, y + h - 40], [x + w - 0.5, y + h], [x + 0.5, y + h]]) },
    { x, y: y + 0.5, width: 40, height: h - 1, position: 8,
      points: points([[x, y + 0.5], [x + 40, y + 40.5], [x + 40, y + h - 40.5], [x, y + h - 0.5]]) },
    { x: x + w - 40, y: y + 0.5, width: 40, height: h - 1, position: 8,
      points: points([[x + w, y + 0.5], [x + w, y + h - 0.5], [x + w - 40, y + h - 40.5], [x + w - 40, y + 40.5]]) },
  ] }
  return { ...shared, innerFrames: { street, yard } }
}
