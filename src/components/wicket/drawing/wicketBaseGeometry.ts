import type { OpeningOrientation } from '../../../app/api/wicket.types'
import type { JumperGeometry } from './jumperGeometry'

export interface BaseRect { x: number; y: number; width: number; height: number }
export interface WicketBaseGeometry {
  gate: BaseRect
  gateZone: BaseRect
  outerFrame: { left: BaseRect; right: BaseRect; top: string; bottom: string }
  posts: { visible: boolean; left: BaseRect; right: BaseRect }
  hinges: BaseRect[]
  strip: BaseRect[]
}
function rect(x: number, y: number, width: number, height: number): BaseRect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) }
}
export function baseRailPath(r: BaseRect, bottom = false): string {
  const inset = Math.min(r.height, r.width / 2)
  return bottom
    ? `M${r.x},${r.y + r.height} L${r.x + r.width},${r.y + r.height} L${r.x + r.width - inset},${r.y} L${r.x + inset},${r.y} Z`
    : `M${r.x},${r.y} L${r.x + r.width},${r.y} L${r.x + r.width - inset},${r.y + r.height} L${r.x + inset},${r.y + r.height} Z`
}
export function computeWicketBase(input: {
  profileSize: 50 | 60
  openingWidth: number
  vertical: JumperGeometry
  hasPosts: boolean
  postWidth: number
  orientation: OpeningOrientation | null
}): WicketBaseGeometry {
  const { profileSize, openingWidth, vertical, hasPosts, orientation } = input
  const postWidth = hasPosts ? input.postWidth : 0
  const gateZone = rect(postWidth, vertical.gateY, openingWidth - 2 * postWidth, vertical.gateHeight)
  const right = orientation?.hingeSide === 'right'
  const gate = rect(gateZone.x + (right ? 10 : 4), gateZone.y, gateZone.width - 14, gateZone.height)
  const hingeX = right ? gate.x + gate.width - 6 : gate.x - 10
  const hinges = orientation ? [gate.y + 100, gate.y + gate.height - 250].flatMap(y => [
    rect(hingeX, y, 16, 75), rect(hingeX, y + 75, 16, 75),
  ]) : []
  const closureUsesPipe = !hasPosts && orientation?.opensOutward === false
  const stripX = closureUsesPipe ? (right ? gate.x - 10 : gate.x + gate.width - 10) : (right ? gate.x - 25 : gate.x + gate.width - 15)
  const strip = orientation ? (closureUsesPipe ? [20] : [14, 12, 14]).map((width, index, widths) =>
    rect(stripX + widths.slice(0, index).reduce((sum, value) => sum + value, 0), gate.y, width, gate.height),
  ) : []
  const railHeight = Math.min(profileSize, gate.height)
  return {
    gate, gateZone, hinges, strip,
    outerFrame: {
      left: rect(gate.x, gate.y, profileSize, gate.height),
      right: rect(gate.x + Math.max(0, gate.width - profileSize), gate.y, profileSize, gate.height),
      top: baseRailPath(rect(gate.x, gate.y, gate.width, railHeight)),
      bottom: baseRailPath(rect(gate.x, gate.y + Math.max(0, gate.height - profileSize), gate.width, railHeight), true),
    },
    posts: {
      visible: hasPosts,
      left: rect(0, vertical.postY, postWidth, vertical.postHeight),
      right: rect(openingWidth - postWidth, vertical.postY, postWidth, vertical.postHeight),
    },
  }
}
