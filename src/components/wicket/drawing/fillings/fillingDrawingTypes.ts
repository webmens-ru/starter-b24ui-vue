import type { FillingDrawingProfile } from '../../../../app/api/fillingDrawingProfiles'

export interface FillingArea {
  x: number
  y: number
  width: number
  height: number
}

export type FillingDirection = 'horizontal' | 'vertical'

export interface FillingVisualProps {
  area: FillingArea
  direction: FillingDirection
  color: string
  image: string
  coatingColor: string
  coatingImage: string
  reliefImage: string
  appearanceMode: 'coating' | 'solid'
  idPrefix: string
}

export interface FillingDrawingProps extends FillingVisualProps {
  profile: FillingDrawingProfile | null
}

export interface ProfileSegment {
  size: number
  shadow: boolean
}
