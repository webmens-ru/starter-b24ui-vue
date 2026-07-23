import { describe, expect, it } from 'vitest'
import page from './WicketWizardPage.vue?raw'

describe('WicketWizardPage mobile summary', () => {
  it('starts below the application header', () => {
    expect(page).toContain(
      "['fixed top-[50px] bottom-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200'",
    )
    expect(page).not.toContain(
      "['fixed inset-y-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200'",
    )
  })
})
