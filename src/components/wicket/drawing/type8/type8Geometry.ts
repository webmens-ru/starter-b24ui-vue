import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
import type { Type5Source } from '../type5/type5Geometry'

export function buildType8Geometry(source: Type5Source) {
  const shared = buildRetainedFrameGeometry(source, 60, {
    top: source.netWidthProviderTop !== '',
    lower: source.netWidthProviderLower !== '',
    side: source.netWidthProviderSide !== '',
  })
  const c = shared.central
  if (c.height < 40) throw new Error('Высота центрального проёма должна быть не менее 40 мм для поперечины.')
  return { ...shared, crossbar: { x: c.x, y: c.y + Math.floor((c.height - 40) / 2), width: c.width - 1, height: 40, depthStart: 0, depthEnd: 40 } }
}
