<script setup lang="ts">
import { shallowRef, ref, type Component } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import WicketMenu from '../../components/WicketMenu.vue'
import CalculateTable from '../../components/CalculateTable.vue'
import ManufacturingOption from '../../components/wicket/ManufacturingOption.vue'
import FillSide from '../../components/wicket/FillSide.vue'
import SidingFacade from '../../components/wicket/SidingFacade.vue'
import StolbVariantOtkritiya from '../../components/wicket/StolbVariantOtkritiya.vue'
import ShieldType from '../../components/wicket/ShieldType.vue'
import RaspolozheniyePolotna from '../../components/wicket/RaspolozheniyePolotna.vue'
import RazmeryProyema from '../../components/wicket/RazmeryProyema.vue'
import IsTherelock from '../../components/wicket/IsTherelock.vue'
import LockType from '../../components/wicket/LockType.vue'
import Pen from '../../components/wicket/Pen.vue'
import Client from '../../components/wicket/Client.vue'
import End from '../../components/wicket/End.vue'

const calc = useCalculation()
const { activePage, visitedPages, isPageAccessible, setActivePage } = calc

const showWarningModal = ref(false)
const showCalcSlider   = ref(false)

const menuItems = [
  { url: 'manufacturing-option',                  page: 'page1',  label: 'Вариант изготовления' },
  { url: 'fill-side',                             page: 'page2',  label: 'Заполнение' },
  { url: 'stolb-variant-otkritiya-peremichka-2',  page: 'page5',  label: 'Столбы / Вариант открытия / Перемычка' },
  { url: 'shield-type',                           page: 'page3',  label: 'Тип щита' },
  { url: 'raspolozheniye-polotna',                page: 'page6',  label: 'Расположение полотна' },
  { url: 'razmery-proyema',                       page: 'page7',  label: 'Проем' },
  { url: 'is-there-lock',                         page: 'page9',  label: 'Комплект замка' },
  { url: 'pen',                                   page: 'page10', label: 'Ручка' },
  { url: 'client',                                page: 'page11', label: 'Клиент' },
  { url: 'end',                                   page: 'page12', label: 'Рассчитать' },
]

const stepComponents: Record<string, Component> = {
  page1:        ManufacturingOption,
  page2:        FillSide,
  page2_facade: SidingFacade,
  page5:        StolbVariantOtkritiya,
  page3:        ShieldType,
  page6:        RaspolozheniyePolotna,
  page7:        RazmeryProyema,
  page9:           IsTherelock,
  page_lock_type:  LockType,
  page10:  Pen,
  page11:  Client,
  page12:  End,
  // page2_yard_siding:    SidingYard,
  // page2_yard_profnastil: ProfnastilYard,
}

const currentComponent = shallowRef<Component>(ManufacturingOption)

function getNextPage(from: string): string | null {
  switch (from) {
    case 'page2':
      return 'page2_facade'
    case 'page2_facade':
      if (calc.fill_side.value === 'Одна сторона') return 'page5'
      return calc.material_yard_glob.value === 'Профлист'
        ? 'page2_yard_profnastil'
        : 'page2_yard_siding'
    case 'page9':
      return calc.is_there_lock_id.value === 1 ? 'page_lock_type' : 'page10'
    case 'page_lock_type':
      return 'page10'
    default: {
      const idx = menuItems.findIndex(m => m.page === from)
      return idx !== -1 && idx < menuItems.length - 1 ? menuItems[idx + 1].page : null
    }
  }
}

function getPrevPage(from: string): string | null {
  switch (from) {
    case 'page2_facade':    return 'page2'
    case 'page5':           return 'page2_facade'
    case 'page_lock_type':  return 'page9'
    case 'page10':          return calc.is_there_lock_id.value === 1 ? 'page_lock_type' : 'page9'
    default: {
      const idx = menuItems.findIndex(m => m.page === from)
      return idx > 0 ? menuItems[idx - 1].page : null
    }
  }
}

function switchTo(page: string) {
  const component = stepComponents[page]
  if (component) {
    currentComponent.value = component
    setActivePage(page)
  }
}

function navigateTo(page: string) {
  if (!isPageAccessible(page)) {
    showWarningModal.value = true
    return
  }
  switchTo(page)
}

function onMenuSelect(item: typeof menuItems[0]) {
  navigateTo(item.page)
}

function goNext() {
  const next = getNextPage(activePage.value)
  if (next) switchTo(next)
}

function goBack() {
  const prev = getPrevPage(activePage.value)
  if (prev) switchTo(prev)
}
</script>

<template>
  <B24App>
    <B24Modal
      v-model:open="showWarningModal"
      title="Внимание"
      description="Сначала необходимо заполнить предыдущие шаги."
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <B24Slideover
      v-model:open="showCalcSlider"
      title="Сводка расчёта"
      side="right"
      :b24ui="{ content: 'max-w-[600px] w-[600px]' }"
    >
      <template #body>
        <CalculateTable />
      </template>
    </B24Slideover>

    <B24SidebarLayout
      :use-light-content="false"
      :b24ui="{ container: 'mt-0' }"
    >
      <template #navbar>
        <B24NavbarSpacer />
        <B24NavbarSection>
          <B24Button
            label="Сводка"
            color="air-secondary"
            size="sm"
            @click="showCalcSlider = true"
          />
        </B24NavbarSection>
      </template>

      <template #sidebar>
        <B24SidebarBody>
          <B24SidebarSection>
            <WicketMenu
              :menu-items="menuItems"
              :active-page="activePage"
              :visited-pages="visitedPages"
              :is-page-accessible="isPageAccessible"
              @select="onMenuSelect"
            />
          </B24SidebarSection>
        </B24SidebarBody>
      </template>

      <component
        :is="currentComponent"
        @next="goNext"
        @back="goBack"
      />
    </B24SidebarLayout>
  </B24App>
</template>
