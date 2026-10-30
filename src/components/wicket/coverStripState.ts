import type { CoverStripCatalogItem, CoverStripSelection } from '../../app/api/wicket.types'

export interface CoverStripDraft {
  frameColorToken?: string | null
  requiresColorConfirmation?: boolean
  materialItemId: number | null
  parameters: { attributeId: number; colorId: number | null }[]
  unavailable?: boolean
}
const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export function coverStripError(rows: readonly CoverStripDraft[]): string {
  return coverStripStructureError(rows) || (rows.some(row => row.requiresColorConfirmation) ? 'Проверьте цвет каждого нащельника после изменения цвета каркаса.' : '')
}
export function coverStripStructureError(rows: readonly CoverStripDraft[]): string {
  if (rows.length > 4) return 'Можно выбрать не более четырёх нащельников.'
  for (const row of rows) {
    if (!positiveId(row.materialItemId)) return 'Выберите материал каждого нащельника.'
    if (row.unavailable) return 'Сохранённый нащельник или цвет недоступен. Замените выбор.'
    if (!row.parameters.length || row.parameters.some(p => !positiveId(p.attributeId) || !positiveId(p.colorId))) return 'Выберите цвет каждого нащельника.'
    if (new Set(row.parameters.map(p => p.attributeId)).size !== row.parameters.length) return 'Проверьте цвет нащельника.'
  }
  return ''
}
export function coverStripWire(rows: readonly CoverStripDraft[]): CoverStripSelection[] {
  const error = coverStripStructureError(rows)
  if (error) throw new TypeError(error)
  return rows.map(row => ({ ...(row.frameColorToken === undefined ? {} : { frameColorToken: row.frameColorToken }), materialItemId: row.materialItemId!, parameters: row.parameters.map(p => ({ attributeId: p.attributeId, colorId: p.colorId! })) }))
}
export function parseCoverStripSelections(value: unknown): CoverStripSelection[] {
  if (!Array.isArray(value)) throw new TypeError('Проверьте выбранные нащельники.')
  const rows = value.map(row => {
    if (row === null || typeof row !== 'object' || !Array.isArray(row.parameters)) throw new TypeError('Проверьте выбранные нащельники.')
    if (row.frameColorToken !== undefined && row.frameColorToken !== null && (typeof row.frameColorToken !== 'string' || !/^[a-f0-9]{64}$/.test(row.frameColorToken))) throw new TypeError('Проверьте подтверждение цвета нащельника.')
    if (row.requiresColorConfirmation !== undefined && typeof row.requiresColorConfirmation !== 'boolean') throw new TypeError('Проверьте подтверждение цвета нащельника.')
    return { ...(row.frameColorToken === undefined ? {} : { frameColorToken: row.frameColorToken }), ...(row.requiresColorConfirmation === undefined ? {} : { requiresColorConfirmation: row.requiresColorConfirmation }), materialItemId: row.materialItemId, parameters: row.parameters.map((p: unknown) => {
      if (p === null || typeof p !== 'object') throw new TypeError('Проверьте цвет нащельника.')
      const param = p as Record<string, unknown>
      return { attributeId: param.attributeId, colorId: param.colorId }
    }) } as CoverStripDraft
  })
  coverStripWire(rows)
  return rows as CoverStripSelection[]
}
export function coverStripParameters(item: CoverStripCatalogItem) {
  return item.orderParameters.filter(p => p.code === 'color' && p.dataType === 'color')
}
export function newCoverStripDraft(item: CoverStripCatalogItem): CoverStripDraft {
  return { materialItemId: item.materialItemId, parameters: coverStripParameters(item).map(p => ({ attributeId: p.attributeId, colorId: p.values.length === 1 ? p.values[0]!.id : null })) }
}
export function isCoverStripAvailable(row: CoverStripDraft, items: CoverStripCatalogItem[]): boolean {
  if (row.materialItemId === null) return true
  const item = items.find(item => item.materialItemId === row.materialItemId)
  if (!item) return false
  const definitions = coverStripParameters(item)
  return definitions.length > 0 && definitions.length === row.parameters.length && definitions.every(def => row.parameters.some(p => p.attributeId === def.attributeId && (p.colorId === null || def.values.some(v => v.id === p.colorId))))
}
