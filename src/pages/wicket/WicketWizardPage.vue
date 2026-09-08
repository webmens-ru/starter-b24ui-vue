<script setup lang="ts">
import { shallowRef, ref, computed, onMounted, onUnmounted, watch, provide, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { parsePositiveDecimalId } from '../../app/positiveDecimalId'
import { navigateToProductRows } from '../../app/productRowReturnNavigation'
import { useCalculation } from '../../composables/useCalculation'
import {
  loadWicketData,
  getAddonList,
  getWicketAccessoryComposition,
  onWicketProductRowLockConflict,
} from '../../app/api/wicket'
import type { ProductRowContext } from '../../app/api/productRows'
import { WICKET_CALCULATION_KEY, type WicketCalculationApi } from './wicketCalculationInjection'
import type { WicketSharedNavState } from './wicketNavTypes'
import { WICKET_ROUTE_KEY, type WicketMenuItem, type WicketRouteDefinition } from './wicketRoute'

declare const window: Window & {
  _PARAMS_?: { placementOptions?: { id?: string | number; modelId?: string } }
}

import WicketMenu from '../../components/WicketMenu.vue'
import DrawingPanel from '../../components/DrawingPanel.vue'
import CalculateTable from '../../components/CalculateTable.vue'

const props = defineProps<{
  stepComponents: Record<string, Component>
  route: WicketRouteDefinition
}>()

const calc: WicketCalculationApi = useCalculation()
provide(WICKET_CALCULATION_KEY, calc)
provide(WICKET_ROUTE_KEY, props.route)

const { activePage, visitedPages, isPageAccessible, setActivePage, loadFromApi, reset } = calc

const route = useRoute()
/** modelId из пути /wicket/typeN, затем из _PARAMS_ или '1' по умолчанию. */
const resolvedModelId = (): string => {
  const m = route.path.match(/\/wicket\/type(\d+)$/)
  if (m) return m[1]
  const fromParams = window._PARAMS_?.placementOptions?.modelId
  return fromParams ? String(fromParams) : '1'
}
calc.modelId.value = resolvedModelId()

const windowWidth = ref(window.innerWidth)
const loadError = ref<string | null>(null)
const showLoadErrorModal = ref(false)
const showLockConflictModal = ref(false)
const loadPending = ref(true)
const isMobile = computed(() => windowWidth.value < 1024)
const currentComponent = shallowRef<Component | null>(null)
function routeQueryValueKey(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  return `${typeof value}:${String(value)}`
}
const routeContextKey = computed(() => [
  route.path,
  routeQueryValueKey(route.query.orderId),
  routeQueryValueKey(route.query.productRowId),
  resolvedModelId(),
].join('|'))
let mounted = false
let initGeneration = 0
let stopWicketLockConflict: (() => void) | undefined

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { windowWidth.value = window.innerWidth }, 100)
}
async function resolveProductRowContext(): Promise<ProductRowContext | null> {
  const parsedOrderId = parsePositiveDecimalId(route.query.orderId)
  const parsedProductRowId = parsePositiveDecimalId(route.query.productRowId)
  const routeOrderId = parsedOrderId.kind === 'valid' ? parsedOrderId.value : null
  const routeProductRowId = parsedProductRowId.kind === 'valid' ? parsedProductRowId.value : null

  if (routeOrderId && routeProductRowId) {
    return { orderId: routeOrderId, productRowId: routeProductRowId, modelId: resolvedModelId() }
  }
  if (parsedOrderId.kind === 'invalid' || parsedProductRowId.kind === 'invalid') {
    throw new Error('Некорректный контекст товарной позиции')
  }

  initGeneration += 1
  navigateToProductRows()
  return null
}

function isCurrentInitialization(generation: number): boolean {
  return mounted && generation === initGeneration
}

async function initCalculation(): Promise<void> {
  const generation = ++initGeneration
  loadPending.value = true
  loadError.value = null
  showLoadErrorModal.value = false
  currentComponent.value = null
  reset()
  try {
    const context = await resolveProductRowContext()
    if (!isCurrentInitialization(generation)) return
    if (!context) return
    const [availability, apiData, accessoryComposition] = await Promise.all([
      fetchAddonAvailability(Number(context.modelId)),
      loadWicketData(context),
      getWicketAccessoryComposition({ orderId: context.orderId, productRowId: context.productRowId }),
    ])
    if (!isCurrentInitialization(generation)) return
    calc.addonItems.value = availability.items
    calc.availableSections.value = availability.sections
    calc.applyAccessoryComposition(accessoryComposition)
    loadFromApi(apiData)
    calc.orderId.value = context.orderId
    calc.productRowId.value = context.productRowId
    calc.modelId.value = context.modelId
    switchTo(calc.activePage.value)
  } catch (e: unknown) {
    if (!isCurrentInitialization(generation)) return
    loadError.value = e instanceof Error ? e.message : 'Ошибка загрузки расчёта'
    showLoadErrorModal.value = true
  } finally {
    if (isCurrentInitialization(generation)) loadPending.value = false
  }
}

