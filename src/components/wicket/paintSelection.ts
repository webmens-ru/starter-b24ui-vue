import type { PaintColorItem } from '../../app/api/wicket.types'
export function selectPaintColor(colors: readonly PaintColorItem[], previous: number | null): number | null {
  if (previous !== null && colors.some(color => color.id === previous)) return previous
  return colors.length === 1 ? colors[0]!.id : null
}
