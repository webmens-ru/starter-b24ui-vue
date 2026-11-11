import type { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions } from '../../../app/api/wicket'

type Calculation = ReturnType<typeof useCalculation>
export interface FenceYardSnapshot {
  yardTrimCode?: 'none' | 'edge' | null
  layingYardCode: 'butt' | 'gap' | null
  gapYardMm: number | null
  numberOfSticksYard: number | null
  idYard?: null
  widthFenceYard?: null
  materialSupplierYard?: null
  materialYard?: null
  typeOfCoatingYard?: null
  colorYard?: null
}

/** Yard inherits facade geometry; changing material must never pick a different gap. */
export async function inheritedYardLaying(
  calc: Calculation, mode: 'butt' | 'gap' | null, gap: number | null,
  facadeWidth: string | number = calc.thicknessFacade.value,
  yardWidth: string | number = calc.thicknessYard.value,
): Promise<FenceYardSnapshot> {
  const yardTrimCode = mode === 'gap' && gap !== null && gap > 0 && gap === calc.gapName.value && Number(facadeWidth) === Number(calc.thicknessFacade.value) && Number(yardWidth) === Number(calc.thicknessYard.value) ? calc.yardTrimCode.value : null
  const result: FenceYardSnapshot = { yardTrimCode, layingYardCode: mode, gapYardMm: gap, numberOfSticksYard: null }
  if (!calc.idYard.value) return result
  if (mode === 'gap' && Number(facadeWidth) !== Number(yardWidth)) {
    return { ...result, yardTrimCode: null, idYard: null, widthFenceYard: null, materialSupplierYard: null,
      materialYard: null, typeOfCoatingYard: null, colorYard: null }
  }
  if (gap === null) return result
  const owner = calc.getCurrentProductRowContext()
  const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side: 'yard', includeButt: true,
    yardTrimCode, layingFacadeCode: mode, gapName: gap, layingYardCode: mode, gapYardMm: gap,
    widthFenceFacade: facadeWidth, widthFenceYard: yardWidth })
  if (calc.orderId.value !== owner.orderId || calc.productRowId.value !== owner.productRowId || String(calc.modelId.value) !== String(owner.modelId)) throw new Error('Расчёт изменился')
  const selected = options.find(option => option.gapMm === gap)
  if (!selected) throw new Error('Материал двора не соответствует укладке фасада')
  return { ...result, numberOfSticksYard: selected.quantity }
}

export function applyYardSnapshot(calc: Calculation, snapshot: FenceYardSnapshot): void {
  if (snapshot.yardTrimCode !== undefined) calc.yardTrimCode.value = snapshot.yardTrimCode
  if (snapshot.idYard === null || snapshot.gapYardMm === null || snapshot.gapYardMm === 0) calc.yardTrimCode.value = null
  calc.layingYardCode.value = snapshot.layingYardCode
  calc.gapYardMm.value = snapshot.gapYardMm
  calc.numberOfSticksYard.value = snapshot.numberOfSticksYard
  if (calc.yardTrimCode.value === null) calc.data.value = calc.data.value.filter(block => block.blockCode !== 'yardFenceTrim')
  if (snapshot.idYard === null) {
    calc.idYard.value = ''
    calc.thicknessYard.value = ''
    calc.materialSupplierYard.value = ''
    calc.materialYard.value = ''
    calc.typeOfCoatingYard.value = ''
    calc.colorYard.value = ''
    calc.data.value = calc.data.value.filter(block => block.blockCode !== 'fillingYard' && block.blockCode !== 'fenceLayingYard')
  } else if (snapshot.gapYardMm === null) {
    calc.data.value = calc.data.value.filter(block => block.blockCode !== 'fenceLayingYard')
  } else if (calc.idYard.value) {
    calc.updateOrCreateBlock('fenceLayingYard', [
      { paramCode: 'layingMode', name: 'Способ укладки', value: snapshot.layingYardCode === 'butt' ? 'Встык' : 'С зазором' },
      { paramCode: 'gapMm', name: 'Зазор, мм', value: String(snapshot.gapYardMm) },
      ...(snapshot.numberOfSticksYard === null ? [] : [{ paramCode: 'picketCount', name: 'Количество штакетин', value: String(snapshot.numberOfSticksYard) }]),
    ], 'Укладка (двор)')
  }
}

export async function reconcileFacadeLaying(calc: Calculation, width: string | number): Promise<void> {
  const gap = calc.gapName.value
  if (gap === null || Number(calc.thicknessFacade.value) === Number(width)) return
  calc.yardTrimCode.value = null
  const owner = calc.getCurrentProductRowContext()
  const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side: 'facade', includeButt: true,
    widthFenceFacade: width, widthFenceYard: calc.thicknessYard.value })
  if (calc.orderId.value !== owner.orderId || calc.productRowId.value !== owner.productRowId || String(calc.modelId.value) !== String(owner.modelId)) throw new Error('Расчёт изменился')
  const selected = options.find(option => option.gapMm === gap)
  calc.gapId.value = selected?.gapMm === 0 ? null : selected?.id ?? null
  calc.gapName.value = selected?.gapMm ?? null
  calc.numberOfSticks.value = selected?.quantity ?? null
}