onMounted(() => {
  mounted = true
  stopWicketLockConflict = onWicketProductRowLockConflict(context => {
    if (
      calc.orderId.value === context.orderId
      && calc.productRowId.value === context.productRowId
      && (String(calc.modelId.value) === context.modelId || context.modelId === 'accessory-composition')
    ) {
      showLockConflictModal.value = true
      if (context.modelId === 'accessory-composition') {
        const generation = initGeneration
        void getWicketAccessoryComposition({ orderId: context.orderId, productRowId: context.productRowId })
          .then(composition => {
            if (isCurrentInitialization(generation)) calc.applyAccessoryComposition(composition)
          })
          .catch(error => console.warn('getWicketAccessoryComposition:', error))
      }
    }
  })
  window.addEventListener('resize', onResize)
  void initCalculation()
})
onUnmounted(() => {
  mounted = false
  initGeneration += 1
  stopWicketLockConflict?.()
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
})

watch(routeContextKey, () => {
  if (mounted) void initCalculation()
})

const showWarningModal = ref(false)
const showSummary = ref(windowWidth.value >= 1024)
const menuCollapsed = ref(false)
const menuOpen = ref(false)

watch(isMobile, (mobile) => {
  menuOpen.value = false
  showSummary.value = !mobile
})

type AddonKey = 'doorCloser' | 'bumper' | 'skud'
type AddonItem = Awaited<ReturnType<typeof getAddonList>>['items'][number]

async function fetchAddonAvailability(modelId: number): Promise<{
  items: Record<AddonKey, AddonItem[]>
  sections: string[]
}> {
  const map: Array<['doorCloser' | 'bumper' | 'skud', 'door-closer' | 'bumper' | 'skud', string]> = [
    ['doorCloser', 'door-closer', 'page_door_closer'],
    ['bumper', 'bumper', 'page_bumper'],
    ['skud', 'skud', 'page_skud'],
  ]
  const items: Record<AddonKey, AddonItem[]> = { doorCloser: [], bumper: [], skud: [] }
  const sections: string[] = []
  await Promise.all(map.map(async ([key, section, page]) => {
    try {
      const res = await getAddonList(section, modelId)
      items[key] = res.items
      if (res.items.length) sections.push(page)
    } catch (e) { console.warn('getAddonList', section, e) }
  }))

  return { items, sections }
}

const sectionState = computed(() => ({
  modelId: String(calc.modelId.value ?? ''),
  materialFacadeGlob: calc.materialFacadeGlob.value,
  fillSide: calc.fillSide.value,
  materialYardGlob: calc.materialYardGlob.value,
  isThereLock: calc.isThereLock.value,
  providesLock: calc.providesLock.value,
  availableSections: calc.availableSections.value,
  idFacade: calc.idFacade.value,
  idYard: calc.idYard.value,
  lockSetId: calc.lockSetId.value,
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
}))

const sectionValidations = computed(() =>
  props.route.validations(sectionState.value),
)

const menuItems = computed(() =>
  props.route.menu(sectionState.value),
)

const incompletePages = computed(() =>
  Array.from(sectionValidations.value.entries())
    .filter(([, v]) => !v.valid)
    .map(([page]) => page),
)

function getNavState(): WicketSharedNavState {
  return {
    modelId: String(calc.modelId.value ?? ''),
    materialFacadeGlob: calc.materialFacadeGlob.value,
    fillSide: calc.fillSide.value,
    materialYardGlob: calc.materialYardGlob.value,
    isThereLock: calc.isThereLock.value,
    providesLock: calc.providesLock.value,
    availableSections: calc.availableSections.value,
    idFacade: calc.idFacade.value,
    idYard: calc.idYard.value,
    lockSetId: calc.lockSetId.value,
    widthProyema: calc.widthProyema.value,
    heightProyema: calc.heightProyema.value,
  }
}

function getNextPage(from: string): string | null {
  return props.route.next(from, getNavState())
}

function getPrevPage(from: string): string | null {
  return props.route.prev(from, getNavState())
}

function switchTo(page: string) {
  const component = props.stepComponents[page]
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

function onMenuSelect(item: WicketMenuItem) {
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

    <B24Modal
      v-model:open="showLockConflictModal"
      title="Требуется перезагрузка"
      description="Данные товарной позиции изменились в другой сессии. Перезагрузите расчёт, чтобы продолжить работу."
    >
      <template #footer>
        <B24Button color="air-primary" @click="window.location.reload()">Перезагрузить</B24Button>
      </template>
    </B24Modal>

    <!-- Loading overlay -->
    <div
      v-if="loadPending"
      role="status"
      aria-live="polite"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-gray-100/90"
    >
      <span class="text-gray-600">Загрузка расчёта…</span>
    </div>

    <!-- 3-column layout -->
    <div class="flex h-[calc(100vh-50px)] overflow-hidden bg-gray-100">

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
            :incomplete-pages="incompletePages"
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
              :incomplete-pages="incompletePages"
              :collapsed="false"
              @select="(item) => { onMenuSelect(item); menuOpen = false }"
            />
          </div>
        </aside>
      </transition>

      <!-- Center: Current form step -->
      <main class="flex-1 overflow-y-auto bg-gray-50 relative p-[10px]">

        <component
          v-if="!loadPending && currentComponent"
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
          ? ['fixed top-[50px] bottom-0 right-0 z-50 w-80 shadow-xl transition-transform duration-200', showSummary ? 'translate-x-0' : 'translate-x-full']
          : ['shrink-0 w-[430px]', showSummary ? '' : 'hidden']
        "
      >
        <div class="flex-1">
          <DrawingPanel />
          <CalculateTable
            :closable="isMobile"
            @close="showSummary = false"
          />
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
