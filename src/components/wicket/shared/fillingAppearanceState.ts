import type { useCalculation } from '../../../composables/useCalculation'

export type FillingSide = 'facade' | 'yard'

export interface FillingAppearanceSnapshot {
  manufacturerId: string | number | null
  manufacturer: string
  colorId: string | number | null
  color: string
  colorHex: string
  colorImage: string
}

type Calculation = ReturnType<typeof useCalculation>

export function captureFillingAppearance(
  calc: Calculation,
  side: FillingSide,
): FillingAppearanceSnapshot {
  return side === 'facade'
    ? {
        manufacturerId: calc.manufacturerFacadeId.value,
        manufacturer: calc.materialSupplierFacade.value,
        colorId: calc.colorFacadeId.value,
        color: calc.colorFacade.value,
        colorHex: calc.colorFacadeHex.value,
        colorImage: calc.colorFacadeImage.value,
      }
    : {
        manufacturerId: calc.manufacturerYardId.value,
        manufacturer: calc.materialSupplierYard.value,
        colorId: calc.colorYardId.value,
        color: calc.colorYard.value,
        colorHex: calc.colorYardHex.value,
        colorImage: calc.colorYardImage.value,
      }
}

export function restoreFillingAppearance(
  calc: Calculation,
  side: FillingSide,
  snapshot: FillingAppearanceSnapshot,
): void {
  if (side === 'facade') {
    calc.manufacturerFacadeId.value = snapshot.manufacturerId
    calc.materialSupplierFacade.value = snapshot.manufacturer
    calc.colorFacadeId.value = snapshot.colorId
    calc.colorFacade.value = snapshot.color
    calc.colorFacadeHex.value = snapshot.colorHex
    calc.colorFacadeImage.value = snapshot.colorImage
    return
  }

  calc.manufacturerYardId.value = snapshot.manufacturerId
  calc.materialSupplierYard.value = snapshot.manufacturer
  calc.colorYardId.value = snapshot.colorId
  calc.colorYard.value = snapshot.color
  calc.colorYardHex.value = snapshot.colorHex
  calc.colorYardImage.value = snapshot.colorImage
}
