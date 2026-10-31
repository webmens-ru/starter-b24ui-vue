import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
import type { BaseRect } from '../wicketBaseGeometry'
import type { Type2DrawingSource } from '../type2/type2Geometry'

export interface Type4Source extends Type2DrawingSource {
  fillSide?: unknown
  thicknessFacade?: unknown
  thicknessYard?: unknown
}
function number(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Проверьте размеры калитки.')
  return parsed
}
function rect(x: number, y: number, width: number, height: number): BaseRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}
export function buildLamellae(area: BaseRect, widthValue: unknown, direction: 'horizontal' | 'vertical'): BaseRect[] {
  const width = number(widthValue, 0)
  if (width <= 0) throw new Error('Не настроена ширина выбранной ламели.')
  const horizontal = direction === 'horizontal'
  const span = horizontal ? area.height : area.width
  const count = Math.ceil(span / width)
  if (count > 2000) throw new Error('Некорректная ширина ламели.')
  return Array.from({ length: count }, (_, index) => horizontal
    ? rect(area.x, area.y + index * width, area.width, Math.min(width, span - index * width))
    : rect(area.x + index * width, area.y, Math.min(width, span - index * width), area.height))
}
export function buildType4Geometry(source: Type4Source) {
  const shared = buildRetainedFrameGeometry(source, 50)
  const { central } = shared
  const innerFrame = [
    // Detail 5: two horizontal pipes per physical face.
    rect(central.x + 0.5, central.y, central.width - 1, 15),
    rect(central.x + 0.5, central.y + central.height - 15, central.width - 1, 15),
    // Detail 4: two vertical pipes per physical face.
    rect(central.x, central.y + 15.5, 15, central.height - 31),
    rect(central.x + central.width - 15, central.y + 15.5, 15, central.height - 31),
  ]
  // The two perimeters coincide in elevation; their depth stack is 15 + 20 + 15 mm.
  const innerFrames = {
    street: { face: 'street' as const, depth: 0, parts: innerFrame },
    yard: { face: 'yard' as const, depth: 35, parts: innerFrame },
  }
  return { ...shared, innerFrames }
}
