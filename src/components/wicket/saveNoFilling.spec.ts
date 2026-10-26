import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import { recalculate } from '../../app/api/wicket'
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
