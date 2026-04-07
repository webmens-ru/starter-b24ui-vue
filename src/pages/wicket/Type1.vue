<script setup lang="ts">
import { shallowRef, ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { useCalculation } from '../../composables/useCalculation'
import { loadWicketData, createOrder, createWicketMainMenu } from '../../app/api/wicket'
declare const window: Window & {
  _PARAMS_?: { placementOptions?: { id?: string | number; modelId?: string } }
}

import WicketMenu from '../../components/WicketMenu.vue'
import CalculateTable from '../../components/CalculateTable.vue'
import ManufacturingOption from '../../components/wicket/ManufacturingOption.vue'
import FillSide from '../../components/wicket/FillSide.vue'
import SidingFacade from '../../components/wicket/SidingFacade.vue'
import SidingYard from '../../components/wicket/SidingYard.vue'
import ProfnastilFacade from '../../components/wicket/ProfnastilFacade.vue'
import ProfnastilYard from '../../components/wicket/ProfnastilYard.vue'
import StolbVariantOtkritiya from '../../components/wicket/StolbVariantOtkritiya.vue'
import ShieldType from '../../components/wicket/ShieldType.vue'
import RaspolozheniyePolotna from '../../components/wicket/RaspolozheniyePolotna.vue'
import RazmeryProyema from '../../components/wicket/RazmeryProyema.vue'
import IsTherelock from '../../components/wicket/IsTherelock.vue'
import LockType from '../../components/wicket/LockType.vue'
import Pen from '../../components/wicket/Pen.vue'
import Client from '../../components/wicket/Client.vue'
import End from '../../components/wicket/End.vue'
import { getNextPage as getNextPageFn, getPrevPage as getPrevPageFn } from './type1Navigation'

const calc = useCalculation()
const { activePage, visitedPages, isPageAccessible, isFillSectionIncomplete, setActivePage, loadFromApi } = calc

const route = useRoute()
/** modelId из _PARAMS_, из пути /wicket/typeN или '1' по умолчанию */
const resolvedModelId = (): string => {
  const fromParams = window._PARAMS_?.placementOptions?.modelId
  if (fromParams) return String(fromParams)
  const m = route.path.match(/\/wicket\/type(\d+)$/)
  return m ? m[1] : '1'
}
calc.modelId.value = resolvedModelId()

const windowWidth = ref(window.innerWidth)
const loadError = ref<string | null>(null)
const showLoadErrorModal = ref(false)
const loadPending = ref(true)
const isMobile = computed(() => windowWidth.value < 1024)

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { windowWidth.value = window.innerWidth }, 100)
}
async function initCalculation() {
  const placementId = window._PARAMS_?.placementOptions?.id
  const existingOrderId = calc.number.value ? Number(calc.number.value) : null
  calc.modelId.value = resolvedModelId()
  try {
    if (placementId) {
      const orderId = Number(placementId)
      const apiData = await loadWicketData(calc.modelId.value, orderId)
      loadFromApi(apiData)
      calc.number.value = orderId
      switchTo(calc.activePage.value)
    } else if (existingOrderId) {
      const apiData = await loadWicketData(calc.modelId.value, existingOrderId)
      loadFromApi(apiData)
      switchTo(calc.activePage.value)
    } else {
      const res = await createOrder()
      calc.number.value = res.order_id
      await createWicketMainMenu({
        order_id: res.order_id,
        model_id: calc.modelId.value,
        model: `Калитка Тип ${calc.modelId.value}`,
      })
    }
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки расчёта'
    showLoadErrorModal.value = true
  } finally {
    loadPending.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  initCalculation()
})
onUnmounted(() => { window.removeEventListener('resize', onResize); clearTimeout(resizeTimer) })

const showWarningModal = ref(false)
const showSummary = ref(windowWidth.value >= 1024)
const menuCollapsed = ref(false)
const menuOpen = ref(false)

watch(isMobile, (mobile) => {
  menuOpen.value = false
  showSummary.value = !mobile
})

const menuItems = [
  { url: 'manufacturing-option',                  page: 'page1',  label: 'Вариант изготовления' },
  { url: 'fill-side',                             page: 'page2',  label: 'Заполнение' },
  { url: 'stolb-variant-otkritiya-peremichka-2',  page: 'page5',  label: 'Столбы / Вариант открытия / Перемычка' },
  { url: 'shield-type',                           page: 'page3',  label: 'Тип щита' },
  { url: 'raspolozheniye-polotna',                page: 'page6',  label: 'Расположение полотна' },
  { url: 'razmery-proyema',                       page: 'page7',  label: 'Проем' },
  { url: 'is-there-lock',                         page: 'page9',  label: 'Комплект замка' },
  { url: 'pen',                                   page: 'page10', label: 'Дополнительная ручка' },
  { url: 'client',                                page: 'page11', label: 'Клиент' },
  { url: 'end',                                   page: 'page12', label: 'Рассчитать' },
]

const stepComponents: Record<string, Component> = {
  page1:        ManufacturingOption,
  page2:                   FillSide,
  page2_facade_siding:     SidingFacade,
  page2_facade_profnastil: ProfnastilFacade,
  page2_yard_siding:       SidingYard,
  page2_yard_profnastil:   ProfnastilYard,
  page5:                   StolbVariantOtkritiya,
  page3:        ShieldType,
  page6:        RaspolozheniyePolotna,
  page7:        RazmeryProyema,
  page9:           IsTherelock,
  page_lock_type:  LockType,
  page10:  Pen,
  page11:  Client,
  page12:  End,
}

