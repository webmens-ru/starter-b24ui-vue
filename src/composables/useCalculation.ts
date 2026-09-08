import { storeToRefs } from 'pinia'
import { useWicketWizardStore } from '../stores/wicket/wicketWizardStore'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import type { ProductRowContext, WicketSavePayload } from '../app/api/wicket.types'
import type { WicketAccessoryCompositionPayload } from '../app/api/wicket.types'
import { saveWicketAccessoryComposition as persistWicketAccessoryComposition } from '../app/api/wicket'

export type { CalcBlock } from '../stores/wicket/types'

/**
 * Фасад для экранов калитки: сессия мастера (`wicket-wizard`) + поля формы (`wicket-form`).
 * Сохраняет прежний API `useCalculation()` для компонентов.
 */
export function useCalculation() {
  const wizard = useWicketWizardStore()
  const form = useWicketFormStore()

  function isPositiveInteger(value: number | null): value is number {
    return value !== null && Number.isInteger(value) && value > 0
  }

  function getBaseSavePayload(): {
    orderId: number
    productRowId: number
    /** API Yii ожидает строку (см. BaseModelController::validateBasePayload). */
    modelId: string
    reachedStep: string
    visitedPages: string
  } {
    const orderId = wizard.orderId
    const productRowId = wizard.productRowId
    const modelId = String(wizard.modelId ?? '').trim()
    if (!isPositiveInteger(orderId)) {
      throw new Error('Не указан корректный orderId текущей позиции.')
    }
    if (!isPositiveInteger(productRowId)) {
      throw new Error('Не указан корректный productRowId текущей позиции.')
    }
    if (modelId === '') {
      throw new Error('Не указан modelId текущей позиции.')
    }

    return {
      orderId,
      productRowId,
      modelId,
      reachedStep: wizard.activePage,
      visitedPages: JSON.stringify(wizard.visitedPages),
    }
  }

  function getCurrentProductRowContext(): ProductRowContext {
    const { orderId, productRowId, modelId } = getBaseSavePayload()
    return { orderId, productRowId, modelId }
  }

  function getFullSavePayload(): WicketSavePayload {
    const supplierPayload = String(wizard.modelId) === '2'
      ? {}
      : {
          materialSupplierFacade: form.materialSupplierFacade,
          materialSupplierYard: form.materialSupplierYard,
        }

    return {
      ...getBaseSavePayload(),
      ...supplierPayload,
      providesMaterial: form.providesMaterial,
      providesPaint: form.providesPaint,
      doesPaintingFrame: form.doesPaintingFrame,
      doesAssembly: form.doesAssembly,
      fillSide: form.fillSide,
      materialFacadeGlob: form.materialFacadeGlob,
      materialYardGlob: form.materialYardGlob,
      hasStolby: form.hasStolby,
      stolbId: form.stolbId || null,
      openingOptionId: form.openingOptionId,
      peremichkaPolozheniyeId: form.peremichkaPolozheniyeId || null,
      assortmentJumperId: form.assortmentJumperId || null,
      shieldType: form.shieldType,
      colorShieldId: form.colorShieldId || null,
      heightTopPart: form.heightTopPart,
      heightLowerPart: form.heightLowerPart,
      widthSidePart: form.widthSidePart,
      grilleLocation: form.grilleLocation,
      assortmentSideGrilleNetId: form.assortmentSideGrilleNetId || null,
      assortmentHeightUpperNetId: form.assortmentHeightUpperNetId || null,
      assortmentHeightLowerNetId: form.assortmentHeightLowerNetId || null,
      netWidthProviderTop: form.netWidthProviderTop,
      netWidthProviderLower: form.netWidthProviderLower,
      netWidthProviderSide: form.netWidthProviderSide,
      raspolozheniyePolotna: form.raspolozheniyePolotna,
      widthProyema: form.widthProyema,
      heightProyema: form.heightProyema,
      clearanceProyema: form.clearanceProyema,
      sostoyaniyeProyema: form.sostoyaniyeProyema,
      isThereCable: form.isThereCable,
      lockPenId: form.lockPenId,
      lockPenColorId: form.lockPenColorId,
      isTherePen: form.isTherePen,
      isTherePenName: form.isTherePenName,
      penProvided: form.penProvided,
      penInstalled: form.penInstalled,
      penColorId: form.penColorId,
      additionalPenId: form.additionalPenId,
      idFacade: form.idFacade || null,
      manufacturerFacadeId: form.manufacturerFacadeId,
      colorFacadeId: form.colorFacadeId,
      materialFacade: form.materialFacade,
      formFacade: form.formFacade,
      thicknessFacade: form.thicknessFacade,
      typeOfCoatingFacade: form.typeOfCoatingFacade,
      colorFacade: form.colorFacade,
      gapId: form.gapId,
      gapName: form.gapName,
      numberOfSticks: form.numberOfSticks,
      idYard: form.idYard || null,
      manufacturerYardId: form.manufacturerYardId,
      colorYardId: form.colorYardId,
      materialYard: form.materialYard,
      formYard: form.formYard,
      thicknessYard: form.thicknessYard,
      typeOfCoatingYard: form.typeOfCoatingYard,
      colorYard: form.colorYard,
      calculationName: form.calculationName,
      clientName: form.clientName,
      clientLastName: form.clientLastName,
      clientSurname: form.clientSurname,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      clientAddress: form.clientAddress,
      clientComment: form.clientComment,
      countryCode: form.countryCode,
    }
  }

  function getAccessoryCompositionPayload(): WicketAccessoryCompositionPayload {
    const { orderId, productRowId } = getCurrentProductRowContext()
    const lockVersion = form.accessoryCompositionLockVersion
    if (!isPositiveInteger(lockVersion)) {
      throw new Error('Версия состава комплектующих не загружена.')
    }
    return { orderId, productRowId, lockVersion, ...form.getAccessorySelections() }
  }

  async function saveAccessoryComposition(): Promise<void> {
    const payload = getAccessoryCompositionPayload()
    const generation = form.beginAccessorySave()
    const response = await persistWicketAccessoryComposition(payload)
    if (
      form.isCurrentAccessorySave(generation)
      && wizard.orderId === payload.orderId
      && wizard.productRowId === payload.productRowId
    ) {
      form.applyAccessoryComposition(response)
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
    getCurrentProductRowContext,
    getFullSavePayload,
    getAccessoryCompositionPayload,
    getAccessorySelections: form.getAccessorySelections,
    saveAccessoryComposition,
    applyAccessoryComposition: form.applyAccessoryComposition,
    replaceAccessorySelectionIds: form.replaceAccessorySelectionIds,
    setAccessorySelections: form.setAccessorySelections,
    setAccessoryGroupProvided: form.setAccessoryGroupProvided,
    setAccessoryGroupInstalled: form.setAccessoryGroupInstalled,
    clearAccessorySelections: form.clearAccessorySelections,
    loadFromApi: form.loadFromApi,
    reset,
    updateOrCreateBlock: form.updateOrCreateBlock,
    removeAllBlocksExcept: form.removeAllBlocksExcept,
    updatePriceBlock: form.updatePriceBlock,
  }
}
