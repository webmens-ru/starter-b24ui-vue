import { baseRailPath, computeWicketBase, type WicketBaseGeometry } from '../wicketBaseGeometry'
import { parseDrawingFillingOrientation } from '../../../../app/fillingOrientations'
import { parseDrawingGrilleSide } from '../../../../app/grilleSides'
import { computeJumperGeometry } from '../jumperGeometry'
import { parseDrawingPipeProfiles, type DrawingPipeSource } from '../pipeProfiles'
import { frameSubtypeCapabilities, resolveFrameSubtype } from '../../frameSubtype'
import { parseOpeningOrientation } from '../../openingOrientation'

export interface Type2DrawingSource extends DrawingPipeSource {
  widthProyema?: unknown
  heightProyema?: unknown
  clearanceProyema?: unknown
  hasStolby?: unknown
  jumperPlacement?: unknown
  jumperPlacementProblem?: unknown
  postsPresenceProblem?: unknown
  stolbName?: unknown
  openingOptionName?: unknown
  openingOrientation?: unknown
  shieldType?: unknown
  heightLowerPart?: unknown
  heightTopPart?: unknown
  widthSidePart?: unknown
  grilleLocation?: unknown
  peremichkaPolozheniyeName?: unknown
  peremichkaSortamentName?: unknown
  colorFacade?: unknown
  colorFacadeHex?: unknown
  colorFacadeImage?: unknown
  colorFacadeReverseHex?: unknown
  colorFacadeReverseImage?: unknown
  colorYardHex?: unknown
  colorYardImage?: unknown
  raspolozheniyePolotna?: unknown
  colorShieldHex?: unknown
  sideGrilleNetImage?: unknown
  lowerGrilleNetImage?: unknown
  upperGrilleNetImage?: unknown
}

export interface DrawingRect {
  x: number
  y: number
  width: number
  height: number
}

interface VisibleRect extends DrawingRect {
  visible: boolean
}

export type Type2GateSubtype = 'type1' | 'type2' | 'type3' | 'type4' | 'type5'

export interface Type2DrawingGeometry {
  base: WicketBaseGeometry
  drawing: { width: number; height: number }
  opening: DrawingRect
  gateZone: DrawingRect
  gate: DrawingRect
  posts: { visible: boolean; left: DrawingRect; right: DrawingRect }
  subtype: Type2GateSubtype
  hingeSide: 'left' | 'right'
  fillArea: DrawingRect
  netArea: DrawingRect & { visible: boolean }
  netImage: string
  upperNetArea: DrawingRect & { visible: boolean }
  upperNetImage: string
  innerFrame: { top: DrawingRect; bottom: DrawingRect; left: DrawingRect; right: DrawingRect }
  rails: {
    lowerSubtype: VisibleRect
    upperSubtype: VisibleRect
    verticalSubtype: VisibleRect
    centerFill: VisibleRect
  }
  extraRail: VisibleRect & { placement: 'above' | 'behind' }
  hinges: DrawingRect[]
  strip: DrawingRect[]
  fill: {
    color: string
    image: string
    reverseColor: string
    reverseImage: string
    direction: 'horizontal' | 'vertical'
  }
  yardFill: {
    color: string
    image: string
    direction: 'horizontal' | 'vertical'
  }
  frameColor: string
}

