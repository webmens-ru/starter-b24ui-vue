import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useCalculation } from '../composables/useCalculation'
import { canonicalizeWicketRootSavePayload } from './api/wicketRootSavePayload'

describe('wicket client fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not expose or persist wicket-owned client fields', () => {
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'

    const payload = calc.getFullSavePayload()

    for (const field of [
      'calculationName', 'clientName', 'clientLastName', 'clientSurname',
      'clientPhone', 'clientEmail', 'clientAddress', 'clientComment', 'countryCode',
    ]) {
      expect(field in calc).toBe(false)
      expect(field in payload).toBe(false)
    }
    expect(calc.data.value.some(block => block.blockName === 'Клиент')).toBe(false)
  })

  it('drops legacy client fields while canonicalizing a root payload', () => {
    const payload = canonicalizeWicketRootSavePayload({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      clientName: 'Legacy',
      calculationName: 'Legacy',
    } as never)

    expect(payload).not.toHaveProperty('clientName')
    expect(payload).not.toHaveProperty('calculationName')
  })
})
