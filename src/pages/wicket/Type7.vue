<script setup lang="ts">
import { type Component } from 'vue'
import WicketWizardPage from './WicketWizardPage.vue'
import ManufacturingOption from '../../components/wicket/ManufacturingOption.vue'
/** Шаги page2–page2_facade_sp: только калитка типа 7 (`components/wicket/type7/`). */
import FillSide from '../../components/wicket/type7/T7FillSide.vue'
import SpFacade from '../../components/wicket/type7/T7SpFacade.vue'
import StolbVariantOtkritiya from '../../components/wicket/StolbVariantOtkritiya.vue'
import ShieldType from '../../components/wicket/ShieldType.vue'
import RaspolozheniyePolotna from '../../components/wicket/RaspolozheniyePolotna.vue'
import RazmeryProyema from '../../components/wicket/RazmeryProyema.vue'
import IsTherelock from '../../components/wicket/IsTherelock.vue'
import LockType from '../../components/wicket/LockType.vue'
import Pen from '../../components/wicket/Pen.vue'
import Client from '../../components/wicket/Client.vue'
import End from '../../components/wicket/End.vue'
import { getNextPage, getPrevPage } from './type7Navigation'

const stepComponents: Record<string, Component> = {
  page1: ManufacturingOption,
  page2: FillSide,
  page2_facade_sp: SpFacade,
  page5: StolbVariantOtkritiya,
  page3: ShieldType,
  page6: RaspolozheniyePolotna,
  page7: RazmeryProyema,
  page9: IsTherelock,
  page_lock_type: LockType,
  page10: Pen,
  page11: Client,
  page12: End,
}
</script>

<template>
  <WicketWizardPage
    :step-components="stepComponents"
    :get-next-page="getNextPage"
    :get-prev-page="getPrevPage"
  />
</template>
