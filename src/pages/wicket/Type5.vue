<script setup lang="ts">
import { type Component } from 'vue'
import WicketWizardPage from './WicketWizardPage.vue'
/** Шаги page2–page2_yard: только калитка типа 5 (`components/wicket/type5/`, SP сайдинг 2-сторонний). */
import FillSide from '../../components/wicket/type5/T5FillSide.vue'
import SpFacade from '../../components/wicket/type5/T5SpFacade.vue'
import SpYard from '../../components/wicket/type5/T5SpYard.vue'
import StolbVariantOtkritiya from '../../components/wicket/StolbVariantOtkritiya.vue'
import ShieldType from '../../components/wicket/ShieldType.vue'
import Painting from '../../components/wicket/Painting.vue'
import RaspolozheniyePolotna from '../../components/wicket/RaspolozheniyePolotna.vue'
import RazmeryProyema from '../../components/wicket/RazmeryProyema.vue'
import IsTherelock from '../../components/wicket/IsTherelock.vue'
import LockType from '../../components/wicket/LockType.vue'
import Pen from '../../components/wicket/Pen.vue'
import End from '../../components/wicket/End.vue'
import { type5Route } from './type5Route'

const stepComponents: Record<string, Component> = {
  page2: FillSide,
  page2_facade_sp: SpFacade,
  page2_yard_sp: SpYard,
  page5: StolbVariantOtkritiya,
  page3: ShieldType,
  page_painting: Painting,
  page6: RaspolozheniyePolotna,
  page7: RazmeryProyema,
  page9: IsTherelock,
  page_lock_type: LockType,
  page10: Pen,
  page12: End,
}
</script>

<template>
  <WicketWizardPage
    :step-components="stepComponents"
    :route="type5Route"
  />
</template>
