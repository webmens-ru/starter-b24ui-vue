import { storeToRefs } from 'pinia'
import { useWicketWizardStore } from '../stores/wicket/wicketWizardStore'
import { useWicketFormStore } from '../stores/wicket/wicketFormStore'
import type { ProductRowContext, WicketSavePayload } from '../app/api/wicket.types'

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
    const addons = form.addons
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
      isThereLock: form.isThereLock,
      isThereLockName: form.isThereLockName,
      providesLock: form.providesLock,
      lockInstaller: form.lockInstaller,
      isThereCable: form.isThereCable,
      lockSetId: form.lockSetId,
      lockPenId: form.lockPenId,
      lockPenColorId: form.lockPenColorId,
      lockComponentIds: JSON.stringify(form.lockComponentIds),
      lockComponentsInstalled: form.lockComponentsInstalled,
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
      isThereDoorCloser: addons.doorCloser.isThere,
      doorCloserId: addons.doorCloser.itemId,
      doorCloserProvided: addons.doorCloser.provided,
      doorCloserInstalled: addons.doorCloser.installed,
      isThereBumper: addons.bumper.isThere,
      bumperId: addons.bumper.itemId,
      bumperProvided: addons.bumper.provided,
      bumperInstalled: addons.bumper.installed,
      isThereSkud: addons.skud.isThere,
      skudId: addons.skud.itemId,
      skudIds: JSON.stringify(addons.skud.itemIds),
      skudProvided: addons.skud.provided,
      skudInstalled: addons.skud.installed,
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
    loadFromApi: form.loadFromApi,
    reset,
    updateOrCreateBlock: form.updateOrCreateBlock,
    removeAllBlocksExcept: form.removeAllBlocksExcept,
    updatePriceBlock: form.updatePriceBlock,
  }
}
