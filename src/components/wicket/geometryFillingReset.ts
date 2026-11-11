import type { useCalculation } from '../../composables/useCalculation'

export const clearedGeometryLaying = {
  gapId: null, gapName: null, gapYardMm: null, numberOfSticks: null, numberOfSticksYard: null,
  layingFacadeCode: null, layingYardCode: null, facadeButtTrimCode: null, facadeButtTrimSide: null,
  yardButtTrimCode: null, yardButtTrimSide: null, yardTrimCode: null,
}

export function acknowledgeGeometryLayingReset(calc: ReturnType<typeof useCalculation>): void {
  for (const key of Object.keys(clearedGeometryLaying) as Array<keyof typeof clearedGeometryLaying>) calc[key].value = null
  calc.facadeButtTrim.value = null
  calc.yardButtTrim.value = null
  calc.data.value = calc.data.value.filter(block => !['fenceLayingFacade', 'fenceLayingYard', 'yardFenceTrim'].includes(block.blockCode ?? ''))
}

export function canonicalGeometryNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
