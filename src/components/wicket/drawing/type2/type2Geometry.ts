export interface Type2DrawingSource {
  widthProyema?: unknown
  heightProyema?: unknown
  clearanceProyema?: unknown
  hasStolby?: unknown
  stolbName?: unknown
  openingOptionName?: unknown
  shieldType?: unknown
  heightLowerPart?: unknown
  heightTopPart?: unknown
  widthSidePart?: unknown
  grilleLocation?: unknown
  peremichkaPolozheniyeName?: unknown
  peremichkaSortamentName?: unknown
  materialFacadeGlob?: unknown
  materialFacade?: unknown
  colorFacade?: unknown
  colorFacadeHex?: unknown
  colorFacadeImage?: unknown
  raspolozheniyePolotna?: unknown
  colorShieldHex?: unknown
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

export type Type2GateSubtype = 'type1' | 'type2' | 'type3' | 'type4'

export interface Type2DrawingGeometry {
  drawing: { width: number; height: number }
  opening: DrawingRect
  gateZone: DrawingRect
  gate: DrawingRect
  posts: { visible: boolean; left: DrawingRect; right: DrawingRect }
  subtype: Type2GateSubtype
  hingeSide: 'left' | 'right'
  fillArea: DrawingRect
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
  fill: { material: 'none' | 'c8'; color: string; image: string; direction: 'horizontal' | 'vertical' }
  frameColor: string
}

const RAIL_SIZE = 50
const INNER_FRAME_SIZE = 20
const SUBTYPE_RAIL_SIZE = 60
const CENTER_RAIL_SIZE = 40
const HINGE_WIDTH = 16
const HINGE_HEIGHT = 75
const HINGE_OFFSET = 100
const GAP_HINGE_SIDE = 4
const GAP_LOCK_SIDE = 10

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function profileSize(value: unknown, fallback: number): number {
  const match = text(value).match(/(\d+(?:[.,]\d+)?)\s*[xх×]/i)
  return numberInRange(match?.[1]?.replace(',', '.'), fallback, 20, 200)
}

function subtype(value: unknown): Type2GateSubtype {
  const match = text(value).match(/[1-4]/)
  return match ? `type${match[0]}` as Type2GateSubtype : 'type1'
}

function fillColor(value: unknown): string {
  const valueText = text(value)
  // Поддерживает #RRGGBB и RRGGBB (с и без решётки)
  if (/^#[0-9a-f]{6}$/i.test(valueText)) return valueText
  if (/^[0-9a-f]{6}$/i.test(valueText)) return `#${valueText}`
  return '#f6f6f6'
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
  const inset = Math.min(rect.height, rect.width / 2)
  return `M${rect.x},${rect.y} L${rect.x + rect.width},${rect.y} L${rect.x + rect.width - inset},${rect.y + rect.height} L${rect.x + inset},${rect.y + rect.height} Z`
}

export function buildBottomRailPath(rect: DrawingRect): string {
  const inset = Math.min(rect.height, rect.width / 2)
  return `M${rect.x},${rect.y + rect.height} L${rect.x + rect.width},${rect.y + rect.height} L${rect.x + rect.width - inset},${rect.y} L${rect.x + inset},${rect.y} Z`
}

export function computeType2Geometry(source: Type2DrawingSource): Type2DrawingGeometry {
  const openingWidth = numberInRange(source.widthProyema, 1000, 300, 10000)
  const openingHeight = numberInRange(source.heightProyema, 2000, 500, 5000)
  const clearance = numberInRange(source.clearanceProyema, 50, 0, 500)
  const hasPosts = source.hasStolby === undefined ? true : Number(source.hasStolby) !== 0
  const postWidth = profileSize(source.stolbName, 50)
  const hingeSide: 'left' | 'right' = /правая/i.test(text(source.openingOptionName)) ? 'right' : 'left'
  const gateSubtype = subtype(source.shieldType)
  const lowerPartHeight = numberInRange(source.heightLowerPart, 300, 0, 1000)
  const upperPartHeight = numberInRange(source.heightTopPart, 300, 0, 1000)
  const sidePartWidth = numberInRange(source.widthSidePart, 300, 20, 3000)
  const grilleSide: 'hinge' | 'lock' = /замк/i.test(text(source.grilleLocation)) ? 'lock' : 'hinge'

  const extraRailName = text(source.peremichkaPolozheniyeName)
  const extraRailVisible = extraRailName !== '' && !/без/i.test(extraRailName)
  const extraRailPlacement: 'above' | 'behind' = /за/i.test(extraRailName) ? 'behind' : 'above'
  const extraRailSize = profileSize(source.peremichkaSortamentName, 60)
  const topOffset = extraRailVisible && extraRailPlacement === 'above' ? extraRailSize : 0

  const gateZoneX = hasPosts ? postWidth : 0
  const gateZoneWidth = Math.max(0, openingWidth - (hasPosts ? 2 * postWidth : 0))
  const gateWidth = Math.max(0, gateZoneWidth - GAP_HINGE_SIDE - GAP_LOCK_SIDE)
  const gateX = gateZoneX + (hingeSide === 'left' ? GAP_HINGE_SIDE : GAP_LOCK_SIDE)
  const gateHeight = Math.max(0, openingHeight - clearance)
  const gate = safeRect(gateX, topOffset, gateWidth, gateHeight)
  const gateZone = safeRect(gateZoneX, topOffset, gateZoneWidth, gateHeight)

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
    visible: gateSubtype === 'type2' || gateSubtype === 'type3',
  }
  const upperRailMaxY = Math.max(gateInner.y, lowerSubtype.y - SUBTYPE_RAIL_SIZE - INNER_FRAME_SIZE)
  const upperSubtype = {
    ...safeRect(
      baseFill.x - INNER_FRAME_SIZE,
      Math.min(gateInner.y + upperPartHeight, upperRailMaxY),
      baseFill.width + 2 * INNER_FRAME_SIZE,
      SUBTYPE_RAIL_SIZE,
    ),
    visible: gateSubtype === 'type3',
  }

  const meshOnLeft = grilleSide === 'hinge' ? hingeSide === 'left' : hingeSide !== 'left'
  const verticalMinX = gateInner.x + INNER_FRAME_SIZE
  const verticalMaxX = Math.max(verticalMinX, gateInner.x + gateInner.width - SUBTYPE_RAIL_SIZE - INNER_FRAME_SIZE)
  const verticalX = meshOnLeft
    ? Math.min(gateInner.x + sidePartWidth, verticalMaxX)
    : Math.max(gateInner.x + gateInner.width - sidePartWidth - SUBTYPE_RAIL_SIZE, verticalMinX)
  const verticalSubtype = {
    ...safeRect(verticalX, gateInner.y, SUBTYPE_RAIL_SIZE, gateInner.height),
    visible: gateSubtype === 'type4',
  }

  let meshArea = baseFill
  let fillArea = gateInner
  if (gateSubtype === 'type2') {
    meshArea = safeRect(baseFill.x, baseFill.y, baseFill.width, lowerSubtype.y - INNER_FRAME_SIZE - baseFill.y)
    fillArea = safeRect(gateInner.x, gateInner.y, gateInner.width, lowerSubtype.y - gateInner.y)
  } else if (gateSubtype === 'type3') {
    const meshY = upperSubtype.y + upperSubtype.height + INNER_FRAME_SIZE
    meshArea = safeRect(baseFill.x, meshY, baseFill.width, lowerSubtype.y - INNER_FRAME_SIZE - meshY)
    const fillY = upperSubtype.y + upperSubtype.height
    fillArea = safeRect(gateInner.x, fillY, gateInner.width, lowerSubtype.y - fillY)
  } else if (gateSubtype === 'type4') {
    if (meshOnLeft) {
      const meshX = verticalSubtype.x + verticalSubtype.width + INNER_FRAME_SIZE
      meshArea = safeRect(meshX, baseFill.y, baseFill.x + baseFill.width - meshX, baseFill.height)
      const fillX = verticalSubtype.x + verticalSubtype.width
      fillArea = safeRect(fillX, gateInner.y, gateInner.x + gateInner.width - fillX, gateInner.height)
    } else {
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

  const hingeX = hingeSide === 'left' ? gate.x - HINGE_WIDTH + 6 : gate.x + gate.width - 6
  const upperHingeY = gate.y + HINGE_OFFSET
  const lowerHingeY = gate.y + Math.max(0, gate.height - HINGE_OFFSET - 2 * HINGE_HEIGHT)
  const hinges = [0, 1].flatMap((index) => [
    safeRect(hingeX, upperHingeY + index * HINGE_HEIGHT, HINGE_WIDTH, HINGE_HEIGHT),
    safeRect(hingeX, lowerHingeY + index * HINGE_HEIGHT, HINGE_WIDTH, HINGE_HEIGHT),
  ])

  const stripX = hingeSide === 'left' ? gate.x + gate.width - 15 : gate.x - 25
  const strip = [14, 12, 14].map((width, index, widths) =>
    safeRect(stripX + widths.slice(0, index).reduce((sum, value) => sum + value, 0), gate.y, width, gate.height),
  )

  const fillText = `${text(source.materialFacadeGlob)} ${text(source.materialFacade)}`
  const material: 'none' | 'c8' = /проф|с\s*[-–]?\s*8|c\s*[-–]?\s*8/i.test(fillText) ? 'c8' : 'none'

  return {
    drawing: { width: openingWidth, height: openingHeight + topOffset },
    opening: safeRect(0, 0, openingWidth, openingHeight + topOffset),
    gateZone,
    gate,
    posts: {
      visible: hasPosts,
      left: safeRect(0, topOffset, postWidth, openingHeight),
      right: safeRect(openingWidth - postWidth, topOffset, postWidth, openingHeight),
    },
    subtype: gateSubtype,
    hingeSide,
    fillArea,
    innerFrame,
    rails: { lowerSubtype, upperSubtype, verticalSubtype, centerFill },
    extraRail: {
      ...safeRect(0, extraRailPlacement === 'above' ? 0 : topOffset, openingWidth, extraRailSize),
      visible: extraRailVisible,
      placement: extraRailPlacement,
    },
    hinges,
    strip,
    fill: {
      material,
      color: fillColor(source.colorFacadeHex),
      image: text(source.colorFacadeImage),
      direction: /вертик/i.test(text(source.raspolozheniyePolotna)) ? 'vertical' : 'horizontal',
    },
    frameColor: frameColorHex(source.colorShieldHex),
  }
}
