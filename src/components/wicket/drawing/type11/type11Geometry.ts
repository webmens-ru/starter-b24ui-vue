import { buildStreetCrossbarGeometry } from '../streetCrossbarGeometry'
import type { Type5Source } from '../type5/type5Geometry'

export function buildType11Geometry(source: Type5Source) {
  return buildStreetCrossbarGeometry(source, 50, 1, 20, 'exact')
}
