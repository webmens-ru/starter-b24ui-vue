import { buildRetainedFrameGeometry } from '../retainedFrameGeometry'
import { buildMitredRetainerFrame } from '../mitredRetainerGeometry'
import type { Type5Source } from '../type5/type5Geometry'

export function buildType7Geometry(source: Type5Source) {
  const shared = buildRetainedFrameGeometry(source, 50, {
    top: source.netWidthProviderTop !== '',
    lower: source.netWidthProviderLower !== '',
    side: source.netWidthProviderSide !== '',
  })
  if (shared.central.width <= 60 || shared.central.height <= 60) throw new Error('Размеры секций не оставляют места для внутренней рамки.')
  return { ...shared, innerFrames: {
    street: buildMitredRetainerFrame(shared.central, 'street', -4),
    yard: buildMitredRetainerFrame(shared.central, 'yard', 50),
  } }
}
