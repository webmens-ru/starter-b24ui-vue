<script setup lang="ts">
import { type Component } from 'vue'
import WicketWizardPage from './WicketWizardPage.vue'
import ManufacturingOption from '../../components/wicket/ManufacturingOption.vue'
/** Шаги page2–page2_yard: только сценарий типа 1 (не общие для всех калиток). */
import FillSide from '../../components/wicket/type1/FillSide.vue'
import SidingFacade from '../../components/wicket/type1/SidingFacade.vue'
import SidingYard from '../../components/wicket/type1/SidingYard.vue'
import ProfnastilFacade from '../../components/wicket/type1/ProfnastilFacade.vue'
import ProfnastilYard from '../../components/wicket/type1/ProfnastilYard.vue'
import StolbVariantOtkritiya from '../../components/wicket/StolbVariantOtkritiya.vue'
import ShieldType from '../../components/wicket/ShieldType.vue'
import RaspolozheniyePolotna from '../../components/wicket/RaspolozheniyePolotna.vue'
import RazmeryProyema from '../../components/wicket/RazmeryProyema.vue'
import IsTherelock from '../../components/wicket/IsTherelock.vue'
import LockType from '../../components/wicket/LockType.vue'
import Pen from '../../components/wicket/Pen.vue'
import Client from '../../components/wicket/Client.vue'
import End from '../../components/wicket/End.vue'
import DoorCloserStep from '../../components/wicket/steps/DoorCloserStep.vue'
import BumperStep from '../../components/wicket/steps/BumperStep.vue'
import SkudStep from '../../components/wicket/steps/SkudStep.vue'
import { getNextPage, getPrevPage } from './type1Navigation'

const stepComponents: Record<string, Component> = {
  page1: ManufacturingOption,
  page2: FillSide,
  page2_facade_siding: SidingFacade,
  page2_facade_profnastil: ProfnastilFacade,
  page2_yard_siding: SidingYard,
  page2_yard_profnastil: ProfnastilYard,
  page5: StolbVariantOtkritiya,
  page3: ShieldType,
  page6: RaspolozheniyePolotna,
  page7: RazmeryProyema,
  page9: IsTherelock,
  page_lock_type: LockType,
  page10: Pen,
  page_door_closer: DoorCloserStep,
  page_bumper: BumperStep,
  page_skud: SkudStep,
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
