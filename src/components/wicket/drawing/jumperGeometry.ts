import { isJumperPlacement, type JumperPlacement } from '../../../app/api/jumperProperties'
export type JumperProjection = 'above' | 'behind'
export type WicketView = 'street' | 'yard'

export interface JumperGeometryInput {
  openingHeight: number
  bottomClearance: number
  hasPosts: boolean
  jumperPlacement: JumperPlacement
  jumperHeight: number
}

export interface JumperGeometry {
  visible: boolean
  placement: JumperProjection
  railY: number
  gateY: number
  gateHeight: number
  postY: number
  postHeight: number
}

export interface JumperPresentation {
  layer: 'background' | 'foreground'
  dashed: boolean
}

export function computeJumperGeometry(input: JumperGeometryInput): JumperGeometry {
  if (!isJumperPlacement(input.jumperPlacement) || typeof input.hasPosts !== 'boolean') {
    throw new Error('Для геометрии нужны явные свойства перемычки и столбов.')
  }
  const visible = input.jumperPlacement !== 'none'
  // Explicit none has a hidden overhead projection, matching saved BE geometry.
  const placement: JumperProjection = input.jumperPlacement === 'behind' ? 'behind' : 'above'
  const topDeduction = visible && placement === 'above'
    ? Math.max(0, input.jumperHeight) + 5
    : 0
  const workingHeight = Math.max(0, input.openingHeight - topDeduction)
  const gateHeight = Math.max(0, workingHeight - input.bottomClearance)
  const gateY = Math.max(0, input.openingHeight - input.bottomClearance - gateHeight)
  const postHeight = input.hasPosts ? workingHeight : 0
  const postY = Math.max(0, input.openingHeight - postHeight)

  return { visible, placement, railY: 0, gateY, gateHeight, postY, postHeight }
}

export function resolveJumperPresentation(
  placement: JumperProjection,
  view: WicketView,
): JumperPresentation {
  const background = placement === 'behind' && view === 'street'
  return { layer: background ? 'background' : 'foreground', dashed: background }
}
