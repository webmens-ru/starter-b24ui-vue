import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions } from '../../../app/api/wicket'
import { inheritedYardLaying } from './fenceLayingState'
vi.mock('../../../app/api/wicket', async original => ({ ...(await original<typeof import('../../../app/api/wicket')>()), getFenceGapOptions: vi.fn() }))
beforeEach(() => {
  setActivePinia(createPinia())
  const calc = useCalculation(); calc.reset()
  calc.orderId.value = calc.number.value = 42; calc.productRowId.value = 7; calc.modelId.value = '3'; calc.idYard.value = 2
  calc.thicknessFacade.value = '100'; calc.thicknessYard.value = '120'
  vi.mocked(getFenceGapOptions).mockReset().mockResolvedValue([{ id: 1, gapMm: 0, label: 'Переименовано', quantity: 6 }, { id: 2, gapMm: 28, label: 'Другая подпись', quantity: 8 }])
})
it('inherits butt while retaining a yard material of different width', async () => {
  expect(await inheritedYardLaying(useCalculation(), 'butt', 0)).toEqual({ layingYardCode: 'butt', gapYardMm: 0, numberOfSticksYard: 6 })
})
it('clears an incompatible yard material when facade uses a positive gap', async () => {
  expect(await inheritedYardLaying(useCalculation(), 'gap', 28)).toMatchObject({ idYard: null, widthFenceYard: null, layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: null })
  expect(getFenceGapOptions).not.toHaveBeenCalled()
})
it('inherits the exact facade gap for equal physical widths', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100.0'
  expect(await inheritedYardLaying(calc, 'gap', 28)).toEqual({ layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: 8 })
})
it('does not silently substitute a different yard gap', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100'
  await expect(inheritedYardLaying(calc, 'gap', 17)).rejects.toThrow()
})
