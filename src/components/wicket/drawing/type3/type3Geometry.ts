export interface Type3DrawingSource {
  widthProyema?: unknown
  heightProyema?: unknown
  clearanceProyema?: unknown
  hasStolby?: unknown
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
  colorShieldHex?: unknown
  colorFacadeHex?: unknown
  colorFacadeImage?: unknown
  colorYardHex?: unknown
  colorYardImage?: unknown
  fillSide?: unknown
}

export interface Type3Rect { x: number; y: number; width: number; height: number }
interface VisibleRect extends Type3Rect { visible: boolean }

export interface Type3Geometry {
  drawing: { width: number; height: number }
  opening: Type3Rect
  gate: Type3Rect
  posts: { visible: boolean; left: Type3Rect; right: Type3Rect }
  frame: Type3Rect[]
  fillArea: Type3Rect
  facadePickets: Type3Rect[]
  yardPickets: Type3Rect[]
  rails: { lower: VisibleRect; upper: VisibleRect; vertical: VisibleRect }
  extraRail: VisibleRect
  frameColor: string
  facade: { color: string; image: string }
  yard: { color: string; image: string; visible: boolean }
}

function numberValue(value: unknown, fallback: number, min = 0, max = 10000): number {
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function profileSize(value: unknown): number {
  const match = text(value).match(/(\d+(?:[.,]\d+)?)/)
  return numberValue(match?.[1]?.replace(',', '.'), 80, 20, 200)
}

function rect(x: number, y: number, width: number, height: number): Type3Rect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}

export function buildType3Geometry(source: Type3DrawingSource): Type3Geometry {
  const width = numberValue(source.widthProyema, 1200, 400, 5000)
  const height = numberValue(source.heightProyema, 2100, 600, 5000)
  const clearance = numberValue(source.clearanceProyema, 100, 0, 500)
  const postsVisible = Number(source.hasStolby) === 1
  const postSize = postsVisible ? profileSize(source.stolbName) : 0
  const gate = rect(postSize + 4, 0, width - postSize * 2 - 14, height - clearance)
  const rail = 50
  const inner = 20
  const fillArea = rect(gate.x + rail, gate.y + rail, gate.width - rail * 2, gate.height - rail * 2)
  const shieldType = text(source.shieldType) || 'Тип_1'
  const lowerVisible = shieldType === 'Тип_2' || shieldType === 'Тип_3'
  const upperVisible = shieldType === 'Тип_3'
  const verticalVisible = shieldType === 'Тип_4'
  const lowerHeight = numberValue(source.heightLowerPart, 0, 0, fillArea.height)
  const upperHeight = numberValue(source.heightTopPart, 0, 0, fillArea.height)
  const sideWidth = numberValue(source.widthSidePart, 0, 0, fillArea.width)
  const lower = { ...rect(fillArea.x, fillArea.y + fillArea.height - lowerHeight - rail, fillArea.width, rail), visible: lowerVisible }
  const upper = { ...rect(fillArea.x, fillArea.y + upperHeight, fillArea.width, rail), visible: upperVisible }
  const vertical = { ...rect(fillArea.x + sideWidth, fillArea.y, rail, fillArea.height), visible: verticalVisible }
  const activeFill = rect(
    verticalVisible ? vertical.x + rail : fillArea.x,
    upperVisible ? upper.y + rail : fillArea.y,
    fillArea.width - (verticalVisible ? sideWidth + rail : 0),
    fillArea.height - (upperVisible ? upperHeight + rail : 0) - (lowerVisible ? lowerHeight + rail : 0),
  )
  const count = Math.round(numberValue(source.numberOfSticks, 0, 0, 200))
  const horizontal = /горизонт/i.test(text(source.raspolozheniyePolotna))
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
    posts: {
      visible: postsVisible,
      left: rect(0, 0, postSize, height),
      right: rect(width - postSize, 0, postSize, height),
    },
    frame: [
      rect(gate.x, gate.y, gate.width, rail),
      rect(gate.x, gate.y + gate.height - rail, gate.width, rail),
      rect(gate.x, gate.y, rail, gate.height),
      rect(gate.x + gate.width - rail, gate.y, rail, gate.height),
      rect(fillArea.x, fillArea.y, inner, fillArea.height),
      rect(fillArea.x + fillArea.width - inner, fillArea.y, inner, fillArea.height),
    ],
    fillArea: activeFill,
    facadePickets,
    yardPickets: text(source.fillSide) === 'Две стороны' ? facadePickets : [],
    rails: { lower, upper, vertical },
    extraRail: {
      ...rect(0, /над/i.test(text(source.peremichkaPolozheniyeName)) ? 0 : height / 2, width, rail),
      visible: text(source.peremichkaPolozheniyeName) !== '',
    },
    frameColor: text(source.colorShieldHex) || '#66686c',
    facade: { color: text(source.colorFacadeHex) || '#8b7355', image: text(source.colorFacadeImage) },
    yard: {
      color: text(source.colorYardHex) || '#6f604f',
      image: text(source.colorYardImage),
      visible: text(source.fillSide) === 'Две стороны',
    },
  }
}
