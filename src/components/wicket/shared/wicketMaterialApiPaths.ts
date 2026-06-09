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

export function wicketZhalyuziFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-zhalyuzi`
}

export function wicketSpFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-sp`
}

export function wicketSheetFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-sheet`
}

export function wicketFenceFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-fence`
}

export function wicketLamelFilterDataUrl(modelId: string | number | null | undefined): string {
  return `/api/wicket/type${normalizeModelId(modelId)}/get-filter-data-lamel`
}
