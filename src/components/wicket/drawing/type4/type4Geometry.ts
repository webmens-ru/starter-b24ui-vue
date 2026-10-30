import { parseDrawingFillingOrientation } from '../../../../app/fillingOrientations'
import { parseDrawingGrilleSide } from '../../../../app/grilleSides'
import { frameSubtypeCapabilities, resolveFrameSubtype } from '../../frameSubtype'
import { parseOpeningOrientation } from '../../openingOrientation'
import { computeJumperGeometry } from '../jumperGeometry'
import { parseDrawingPipeProfiles } from '../pipeProfiles'
import { computeWicketBase, type BaseRect } from '../wicketBaseGeometry'
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
  const width = number(source.widthProyema, 1000), height = number(source.heightProyema, 2000)
  if (width < 700 || height < 1500) throw new Error('Минимальный размер калитки — 700×1500 мм.')
  const pipes = parseDrawingPipeProfiles(source, 50)
  const extraSize = pipes.placement === 'above' ? pipes.overheadJumperHeight : pipes.jumperFaceSize
  const vertical = computeJumperGeometry({ openingHeight: height, bottomClearance: number(source.clearanceProyema, 50), hasPosts: pipes.hasPosts, jumperPlacement: pipes.placement, jumperHeight: extraSize })
  const orientation = parseOpeningOrientation(source.openingOrientation)
  const base = computeWicketBase({ profileSize: 50, openingWidth: width, vertical, hasPosts: pipes.hasPosts, postWidth: pipes.postWidth, orientation })
  resolveFrameSubtype(source.shieldType)
  const capabilities = frameSubtypeCapabilities(source.shieldType)
  const inside = rect(base.gate.x + 50, base.gate.y + 50, base.gate.width - 100, base.gate.height - 100)
  const topHeight = capabilities.top ? number(source.heightTopPart, 300) : 0
  const lowerHeight = capabilities.lower ? number(source.heightLowerPart, 300) : 0
  const sideWidth = capabilities.side ? number(source.widthSidePart, 300) : 0
  const meshSide = parseDrawingGrilleSide(source.grilleLocation, capabilities.side)
  const meshLeft = meshSide === 'hinge' ? orientation.hingeSide === 'left' : orientation.hingeSide !== 'left'
  const topDeduction = capabilities.top ? topHeight + 50 : 0
  const lowerDeduction = capabilities.lower ? lowerHeight + 50 : 0
  const sideDeduction = capabilities.side ? sideWidth + 50 : 0
  const central = rect(inside.x + (capabilities.side && meshLeft ? sideDeduction : 0), inside.y + topDeduction, inside.width - sideDeduction, inside.height - topDeduction - lowerDeduction)
  if (central.width <= 10 || central.height <= 31) throw new Error('Размеры секций не оставляют места для заполнения.')
  const rails = [
    ...(capabilities.top ? [rect(inside.x, inside.y + topHeight, inside.width, 50)] : []),
    ...(capabilities.lower ? [rect(inside.x, inside.y + inside.height - lowerHeight - 50, inside.width, 50)] : []),
    ...(capabilities.side ? [rect(meshLeft ? inside.x + sideWidth : inside.x + inside.width - sideWidth - 50, inside.y, 50, inside.height)] : []),
  ]
  const innerFrame = [
    rect(central.x + 0.5, central.y, central.width - 1, 15),
    rect(central.x + 0.5, central.y + central.height - 15, central.width - 1, 15),
    rect(central.x, central.y + 15.5, 15, central.height - 31),
    rect(central.x + central.width - 15, central.y + 15.5, 15, central.height - 31),
  ]
  const netAreas = [
    ...(capabilities.top ? [{ area: rect(inside.x, inside.y, inside.width, topHeight), image: String(source.upperGrilleNetImage || ''), side: false }] : []),
    ...(capabilities.lower ? [{ area: rect(inside.x, inside.y + inside.height - lowerHeight, inside.width, lowerHeight), image: String(source.lowerGrilleNetImage || ''), side: false }] : []),
    ...(capabilities.side ? [{ area: rect(meshLeft ? inside.x : inside.x + inside.width - sideWidth, inside.y, sideWidth, inside.height), image: String(source.sideGrilleNetImage || ''), side: true }] : []),
  ]
  const fillingArea = rect(central.x + 5, central.y + 5, central.width - 10, central.height - 10)
  const direction = parseDrawingFillingOrientation(source.raspolozheniyePolotna)
  return { width, height, base, orientation, rails, innerFrame, netAreas, central, fillingArea, direction,
    extraRail: { ...rect(0, vertical.railY, width, extraSize), visible: vertical.visible, placement: vertical.placement } }
}
