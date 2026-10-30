import { parseDrawingFillingOrientation } from '../../../../app/fillingOrientations'
import { frameSubtypeCapabilities, resolveFrameSubtype } from '../../frameSubtype'
import { parseOpeningOrientation } from '../../openingOrientation'
import { computeJumperGeometry } from '../jumperGeometry'
import { parseDrawingPipeProfiles, type DrawingPipeSource } from '../pipeProfiles'

export interface Type3DrawingSource extends DrawingPipeSource {
  openingOrientation?: unknown
  widthProyema?: unknown
  heightProyema?: unknown
  clearanceProyema?: unknown
  hasStolby?: unknown
  jumperPlacement?: unknown
  jumperPlacementProblem?: unknown
  postsPresenceProblem?: unknown
  stolbName?: unknown
  shieldType?: unknown
  heightTopPart?: unknown
  heightLowerPart?: unknown
  widthSidePart?: unknown
  numberOfSticks?: unknown
  gapName?: unknown
  thicknessFacade?: unknown
  raspolozheniyePolotna?: unknown
  peremichkaPolozheniyeName?: unknown
  peremichkaSortamentName?: unknown
  colorShieldHex?: unknown
  colorFacadeHex?: unknown
  colorFacadeImage?: unknown
  colorYardHex?: unknown
  colorYardImage?: unknown
  fillSide?: unknown
  upperGrilleNetImage?: unknown
}

export interface Type3Rect { x: number; y: number; width: number; height: number }
interface VisibleRect extends Type3Rect { visible: boolean }

export interface Type3Geometry {
  drawing: { width: number; height: number }
  opening: Type3Rect
  gate: Type3Rect
  posts: { visible: boolean; left: Type3Rect; right: Type3Rect }
  hinges: Type3Rect[]
  strip: Type3Rect[]
  frame: Type3Rect[]
  innerHorizontal: Type3Rect[]
  lockRail: Type3Rect
  fillArea: Type3Rect
  facadePickets: Type3Rect[]
  yardPickets: Type3Rect[]
  rails: { lower: VisibleRect; upper: VisibleRect; vertical: VisibleRect }
  upperNetArea: VisibleRect
  upperNetImage: string
  extraRail: VisibleRect & { placement: 'above' | 'behind' }
  frameColor: string
  facade: { color: string; image: string }
  yard: { color: string; image: string; visible: boolean }
}

function numberValue(value: unknown, fallback: number, min = 0, max = 10000): number {
  const parsed = value === null || (typeof value === 'string' && value.trim() === '')
    ? Number.NaN
    : Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function rect(x: number, y: number, width: number, height: number): Type3Rect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}

