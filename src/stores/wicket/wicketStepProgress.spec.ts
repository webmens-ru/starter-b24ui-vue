import { describe, it, expect } from 'vitest'
import { laterWizardStep, mergeVisitedPages, visitedPagesUpTo } from './wicketStepProgress'

describe('wicketStepProgress', () => {
  it('laterWizardStep выбирает более поздний шаг', () => {
    expect(laterWizardStep('page11', 'page12')).toBe('page12')
    expect(laterWizardStep('page12', 'page11')).toBe('page12')
  })

  it('mergeVisitedPages сохраняет порядок основных шагов', () => {
    expect(mergeVisitedPages(['page1', 'page11'], ['page1', 'page12'])).toEqual([
      'page1',
      'page11',
      'page12',
    ])
  })

  it('visitedPagesUpTo не открывает шаги дальше active', () => {
    expect(visitedPagesUpTo('page2', ['page1'])).toEqual(['page1', 'page2'])
    expect(visitedPagesUpTo('page12', ['page1', 'page11'])).toContain('page12')
    expect(visitedPagesUpTo('page2', ['page1'])).not.toContain('page5')
  })
})
