/** Порядок основных шагов мастера (для сравнения reachedStep / activePage). */
export const WICKET_PROGRESS_STEP_ORDER = [
  'page7',
  'page2',
  'page5',
  'page6',
  'page3',
  'page_painting',
  'page9',
  'page10',
  'page12',
] as const

export function stepIndex(page: string): number {
  page = normalizeWizardPage(page)
  const idx = WICKET_PROGRESS_STEP_ORDER.indexOf(page as (typeof WICKET_PROGRESS_STEP_ORDER)[number])
  return idx === -1 ? -1 : idx
}

/** Возвращает более «далёкий» шаг по порядку мастера. */
export function laterWizardStep(a: string, b: string): string {
  a = normalizeWizardPage(a)
  b = normalizeWizardPage(b)
  const ia = stepIndex(a)
  const ib = stepIndex(b)
  if (ia < 0) return b
  if (ib < 0) return a
  return ia >= ib ? a : b
}

export function mergeVisitedPages(apiVisited: string[], extraVisited: string[]): string[] {
  const merged = new Set([...apiVisited, ...extraVisited].map(normalizeWizardPage))
  const ordered: string[] = []
  for (const page of WICKET_PROGRESS_STEP_ORDER) {
    if (merged.has(page)) ordered.push(page)
  }
  for (const page of merged) {
    if (!ordered.includes(page)) ordered.push(page)
  }
  return ordered
}

export function normalizeWizardPage(page: string): string {
  return page === 'page1' ? 'page7' : page
}

/** Все основные шаги от page7 до active включительно + произвольные подшаги из API. */
export function visitedPagesUpTo(active: string, apiVisited: string[]): string[] {
  active = normalizeWizardPage(active)
  const set = new Set(apiVisited.map(normalizeWizardPage))
  for (const page of WICKET_PROGRESS_STEP_ORDER) {
    set.add(page)
    if (page === active) break
  }
  return mergeVisitedPages([...set], apiVisited)
}

export function isPaintingComplete(state: {
  performerCode: string
  paintId: number | null
  paintColorId: number | null
  selection: { isFixedColor: boolean; requiresColorNote: boolean; isPaintAvailable: boolean } | null
  note: string
  unavailable: boolean
  savedPaintId: number | null
  savedPaintColorId: number | null
}): boolean {
  if (state.performerCode === 'customer') return true
  if (state.paintId == null) return false
  if (!state.selection?.isPaintAvailable) return false
  if (state.unavailable) return state.paintId === state.savedPaintId && state.paintColorId === state.savedPaintColorId
  return state.selection != null && (!state.selection.isFixedColor || state.paintColorId != null)
    && (!state.selection.requiresColorNote || !!state.note.trim())
}
