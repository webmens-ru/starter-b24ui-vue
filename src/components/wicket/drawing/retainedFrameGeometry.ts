import { parseDrawingFillingOrientation } from '../../../app/fillingOrientations'
import { parseDrawingGrilleSide } from '../../../app/grilleSides'
import { frameSubtypeCapabilities, resolveFrameSubtype } from '../frameSubtype'
import { parseOpeningOrientation } from '../openingOrientation'
import { computeJumperGeometry } from './jumperGeometry'
import { parseDrawingPipeProfiles } from './pipeProfiles'
import { computeWicketBase, type BaseRect } from './wicketBaseGeometry'
import type { Type2DrawingSource } from './type2/type2Geometry'

function number(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Проверьте размеры калитки.')
  return parsed
}
function rect(x: number, y: number, width: number, height: number): BaseRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}
export function buildRetainedFrameGeometry(source: Type2DrawingSource, profileSize: 50 | 60, netSpaceFilled?: { top: boolean; lower: boolean; side: boolean }) {
  const width = number(source.widthProyema, 1000), height = number(source.heightProyema, 2000)
  if (width < 700 || height < 1500) throw new Error('Минимальный размер калитки — 700×1500 мм.')
  const pipes = parseDrawingPipeProfiles(source, profileSize)
  const extraSize = pipes.placement === 'above' ? pipes.overheadJumperHeight : pipes.jumperFaceSize
  const vertical = computeJumperGeometry({ openingHeight: height, bottomClearance: number(source.clearanceProyema, 50), hasPosts: pipes.hasPosts, jumperPlacement: pipes.placement, jumperHeight: extraSize })
  const orientation = parseOpeningOrientation(source.openingOrientation)
  const base = computeWicketBase({ profileSize, openingWidth: width, vertical, hasPosts: pipes.hasPosts, postWidth: pipes.postWidth, orientation })
  resolveFrameSubtype(source.shieldType)
  const capabilities = frameSubtypeCapabilities(source.shieldType)
  const inside = rect(base.gate.x + profileSize, base.gate.y + profileSize, base.gate.width - 2 * profileSize, base.gate.height - 2 * profileSize)
  const topHeight = capabilities.top ? number(source.heightTopPart, 300) : 0
  const lowerHeight = capabilities.lower ? number(source.heightLowerPart, 300) : 0
  const sideWidth = capabilities.side ? number(source.widthSidePart, 300) : 0
  const topSpace = topHeight + (netSpaceFilled?.top && topHeight > 0 ? 1 : 0)
  const lowerSpace = lowerHeight + (netSpaceFilled?.lower && lowerHeight > 0 ? 1 : 0)
  const sideSpace = sideWidth + (netSpaceFilled?.side && sideWidth > 0 ? 1 : 0)
  const meshSide = parseDrawingGrilleSide(source.grilleLocation, capabilities.side)
  const meshLeft = meshSide === 'hinge' ? orientation.hingeSide === 'left' : orientation.hingeSide !== 'left'
  const topDeduction = capabilities.top ? topSpace + profileSize : 0
  const lowerDeduction = capabilities.lower ? lowerSpace + profileSize : 0
  const sideDeduction = capabilities.side ? sideSpace + profileSize : 0
  const central = rect(inside.x + (capabilities.side && meshLeft ? sideDeduction : 0), inside.y + topDeduction, inside.width - sideDeduction, inside.height - topDeduction - lowerDeduction)
  if (central.width <= 10 || central.height <= 31) throw new Error('Размеры секций не оставляют места для заполнения.')
  const rails = [
    ...(capabilities.top ? [rect(inside.x, inside.y + topSpace, inside.width, profileSize)] : []),
    ...(capabilities.lower ? [rect(inside.x, inside.y + inside.height - lowerSpace - profileSize, inside.width, profileSize)] : []),
    ...(capabilities.side ? [rect(meshLeft ? inside.x + sideSpace : inside.x + inside.width - sideSpace - profileSize, inside.y, profileSize, inside.height)] : []),
  ]
  const netAreas = [
    ...(capabilities.top ? [{ area: rect(inside.x, inside.y, inside.width, topSpace), image: String(source.upperGrilleNetImage || ''), side: false }] : []),
    ...(capabilities.lower ? [{ area: rect(inside.x, inside.y + inside.height - lowerSpace, inside.width, lowerSpace), image: String(source.lowerGrilleNetImage || ''), side: false }] : []),
    ...(capabilities.side ? [{ area: rect(meshLeft ? inside.x : inside.x + inside.width - sideSpace, inside.y, sideSpace, inside.height), image: String(source.sideGrilleNetImage || ''), side: true }] : []),
  ]
  const fillingArea = rect(central.x + 5, central.y + 5, central.width - 10, central.height - 10)
  const direction = parseDrawingFillingOrientation(source.raspolozheniyePolotna)
  return { width, height, base, orientation, rails, netAreas, central, fillingArea, direction,
    extraRail: { ...rect(0, vertical.railY, width, extraSize), visible: vertical.visible, placement: vertical.placement } }
}
