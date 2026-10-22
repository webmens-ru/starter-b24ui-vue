import { describe, it, expect } from 'vitest'
import { laterWizardStep, mergeVisitedPages, visitedPagesUpTo } from './wicketStepProgress'

describe('wicketStepProgress', () => {
  it('maps legacy manufacturing progress to opening without unlocking subsequent steps', () => {
    expect(visitedPagesUpTo('page1', ['page1'])).toEqual(['page7'])
    expect(laterWizardStep('page1', 'page7')).toBe('page7')
    expect(mergeVisitedPages(['page1', 'page7'], [])).toEqual(['page7'])
  })
  it('laterWizardStep выбирает более поздний шаг', () => {
    expect(laterWizardStep('page10', 'page12')).toBe('page12')
    expect(laterWizardStep('page12', 'page10')).toBe('page12')
  })

  it('mergeVisitedPages сохраняет порядок основных шагов', () => {
    expect(mergeVisitedPages(['page1', 'page10'], ['page1', 'page12'])).toEqual([
      'page7',
      'page10',
      'page12',
    ])
  })

  it('visitedPagesUpTo не открывает шаги дальше active', () => {
    expect(visitedPagesUpTo('page2', ['page1'])).toEqual(['page7', 'page2'])
    const calculatedPages = visitedPagesUpTo('page12', ['page1', 'page10'])
    expect(calculatedPages).toContain('page12')
    expect(calculatedPages).not.toContain('page11')
    expect(visitedPagesUpTo('page2', ['page1'])).not.toContain('page5')
  })

  it('располагает проём перед заполнением', () => {
    expect(mergeVisitedPages(['page2'], ['page7'])).toEqual(['page7', 'page2'])
  })
})
