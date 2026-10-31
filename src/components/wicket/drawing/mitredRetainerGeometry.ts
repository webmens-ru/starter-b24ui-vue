import type { BaseRect } from './wicketBaseGeometry'

export interface RetainerPart extends BaseRect {
  position: number
  points?: string
}
export interface RetainerFrame {
  face: 'street' | 'yard'
  depth: number
  parts: RetainerPart[]
}
export function buildMitredRetainerFrame(c: BaseRect, face: 'street' | 'yard', depth: number): RetainerFrame {
  const x = c.x - 10, y = c.y - 10, w = c.width + 20, h = c.height + 20
  const points = (pairs: number[][]) => pairs.map(pair => pair.join(',')).join(' ')
  return { face, depth, parts: [
    { x: x + 0.5, y, width: w - 1, height: 40, position: 10,
      points: points([[x + 0.5, y], [x + w - 0.5, y], [x + w - 40.5, y + 40], [x + 40.5, y + 40]]) },
    { x: x + 0.5, y: y + h - 40, width: w - 1, height: 40, position: 10,
      points: points([[x + 40.5, y + h - 40], [x + w - 40.5, y + h - 40], [x + w - 0.5, y + h], [x + 0.5, y + h]]) },
    { x, y: y + 0.5, width: 40, height: h - 1, position: 8,
      points: points([[x, y + 0.5], [x + 40, y + 40.5], [x + 40, y + h - 40.5], [x, y + h - 0.5]]) },
    { x: x + w - 40, y: y + 0.5, width: 40, height: h - 1, position: 8,
      points: points([[x + w, y + 0.5], [x + w, y + h - 0.5], [x + w - 40, y + h - 40.5], [x + w - 40, y + 40.5]]) },
  ] }
}
