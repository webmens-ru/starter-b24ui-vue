import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import { recalculate, saveWicketData } from '../../app/api/wicket'
import { saveNoFilling } from './saveNoFilling'

vi.mock('../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('saved no filling price invalidation', () => {
  it.each(Array.from({ length: 11 }, (_, index) => String(index + 1)))('sends a schema-independent no-filling mutation for model %s', async modelId => {
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = modelId
    calc.fillSide.value = 0
    calc.idFacade.value = 21
    calc.idYard.value = 39
    vi.mocked(saveWicketData).mockImplementationOnce(async payload => {
      if (Object.prototype.hasOwnProperty.call(payload, 'idYard')) throw new Error('Unknown property Type4::idYard')
      return { lockVersion: 2 }
    })
    await expect(saveNoFilling(calc)).resolves.toBe(true)
    const payload = vi.mocked(saveWicketData).mock.lastCall![0]
    expect(payload).toEqual({ ...calc.getBaseSavePayload(), fillingSideCount: 0, providesMaterial: calc.providesMaterial.value })
    expect(calc.idFacade.value).toBe('')
    expect(calc.idYard.value).toBe('')
    expect(calc.fillSide.value).toBe(0)
  })

  it.each(['Цена', 'Переименованная стоимость'])('clears stale prices by code after recalculation fails with caption %s', async caption => {
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '2'
    calc.fillSide.value = 0
    calc.priceRetail.value = 12000
    calc.priceDealer.value = 10000
    calc.data.value = [
      { blockCode: 'price', blockName: caption, params: [] },
      { blockCode: 'painting', blockName: 'Цена', params: [] },
    ]
    vi.mocked(recalculate).mockRejectedValueOnce(new Error('recalculation unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(saveNoFilling(calc)).resolves.toBe(true)
      expect(calc.fillSide.value).toBe(0)
      expect(calc.priceRetail.value).toBe('')
      expect(calc.priceDealer.value).toBe('')
      expect(calc.data.value.some(block => block.blockCode === 'price')).toBe(false)
      expect(calc.data.value.some(block => block.blockCode === 'painting')).toBe(true)
    } finally { log.mockRestore() }
  })
})