const currentComponent = shallowRef<Component>(ManufacturingOption)

function getNavState() {
  return {
    material_facade_glob: calc.material_facade_glob.value,
    fill_side: calc.fill_side.value,
    material_yard_glob: calc.material_yard_glob.value,
    is_there_lock_id: calc.is_there_lock_id.value,
    provides_lock: calc.provides_lock.value,
  }
}

function getNextPage(from: string): string | null {
  return getNextPageFn(from, getNavState())
}

function getPrevPage(from: string): string | null {
  return getPrevPageFn(from, getNavState())
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

    <B24Modal
      v-model:open="showLoadErrorModal"
      title="Ошибка"
      :description="loadError || ''"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="loadError = null; showLoadErrorModal = false; close()">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Loading overlay -->
    <div
      v-if="loadPending"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-gray-100/90"
    >
      <span class="text-gray-600">Загрузка расчёта…</span>
    </div>

    <!-- 3-column layout -->
    <div class="flex h-screen overflow-hidden bg-gray-100">

      <!-- Backdrop: mobile left menu overlay -->
      <transition name="fade">
        <div
          v-if="isMobile && menuOpen"
          class="fixed inset-0 z-40 bg-black/30"
          @click="menuOpen = false"
        />
      </transition>

      <!-- Backdrop: mobile right summary -->
      <transition name="fade">
        <div
          v-if="isMobile && showSummary"
          class="fixed inset-0 z-40 bg-black/30"
          @click="showSummary = false"
        />
      </transition>

      <!-- Left: Navigation menu (always in flex flow) -->
      <aside
        class="shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-y-auto transition-[width] duration-200"
        :class="(isMobile || menuCollapsed) ? 'w-11' : 'w-52'"
      >
        <div
          class="flex items-center border-b border-gray-200"
          :class="(isMobile || menuCollapsed) ? 'justify-center px-2 py-3' : 'justify-between px-3 py-3'"
        >
          <span
            v-if="!isMobile && !menuCollapsed"
            class="text-xs font-semibold uppercase tracking-wider text-gray-400"
          >Шаги</span>
          <!-- Desktop: collapse toggle -->
          <button
            v-if="!isMobile"
            class="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            :title="menuCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
            @click="menuCollapsed = !menuCollapsed"
          >
            <svg
              class="w-3.5 h-3.5 transition-transform duration-200"
              :class="menuCollapsed ? 'rotate-180' : ''"
              viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 1L2 6L6 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <!-- Mobile: expand button -->
          <button
            v-else
            class="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Развернуть меню"
            @click="menuOpen = true"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 1L6 6L2 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="flex-1 py-2">
          <WicketMenu
            :menu-items="menuItems"
            :active-page="activePage"
            :visited-pages="visitedPages"
            :is-page-accessible="isPageAccessible"
            :incomplete-pages="isFillSectionIncomplete ? ['page2'] : []"
            :collapsed="isMobile || menuCollapsed"
            @select="onMenuSelect"
          />
        </div>
      </aside>

      <!-- Mobile: expanded menu overlay (fixed, over content) -->
      <transition name="slide-left">
        <aside
          v-if="isMobile && menuOpen"
          class="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-gray-200 bg-white shadow-xl overflow-y-auto"
        >
          <div class="flex items-center justify-between px-3 py-3 border-b border-gray-200">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Шаги</span>
            <button
              class="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Свернуть меню"
              @click="menuOpen = false"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 1L2 6L6 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 py-2">
            <WicketMenu
              :menu-items="menuItems"
              :active-page="activePage"
              :visited-pages="visitedPages"
              :is-page-accessible="isPageAccessible"
              :incomplete-pages="isFillSectionIncomplete ? ['page2'] : []"
              :collapsed="false"
              @select="(item) => { onMenuSelect(item); menuOpen = false }"
            />
          </div>
        </aside>
      </transition>

      <!-- Center: Current form step -->
      <main class="flex-1 overflow-y-auto bg-gray-50 relative p-[10px]">

        <component
          v-if="!loadPending"
          :is="currentComponent"
          @next="goNext"
          @back="goBack"
        />
      </main>

      <!-- Toggle button for right panel (fixed, не скроллится) -->
      <button
        v-if="!loadPending"
        class="fixed top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-12 bg-white border border-gray-200 rounded-l-md shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer transition-[right] duration-200"
        :style="{ right: isMobile && showSummary ? '320px' : showSummary ? '430px' : '0' }"
        :title="showSummary ? 'Скрыть сводку' : 'Показать сводку'"
        @click="showSummary = !showSummary"
      >
        <svg
          class="w-3 h-3 transition-transform duration-200"
          :class="showSummary ? '' : 'rotate-180'"
          viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M1 1L5 5L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Right: Calculation summary -->
      <aside
        class="flex flex-col border-l border-gray-200 bg-white overflow-y-auto"
        :class="isMobile
          ? ['fixed inset-y-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200', showSummary ? 'translate-x-0' : 'translate-x-full']
          : ['shrink-0 w-[430px]', showSummary ? '' : 'hidden']
        "
      >
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Сводка расчёта</span>
          <button
            v-if="isMobile"
            class="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Закрыть"
            @click="showSummary = false"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="flex-1 p-[10px]">
          <CalculateTable />
        </div>
      </aside>

    </div>
  </B24App>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.2s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
