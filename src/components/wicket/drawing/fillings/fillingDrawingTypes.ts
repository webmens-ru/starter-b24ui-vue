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
  appearanceMode: 'coating' | 'solid'
  idPrefix: string
}

export interface FillingDrawingProps extends FillingVisualProps {
  materialGroup: string
  materialName: string
}

export interface ProfileSegment {
  size: number
  shadow: boolean
}
