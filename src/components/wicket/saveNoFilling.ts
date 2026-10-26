import { recalculate, saveWicketData } from '../../app/api/wicket'
import { fillingSideCountLabel } from '../../app/fillingSideCounts'
import type { useCalculation } from '../../composables/useCalculation'

/** Explicit zero clears current filling choices through the usual configuration mutation. */
export async function saveNoFilling(calc: ReturnType<typeof useCalculation>): Promise<boolean> {
  if (calc.fillSide.value !== 0) return false
  calc.clearFilling()
  calc.updateOrCreateBlock('filling', [
    { paramCode: 'sideCount', name: 'Сторона заполнения', value: fillingSideCountLabel(0) },
  ], 'Заполнение')
  await saveWicketData({
    ...calc.getBaseSavePayload(),
    fillingSideCount: 0,
    providesMaterial: calc.providesMaterial.value,
    materialFacadeGroupCode: null,
    materialYardGroupCode: null,
    fillingOrientationCode: null,
    idFacade: null, idYard: null,
    manufacturerFacadeId: null, manufacturerYardId: null,
    colorFacadeId: null, colorYardId: null,
    profileTypeFacadeId: null, profileTypeYardId: null,
    typeOfCoatingFacadeId: null, typeOfCoatingYardId: null,
    sidingFormFacadeId: null, sidingFormYardId: null,
    materialFacade: null, materialYard: null,
    formFacade: null, formYard: null,
    thicknessFacade: null, thicknessYard: null,
    typeOfCoatingFacade: null, typeOfCoatingYard: null,
    colorFacade: null, colorYard: null,
    gapId: null, gapName: null, numberOfSticks: null,
  })
  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
        productType: calc.productType.value,
        model: calc.model.value,
        modelId: calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (error) { console.error('Ошибка пересчёта цены:', error) }
  }
  return true
}
