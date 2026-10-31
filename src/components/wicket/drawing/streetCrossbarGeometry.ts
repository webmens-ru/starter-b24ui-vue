import { buildRetainedFrameGeometry } from './retainedFrameGeometry'
import type { Type5Source } from './type5/type5Geometry'

export function buildStreetCrossbarGeometry(source: Type5Source, profileSize: 50 | 60, count: 1 | 3) {
  const shared = buildRetainedFrameGeometry(source, profileSize, {
    top: source.netWidthProviderTop !== '',
    lower: source.netWidthProviderLower !== '',
    side: source.netWidthProviderSide !== '',
  })
  const c = shared.central
  const height = count === 1 ? 40 : 20
  if (count === 1 && c.height < 40) throw new Error('Высота центрального проёма должна быть не менее 40 мм для поперечины.')
  if (count === 3 && c.height <= 60) throw new Error('Высота центрального проёма должна быть больше 60 мм для трёх поперечин.')
  const gap = (c.height - count * height) / (count + 1)
  const crossbars = Array.from({ length: count }, (_, index) => ({
    x: c.x,
    y: c.y + (count === 1 ? Math.floor(gap) : (index + 1) * gap + index * height),
    width: c.width - 1, height, depthStart: 0, depthEnd: 40,
  }))
  return { ...shared, crossbars }
}
