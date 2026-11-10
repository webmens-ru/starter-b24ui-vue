import type { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions } from '../../../app/api/wicket'

type Calculation = ReturnType<typeof useCalculation>
export interface FenceYardSnapshot {
  layingYardCode: 'butt' | 'gap'
  gapYardMm: number
  numberOfSticksYard: number
}

/** Freeze the old shared physical gap before facade changes; never invent a new yard layout. */
export async function legacyYardSnapshot(calc: Calculation): Promise<FenceYardSnapshot | undefined> {
  if (!calc.idYard.value || calc.layingYardCode.value !== null || calc.gapName.value === null) return undefined
  const owner = calc.getCurrentProductRowContext()
  const savedGap = calc.gapName.value
  const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side: 'yard', includeButt: true,
    widthFenceFacade: calc.thicknessFacade.value, widthFenceYard: calc.thicknessYard.value })
  if (calc.orderId.value !== owner.orderId || calc.productRowId.value !== owner.productRowId || String(calc.modelId.value) !== String(owner.modelId)) throw new Error('Расчёт изменился')
  const selected = options.find(option => option.gapMm === savedGap)
  if (!selected) throw new Error('Не удалось восстановить сохранённый зазор двора')
  return { layingYardCode: selected.gapMm === 0 ? 'butt' : 'gap', gapYardMm: selected.gapMm, numberOfSticksYard: selected.quantity }
}
export function applyYardSnapshot(calc: Calculation, snapshot: FenceYardSnapshot | undefined): void {
  if (!snapshot) return
  calc.layingYardCode.value = snapshot.layingYardCode
  calc.gapYardMm.value = snapshot.gapYardMm
  calc.numberOfSticksYard.value = snapshot.numberOfSticksYard
}

export async function reconcileFenceLaying(calc: Calculation, side: 'facade' | 'yard', width: string | number): Promise<void> {
  const yard = side === 'yard'
  const savedWidth = yard ? calc.thicknessYard.value : calc.thicknessFacade.value
  const gap = yard ? calc.gapYardMm.value : calc.gapName.value
  if (gap === null || Number(savedWidth) === Number(width)) return
  const owner = calc.getCurrentProductRowContext()
  const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side, includeButt: true,
    widthFenceFacade: yard ? calc.thicknessFacade.value : width,
    widthFenceYard: yard ? width : calc.thicknessYard.value })
  if (calc.orderId.value !== owner.orderId || calc.productRowId.value !== owner.productRowId || String(calc.modelId.value) !== String(owner.modelId)) throw new Error('Расчёт изменился')
  const selected = options.find(option => option.gapMm === gap)
  if (yard) {
    calc.gapYardMm.value = selected?.gapMm ?? null
    calc.numberOfSticksYard.value = selected?.quantity ?? null
  } else {
    calc.gapId.value = selected?.gapMm === 0 ? null : selected?.id ?? null
    calc.gapName.value = selected?.gapMm ?? null
    calc.numberOfSticks.value = selected?.quantity ?? null
  }
}
