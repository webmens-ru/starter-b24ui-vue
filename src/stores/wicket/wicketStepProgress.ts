/** Порядок основных шагов мастера (для сравнения reachedStep / activePage). */
export const WICKET_PROGRESS_STEP_ORDER = [
  'page1',
  'page2',
  'page3',
  'page5',
  'page6',
  'page7',
  'page9',
  'page10',
  'page11',
  'page12',
] as const

export function stepIndex(page: string): number {
  const idx = WICKET_PROGRESS_STEP_ORDER.indexOf(page as (typeof WICKET_PROGRESS_STEP_ORDER)[number])
  return idx === -1 ? -1 : idx
}

/** Возвращает более «далёкий» шаг по порядку мастера. */
export function laterWizardStep(a: string, b: string): string {
  const ia = stepIndex(a)
  const ib = stepIndex(b)
  if (ia < 0) return b
  if (ib < 0) return a
  return ia >= ib ? a : b
}

export function mergeVisitedPages(apiVisited: string[], extraVisited: string[]): string[] {
  const merged = new Set([...apiVisited, ...extraVisited])
  const ordered: string[] = []
  for (const page of WICKET_PROGRESS_STEP_ORDER) {
    if (merged.has(page)) ordered.push(page)
  }
  for (const page of merged) {
    if (!ordered.includes(page)) ordered.push(page)
  }
  return ordered
}

/** Все основные шаги от page1 до active включительно + произвольные подшаги из API. */
export function visitedPagesUpTo(active: string, apiVisited: string[]): string[] {
  const set = new Set(apiVisited)
  for (const page of WICKET_PROGRESS_STEP_ORDER) {
    set.add(page)
    if (page === active) break
  }
  return mergeVisitedPages([...set], apiVisited)
}
