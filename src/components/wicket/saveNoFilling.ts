import { recalculate, saveWicketData } from '../../app/api/wicket'
import { withoutSummaryBlock } from '../../app/summaryCodes'
import { fillingSideCountLabel } from '../../app/fillingSideCounts'
import type { useCalculation } from '../../composables/useCalculation'

/** The server clears model-specific selections atomically when receiving explicit zero. */
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
    } catch (error) {
      calc.priceRetail.value = ''
      calc.priceDealer.value = ''
      calc.data.value = withoutSummaryBlock(calc.data.value, 'price')
      console.error('Ошибка пересчёта цены:', error)
    }
  }
  return true
}
