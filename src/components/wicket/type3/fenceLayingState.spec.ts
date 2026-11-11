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
  vi.mocked(getFenceGapOptions).mockReset().mockResolvedValue([{ id: 1, gapMm: 0, label: 'Переименовано', quantity: 6 }, { id: 2, gapMm: 28, label: 'Другая подпись', quantity: 7 }])
})
it('inherits butt while retaining a yard material of different width', async () => {
  expect(await inheritedYardLaying(useCalculation(), 'butt', 0)).toEqual({ yardButtTrimCode: null, yardButtTrimSide: null, yardTrimCode: null, layingYardCode: 'butt', gapYardMm: 0, numberOfSticksYard: 6 })
})
it('clears an incompatible yard material when facade uses a positive gap', async () => {
  expect(await inheritedYardLaying(useCalculation(), 'gap', 28)).toMatchObject({ idYard: null, widthFenceYard: null, layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: null })
  expect(getFenceGapOptions).not.toHaveBeenCalled()
})
it('uses the server shifted yard count while retaining the exact facade gap', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100.0'
  expect(await inheritedYardLaying(calc, 'gap', 28)).toEqual({ yardButtTrimCode: null, yardButtTrimSide: null, yardTrimCode: null, layingYardCode: 'gap', gapYardMm: 28, numberOfSticksYard: 7 })
})
it('does not silently substitute a different yard gap', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100'
  await expect(inheritedYardLaying(calc, 'gap', 17)).rejects.toThrow()
})
it('clears trim in the server preview when facade geometry changes and retains it for equal dimensions', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100'; calc.gapName.value = 28; calc.yardTrimCode.value = 'edge'
  expect(await inheritedYardLaying(calc, 'gap', 28)).toMatchObject({ yardTrimCode: 'edge' })
  await inheritedYardLaying(calc, 'gap', 17).catch(() => {})
  expect(getFenceGapOptions).toHaveBeenLastCalledWith(expect.objectContaining({ yardTrimCode: null }))
})
it('preserves explicit yard butt trim through unchanged laying snapshots', async () => {
  const calc = useCalculation(); calc.layingFacadeCode.value = calc.layingYardCode.value = 'butt'; calc.gapName.value = calc.gapYardMm.value = 0; calc.yardButtTrimCode.value = 'single'; calc.yardButtTrimSide.value = 'lock'
  expect(await inheritedYardLaying(calc, 'butt', 0)).toMatchObject({ yardButtTrimCode: 'single', yardButtTrimSide: 'lock' })
})
it('defaults an unchosen gapped yard to edge trimming and uses its normalized count', async () => {
  const calc = useCalculation(); calc.thicknessYard.value = '100'
  vi.mocked(getFenceGapOptions).mockImplementation(async payload => [{ id: 2, gapMm: 28, label: '', quantity: payload.yardTrimCode === 'edge' ? 9 : 7, yardEdgeTrimAvailable: true }])
  expect(await inheritedYardLaying(calc, 'gap', 28)).toMatchObject({ yardTrimCode: 'edge', numberOfSticksYard: 9 })
  calc.gapName.value = 28; calc.yardTrimCode.value = 'none'
  expect(await inheritedYardLaying(calc, 'gap', 28)).toMatchObject({ yardTrimCode: 'none', numberOfSticksYard: 7 })
})
