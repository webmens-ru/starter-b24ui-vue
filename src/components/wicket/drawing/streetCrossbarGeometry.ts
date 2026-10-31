import { buildRetainedFrameGeometry } from './retainedFrameGeometry'
import type { Type5Source } from './type5/type5Geometry'

export function buildStreetCrossbarGeometry(source: Type5Source, profileSize: 50 | 60, count: 1 | 3, height: 20 | 40 = count === 1 ? 40 : 20, singleBarRounding: 'floor' | 'exact' = 'floor') {
  const shared = buildRetainedFrameGeometry(source, profileSize, {
    top: source.netWidthProviderTop !== '',
    lower: source.netWidthProviderLower !== '',
    side: source.netWidthProviderSide !== '',
  }, height === 20 && count === 1 ? 20 : 31)
  const c = shared.central
  if (count === 1 && (height === 20 ? c.height <= height : c.height < height)) throw new Error('Высота центрального проёма должна быть не менее 40 мм для поперечины.')
  if (count === 3 && c.height <= 60) throw new Error('Высота центрального проёма должна быть больше 60 мм для трёх поперечин.')
  const gap = (c.height - count * height) / (count + 1)
  const crossbars = Array.from({ length: count }, (_, index) => ({
    x: c.x,
    y: c.y + (count === 1 ? (singleBarRounding === 'floor' ? Math.floor(gap) : gap) : (index + 1) * gap + index * height),
    width: c.width - 1, height, depthStart: 0, depthEnd: 40,
  }))
  return { ...shared, crossbars }
}
