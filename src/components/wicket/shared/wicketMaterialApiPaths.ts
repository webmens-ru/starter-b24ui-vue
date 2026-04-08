/** Общие пути API для шагов «Заполнение» (type1 / type2 — один контракт, разные компоненты). */

function normalizeModelId(modelId: string | number | null | undefined): string {
  return modelId != null && String(modelId) !== '' ? String(modelId) : '1'
}

export function wicketSidingFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-siding`
}

export function wicketProfnastilFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data`
}
