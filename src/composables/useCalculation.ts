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
    orderId: number
    /** API Yii ожидает строку (см. BaseModelController::validateBasePayload). */
    modelId: string
    reachedStep: string
    visitedPages: string
  } {
    return {
      orderId: Number(wizard.number),
      modelId: String(wizard.modelId ?? ''),
      reachedStep: wizard.activePage,
      visitedPages: JSON.stringify(wizard.visitedPages),
    }
  }

  function getFullSavePayload(): Record<string, unknown> {
    const addons = form.addons
    return {
      ...getBaseSavePayload(),
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
      peremichkaSortamentId: form.peremichkaSortamentId || null,
      shieldType: form.shieldType,
      colorShieldId: form.colorShieldId || null,
      heightTopPart: form.heightTopPart,
      heightLowerPart: form.heightLowerPart,
      widthSidePart: form.widthSidePart,
      grilleLocation: form.grilleLocation,
      assortmentSideGrilleNetId: form.assortmentSideGrilleNetId || null,
      assortmentHeightUpperNetId: form.assortmentHeightUpperNetId || null,
      assortmentHeightLowerNetId: form.assortmentHeightLowerNetId || null,
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
      materialSupplierFacade: form.materialSupplierFacade,
      materialFacade: form.materialFacade,
      formFacade: form.formFacade,
      thicknessFacade: form.thicknessFacade,
      typeOfCoatingFacade: form.typeOfCoatingFacade,
      colorFacade: form.colorFacade,
      idYard: form.idYard || null,
      materialSupplierYard: form.materialSupplierYard,
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
    getFullSavePayload,
    loadFromApi: form.loadFromApi,
    reset,
    updateOrCreateBlock: form.updateOrCreateBlock,
    removeAllBlocksExcept: form.removeAllBlocksExcept,
    updatePriceBlock: form.updatePriceBlock,
  }
}