export function buildType3Geometry(source: Type3DrawingSource): Type3Geometry {
  const fillingOrientation = parseDrawingFillingOrientation(source.raspolozheniyePolotna)
  const width = numberValue(source.widthProyema, 1000, 400, 5000)
  const height = numberValue(source.heightProyema, 2000, 600, 5000)
  const clearance = numberValue(source.clearanceProyema, 50, 0, 500)
  const jumper = parseDrawingPipeProfiles(source, 50)
  const postsVisible = jumper.hasPosts
  const postSize = jumper.postWidth
  const extraRailSize = jumper.placement === 'above' ? jumper.overheadJumperHeight : jumper.jumperFaceSize
  const verticalGeometry = computeJumperGeometry({
    openingHeight: height,
    bottomClearance: clearance,
    hasPosts: postsVisible,
    jumperPlacement: jumper.placement,
    jumperHeight: extraRailSize,
  })
  const orientation = source.openingOrientation == null ? null : parseOpeningOrientation(source.openingOrientation)
  const gate = rect(postSize + (orientation?.hingeSide === 'right' ? 10 : 4), verticalGeometry.gateY, width - postSize * 2 - 14, verticalGeometry.gateHeight)
  const hingeX = orientation?.hingeSide === 'right' ? gate.x + gate.width - 6 : gate.x - 10
  const hinges = orientation ? [gate.y + 100, gate.y + gate.height - 250].flatMap(y => [
    rect(hingeX, y, 16, 75),
    rect(hingeX, y + 75, 16, 75),
  ]) : []
  const stripX = orientation?.hingeSide === 'right' ? gate.x - 25 : gate.x + gate.width - 15
  const strip = orientation ? [14, 12, 14].map((partWidth, index, widths) => rect(
    stripX + widths.slice(0, index).reduce((total, part) => total + part, 0),
    gate.y, partWidth, gate.height,
  )) : []
  const rail = 50
  const inner = 20
  const fillArea = rect(gate.x + rail, gate.y + rail, gate.width - rail * 2, gate.height - rail * 2)
  resolveFrameSubtype(source.shieldType)
  const capabilities = frameSubtypeCapabilities(source.shieldType)
  const lowerVisible = capabilities.lower
  const upperVisible = capabilities.top
  const verticalVisible = capabilities.side
  const lowerHeight = numberValue(source.heightLowerPart, 0, 0, fillArea.height)
  const upperHeight = numberValue(source.heightTopPart, 0, 0, fillArea.height)
  const upperSectionHeight = upperVisible && !lowerVisible
    ? Math.min(upperHeight, Math.max(0, fillArea.height - rail - inner))
    : upperHeight
  const sideWidth = numberValue(source.widthSidePart, 0, 0, fillArea.width)
  const lower = { ...rect(fillArea.x, fillArea.y + fillArea.height - lowerHeight - rail, fillArea.width, rail), visible: lowerVisible }
  const upper = { ...rect(fillArea.x, fillArea.y + upperSectionHeight, fillArea.width, rail), visible: upperVisible }
  const upperNetArea = {
    ...rect(fillArea.x, fillArea.y, fillArea.width, upper.y - fillArea.y),
    visible: upperVisible && upperSectionHeight > 0,
  }
  const vertical = { ...rect(fillArea.x + sideWidth, fillArea.y, rail, fillArea.height), visible: verticalVisible }
  const activeFill = rect(
    verticalVisible ? vertical.x + rail : fillArea.x,
    upperVisible ? upper.y + rail : fillArea.y,
    fillArea.width - (verticalVisible ? sideWidth + rail : 0),
    fillArea.height - (upperVisible ? upperSectionHeight + rail : 0) - (lowerVisible ? lowerHeight + rail : 0),
  )
  const count = Math.round(numberValue(source.numberOfSticks, 0, 0, 200))
  const horizontal = fillingOrientation === 'horizontal'
  const picketWidth = numberValue(source.thicknessFacade, 100, 10, 500)
  const span = horizontal ? activeFill.height : activeFill.width
  const visiblePicketWidth = Math.min(picketWidth, count > 0 ? span / count : picketWidth)
  const remaining = Math.max(0, span - count * visiblePicketWidth)
  const gap = count > 1 ? remaining / (count - 1) : 0
  const facadePickets = Array.from({ length: count }, (_, index) => horizontal
    ? rect(activeFill.x, activeFill.y + index * (visiblePicketWidth + gap), activeFill.width, visiblePicketWidth)
    : rect(activeFill.x + index * (visiblePicketWidth + gap), activeFill.y, visiblePicketWidth, activeFill.height))

  return {
    drawing: { width, height },
    opening: rect(0, 0, width, height),
    gate,
    hinges,
    strip,
    posts: {
      visible: postsVisible,
      left: rect(0, verticalGeometry.postY, postSize, verticalGeometry.postHeight),
      right: rect(width - postSize, verticalGeometry.postY, postSize, verticalGeometry.postHeight),
    },
    frame: [
      rect(gate.x, gate.y, gate.width, rail),
      rect(gate.x, gate.y + gate.height - rail, gate.width, rail),
      rect(gate.x, gate.y, rail, gate.height),
      rect(gate.x + gate.width - rail, gate.y, rail, gate.height),
    ],
    innerHorizontal: [
      rect(activeFill.x, activeFill.y, activeFill.width, 40),
      rect(activeFill.x, activeFill.y + activeFill.height - 40, activeFill.width, 40),
    ],
    lockRail: rect(activeFill.x, activeFill.y + Math.floor((activeFill.height - 40) / 2), Math.max(0, activeFill.width - 1), 40),
    fillArea: activeFill,
    facadePickets,
    yardPickets: source.fillSide === 2 ? facadePickets : [],
    rails: { lower, upper, vertical },
    upperNetArea,
    upperNetImage: upperVisible ? text(source.upperGrilleNetImage) : '',
    extraRail: {
      ...rect(0, verticalGeometry.railY, width, extraRailSize),
      visible: verticalGeometry.visible,
      placement: verticalGeometry.placement,
    },
    frameColor: text(source.colorShieldHex) || '#66686c',
    facade: { color: text(source.colorFacadeHex) || '#8b7355', image: text(source.colorFacadeImage) },
    yard: {
      color: text(source.colorYardHex) || '#6f604f',
      image: text(source.colorYardImage),
      visible: source.fillSide === 2,
    },
  }
}
