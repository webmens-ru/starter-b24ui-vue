import { describe, expect, it } from 'vitest'
import form from './ProfnastilFacade.vue?raw'

describe('ProfnastilFacade color contract', () => {
  it('uses the shared required filling color rule', () => {
    expect(form).toContain("import { hasRequiredFillingColor } from '../shared/fillingColorValidation'")
    expect(form).toContain('hasRequiredFillingColor(selectedColorId.value, calc.colorFacade.value)')
    expect(form).not.toContain('colors.value.length > 0 && selectedColorId.value === null')
  })

  it('blocks every navigation path while color saving is pending or failed', () => {
    expect(form).toContain("createFillingAppearanceSaveCoordinator(calc, 'facade')")
    expect(form).toContain('appearanceSaving.value || appearanceSaveFailed.value')
    expect(form).toContain('defineExpose({ validateBeforeLeave })')
    expect(form).toContain('data-testid="appearance-save-retry"')
  })
})
