import { storeToRefs } from 'pinia'
import { useWicketWizardStore } from '../stores/wicket/wicketWizardStore'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'

export type { CalcBlock } from '../stores/wicket/types'

/**
 * Фасад для экранов калитки: сессия мастера (`wicket-wizard`) + поля формы (`wicket-form`).
 * Сохраняет прежний API `useCalculation()` для компонентов.
 */
export function useCalculation() {
  const wizard = useWicketWizardStore()
  const form = useWicketFormStore()

  function getBaseSavePayload(): {
    order_id: number
    /** API Yii ожидает строку (см. BaseModelController::validateBasePayload). */
    model_id: string
    reached_step: string
    visited_pages: string
  } {
    return {
      order_id: Number(wizard.number),
      model_id: String(wizard.modelId ?? ''),
      reached_step: wizard.activePage,
      visited_pages: JSON.stringify(wizard.visitedPages),
    }
  }

  function reset() {
    wizard.resetSession()
    form.resetFormFields()
  }

  return {
    ...storeToRefs(wizard),
    ...storeToRefs(form),
    setActivePage: wizard.setActivePage,
    isPageAccessible: wizard.isPageAccessible,
    getBaseSavePayload,
    loadFromApi: form.loadFromApi,
    reset,
    updateOrCreateBlock: form.updateOrCreateBlock,
    removeAllBlocksExcept: form.removeAllBlocksExcept,
    updatePriceBlock: form.updatePriceBlock,
  }
}