const RAIL_SIZE = 50
const INNER_FRAME_SIZE = 20
const SUBTYPE_RAIL_SIZE = 50
const CENTER_RAIL_SIZE = 40

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const empty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  if (empty) return fallback;
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function fillColor(value: unknown): string {
  const valueText = text(value)
  // Поддерживает #RRGGBB и RRGGBB (с и без решётки)
  if (/^#[0-9a-f]{6}$/i.test(valueText)) return valueText
  if (/^[0-9a-f]{6}$/i.test(valueText)) return `#${valueText}`
  return ''
}

function frameColorHex(value: unknown): string {
  const valueText = text(value)
  if (/^#[0-9a-f]{6}$/i.test(valueText)) return valueText
  if (/^[0-9a-f]{6}$/i.test(valueText)) return `#${valueText}`
  return '#66686c'
}

function safeRect(x: number, y: number, width: number, height: number): DrawingRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}

export function buildTopRailPath(rect: DrawingRect): string {
  return baseRailPath(rect)
}

export function buildBottomRailPath(rect: DrawingRect): string {
  return baseRailPath(rect, true)
}

export function computeType2Geometry(source: Type2DrawingSource): Type2DrawingGeometry {
  const fillingOrientation = parseDrawingFillingOrientation(source.raspolozheniyePolotna)
  const openingWidth = numberInRange(source.widthProyema, 1000, 300, 10000)
  const openingHeight = numberInRange(source.heightProyema, 2000, 500, 5000)
  const clearance = numberInRange(source.clearanceProyema, 50, 0, 500)
  const jumper = parseDrawingPipeProfiles(source, RAIL_SIZE)
  const hasPosts = jumper.hasPosts
  const postWidth = jumper.postWidth
  const { hingeSide } = parseOpeningOrientation(source.openingOrientation)
  const gateSubtype = resolveFrameSubtype(source.shieldType)
  const capabilities = frameSubtypeCapabilities(source.shieldType)
  const lowerPartHeight = numberInRange(source.heightLowerPart, 300, 0, 1000)
  const upperPartHeight = numberInRange(source.heightTopPart, 300, 0, 1000)
  const sidePartWidth = numberInRange(source.widthSidePart, 300, 20, 3000)
  const grilleSide = parseDrawingGrilleSide(source.grilleLocation, capabilities.side)

  const extraRailSize = jumper.placement === 'above' ? jumper.overheadJumperHeight : jumper.jumperFaceSize
  const vertical = computeJumperGeometry({
    openingHeight,
    bottomClearance: clearance,
    hasPosts,
    jumperPlacement: jumper.placement,
    jumperHeight: extraRailSize,
  })

  const base = computeWicketBase({ profileSize: RAIL_SIZE, openingWidth, vertical, hasPosts, postWidth, orientation: parseOpeningOrientation(source.openingOrientation) })
  const { gate, gateZone, hinges, strip } = base

  const gateInner = safeRect(
    gate.x + RAIL_SIZE,
    gate.y + RAIL_SIZE,
    gate.width - 2 * RAIL_SIZE,
    gate.height - 2 * RAIL_SIZE,
  )
  const baseFill = safeRect(
    gate.x + RAIL_SIZE + INNER_FRAME_SIZE,
    gate.y + RAIL_SIZE + INNER_FRAME_SIZE,
    gate.width - 2 * (RAIL_SIZE + INNER_FRAME_SIZE),
    gate.height - 2 * (RAIL_SIZE + INNER_FRAME_SIZE),
  )

  const lowerRailY = Math.max(
    gate.y + RAIL_SIZE + 2 * INNER_FRAME_SIZE,
    gate.y + gate.height - RAIL_SIZE - lowerPartHeight - SUBTYPE_RAIL_SIZE,
  )
  const lowerSubtype = {
    ...safeRect(baseFill.x - INNER_FRAME_SIZE, lowerRailY, baseFill.width + 2 * INNER_FRAME_SIZE, SUBTYPE_RAIL_SIZE),
    visible: capabilities.lower,
  }
  const upperRailMaxY = Math.max(gateInner.y, gateSubtype === 'type5'
    ? gateInner.y + gateInner.height - SUBTYPE_RAIL_SIZE - INNER_FRAME_SIZE
    : lowerSubtype.y - SUBTYPE_RAIL_SIZE - INNER_FRAME_SIZE)
  const upperSubtype = {
    ...safeRect(
      baseFill.x - INNER_FRAME_SIZE,
      Math.min(gateInner.y + upperPartHeight, upperRailMaxY),
      baseFill.width + 2 * INNER_FRAME_SIZE,
      SUBTYPE_RAIL_SIZE,
    ),
    visible: capabilities.top,
  }

  const meshOnLeft = grilleSide === 'hinge' ? hingeSide === 'left' : hingeSide !== 'left'
  const verticalMinX = gateInner.x + INNER_FRAME_SIZE
  const verticalMaxX = Math.max(verticalMinX, gateInner.x + gateInner.width - SUBTYPE_RAIL_SIZE - INNER_FRAME_SIZE)
  const verticalX = meshOnLeft
    ? Math.min(gateInner.x + sidePartWidth, verticalMaxX)
    : Math.max(gateInner.x + gateInner.width - sidePartWidth - SUBTYPE_RAIL_SIZE, verticalMinX)
  const verticalSubtype = {
    ...safeRect(verticalX, gateInner.y, SUBTYPE_RAIL_SIZE, gateInner.height),
    visible: capabilities.side,
  }

  let meshArea = baseFill
  let fillArea = gateInner
  let netArea = { ...safeRect(0, 0, 0, 0), visible: false }
  let upperNetArea = { ...safeRect(0, 0, 0, 0), visible: false }
  if (gateSubtype === 'type2') {
    const netY = lowerSubtype.y + lowerSubtype.height
    netArea = {
      ...safeRect(gateInner.x, netY, gateInner.width, gateInner.y + gateInner.height - netY),
      visible: true,
    }
    meshArea = safeRect(baseFill.x, baseFill.y, baseFill.width, lowerSubtype.y - INNER_FRAME_SIZE - baseFill.y)
    fillArea = safeRect(gateInner.x, gateInner.y, gateInner.width, lowerSubtype.y - gateInner.y)
  } else if (gateSubtype === 'type3') {
    upperNetArea = {
      ...safeRect(gateInner.x, gateInner.y, gateInner.width, upperSubtype.y - gateInner.y),
      visible: true,
    }
    const netY = lowerSubtype.y + lowerSubtype.height
    netArea = {
      ...safeRect(gateInner.x, netY, gateInner.width, gateInner.y + gateInner.height - netY),
      visible: true,
    }
    const meshY = upperSubtype.y + upperSubtype.height + INNER_FRAME_SIZE
    meshArea = safeRect(baseFill.x, meshY, baseFill.width, lowerSubtype.y - INNER_FRAME_SIZE - meshY)
    const fillY = upperSubtype.y + upperSubtype.height
    fillArea = safeRect(gateInner.x, fillY, gateInner.width, lowerSubtype.y - fillY)
  } else if (gateSubtype === 'type5') {
    upperNetArea = {
      ...safeRect(gateInner.x, gateInner.y, gateInner.width, upperSubtype.y - gateInner.y),
      visible: true,
    }
    const fillY = upperSubtype.y + upperSubtype.height
    fillArea = safeRect(gateInner.x, fillY, gateInner.width, gateInner.y + gateInner.height - fillY)
    meshArea = safeRect(baseFill.x, fillY + INNER_FRAME_SIZE, baseFill.width,
      gateInner.y + gateInner.height - fillY - 2 * INNER_FRAME_SIZE)
  } else if (gateSubtype === 'type4') {
    if (meshOnLeft) {
      netArea = {
        ...safeRect(gateInner.x, gateInner.y, verticalSubtype.x - gateInner.x, gateInner.height),
        visible: true,
      }
      const meshX = verticalSubtype.x + verticalSubtype.width + INNER_FRAME_SIZE
      meshArea = safeRect(meshX, baseFill.y, baseFill.x + baseFill.width - meshX, baseFill.height)
      const fillX = verticalSubtype.x + verticalSubtype.width
      fillArea = safeRect(fillX, gateInner.y, gateInner.x + gateInner.width - fillX, gateInner.height)
    } else {
      const netX = verticalSubtype.x + verticalSubtype.width
      netArea = {
        ...safeRect(netX, gateInner.y, gateInner.x + gateInner.width - netX, gateInner.height),
        visible: true,
      }
      meshArea = safeRect(baseFill.x, baseFill.y, verticalSubtype.x - INNER_FRAME_SIZE - baseFill.x, baseFill.height)
      fillArea = safeRect(gateInner.x, gateInner.y, verticalSubtype.x - gateInner.x, gateInner.height)
    }
  }

  const innerFrame = {
    top: safeRect(meshArea.x - INNER_FRAME_SIZE, meshArea.y - INNER_FRAME_SIZE, meshArea.width + 2 * INNER_FRAME_SIZE, INNER_FRAME_SIZE),
    bottom: safeRect(meshArea.x - INNER_FRAME_SIZE, meshArea.y + meshArea.height, meshArea.width + 2 * INNER_FRAME_SIZE, INNER_FRAME_SIZE),
    left: safeRect(meshArea.x - INNER_FRAME_SIZE, meshArea.y, INNER_FRAME_SIZE, meshArea.height),
    right: safeRect(meshArea.x + meshArea.width, meshArea.y, INNER_FRAME_SIZE, meshArea.height),
  }
  const centerFill = {
    ...safeRect(meshArea.x, meshArea.y + (meshArea.height - CENTER_RAIL_SIZE) / 2, meshArea.width, CENTER_RAIL_SIZE),
    visible: meshArea.width > 0 && meshArea.height > 0,
  }


  return {
    base,
    drawing: { width: openingWidth, height: openingHeight },
    opening: safeRect(0, 0, openingWidth, openingHeight),
    gateZone,
    gate,
    posts: base.posts,
    subtype: gateSubtype,
    hingeSide,
    fillArea,
    netArea,
    netImage: gateSubtype === 'type5' ? '' : gateSubtype === 'type4'
      ? text(source.sideGrilleNetImage)
      : text(source.lowerGrilleNetImage),
    upperNetArea,
    upperNetImage: capabilities.top ? text(source.upperGrilleNetImage) : '',
    innerFrame,
    rails: { lowerSubtype, upperSubtype, verticalSubtype, centerFill },
    extraRail: {
      ...safeRect(0, vertical.railY, openingWidth, extraRailSize),
      visible: vertical.visible,
      placement: vertical.placement,
    },
    hinges,
    strip,
    fill: {
      color: fillColor(source.colorFacadeHex),
      image: text(source.colorFacadeImage),
      reverseColor: fillColor(source.colorFacadeReverseHex || '#D7D5C6'),
      reverseImage: text(source.colorFacadeReverseImage),
      direction: fillingOrientation ?? 'horizontal',
    },
    yardFill: {
      color: fillColor(source.colorYardHex),
      image: text(source.colorYardImage),
      direction: fillingOrientation ?? 'horizontal',
    },
    frameColor: frameColorHex(source.colorShieldHex),
  }
}
