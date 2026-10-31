import { buildStreetCrossbarGeometry } from '../streetCrossbarGeometry'
import type { Type5Source } from '../type5/type5Geometry'

export function buildType8Geometry(source: Type5Source) {
  const { crossbars, ...shared } = buildStreetCrossbarGeometry(source, 60, 1, 40, 'floor')
  return { ...shared, crossbar: crossbars[0]! }
}
