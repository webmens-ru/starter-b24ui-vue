<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { parseFillingDrawingDescriptor } from '../../../app/api/fillingDrawingProfiles'
import {
  getProfnastilTable,
  getProfnastilColors,
  saveWicketData,
  recalculate,
  type ProfnastilRow,
  type ProfnastilColorOption,
  type SidingPagination,
} from '../../../app/api/wicket'
import FilterDropdown from './FilterDropdown.vue'
import { wicketProfnastilFilterDataUrl } from '../shared/wicketMaterialApiPaths'
import { hasRequiredFillingColor } from '../shared/fillingColorValidation'
import {
  createFillingAppearanceSaveCoordinator,
  restoreFillingAppearance,
} from '../shared/fillingAppearanceState'
import { createStepLeaveAttempt } from '../stepLeaveAttempt'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

const profnastilFilterDataUrl = computed(() => wicketProfnastilFilterDataUrl(calc.modelId.value))

const filters = reactive({
  materials: [] as string[],
  typeOfCoating: [] as string[],
})

const rows         = ref<ProfnastilRow[]>([])
const selectedRow  = ref<ProfnastilRow | null>(null)
const tableLoading = ref(false)
let tableRevision = 0
let disposed = false
const catalogContext = computed(() => JSON.stringify([calc.orderId.value, calc.productRowId.value, calc.modelId.value, calc.materialFacadeGlob.value]))
onBeforeUnmount(() => { disposed = true; tableRevision++ })
watch(catalogContext, () => {
  tableRevision++
  rows.value = []
  selectedRow.value = null
  void loadTable(1)
})
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

const colors       = ref<ProfnastilColorOption[]>([])
const colorLoading = ref(false)
const selectedColorId = ref<number | null>(null)
const appearanceSave = createFillingAppearanceSaveCoordinator(calc, 'facade')
const appearanceSaving = appearanceSave.saving
const appearanceSaveFailed = appearanceSave.failed

const selectedColor = computed<ProfnastilColorOption | undefined>(() =>
  colors.value.find((c) => c.id === selectedColorId.value),
)

const colorSelectItems = computed(() =>
  colors.value.map((c) => ({ id: c.id, label: c.name })),
)

async function loadTable(page = currentPage.value) {
  const revision = ++tableRevision
  const context = catalogContext.value
  const current = () => !disposed && revision === tableRevision && context === catalogContext.value
  tableLoading.value = true
  try {
    const result = await getProfnastilTable(calc.modelId.value, filters, page)
    if (!current()) return
    rows.value        = result.table
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    if (!current()) return
    console.warn('getProfnastilTable недоступен:', e)
    rows.value = []
  } finally {
    if (current()) tableLoading.value = false
  }
}

async function loadColors() {
  colorLoading.value = true
  try {
    const result = await getProfnastilColors(calc.modelId.value)
    colors.value = result.colors
  } catch (e) {
    console.warn('getProfnastilColors недоступен:', e)
    colors.value = []
  } finally {
    colorLoading.value = false
  }
}

function goToPage(page: number) {
  if (page < 1 || page > pagination.value.pageCount) return
  loadTable(page)
}

watch(filters, () => {
  currentPage.value = 1
  loadTable(1)
}, { deep: true })

function clearColor() {
  selectedColorId.value = null
  calc.colorFacadeId.value    = null
  calc.colorFacade.value      = ''
  calc.colorFacadeHex.value   = ''
  calc.colorFacadeImage.value = ''
}

function applySelectedColor() {
  const color = selectedColor.value
  if (color) {
    calc.colorFacadeId.value    = color.id
    calc.colorFacade.value      = color.name
    calc.colorFacadeHex.value   = color.hex ?? ''
    calc.colorFacadeImage.value = color.image ?? ''
  } else {
    calc.colorFacadeId.value    = null
    calc.colorFacade.value      = ''
    calc.colorFacadeHex.value   = ''
    calc.colorFacadeImage.value = ''
  }
}

function buildSummaryParams() {
  const params: { paramCode?: string; name: string; value: string }[] = [
    { paramCode: 'material', name: 'Материал',      value: selectedRow.value?.material ?? '' },
    { paramCode: 'sheetThickness', name: 'Толщина листа', value: String(selectedRow.value?.thickness ?? '') },
    { paramCode: 'coating', name: 'Тип покрытия',  value: selectedRow.value?.typeOfCoating ?? '' },
  ]
  if (calc.colorFacade.value) {
    params.push({ paramCode: 'color', name: 'Цвет', value: calc.colorFacade.value })
  }
  return params
}

async function save(row: ProfnastilRow): Promise<boolean> {
  const descriptor = parseFillingDrawingDescriptor(row.drawingProfile, row.drawingProfileProblem)
  calc.fillingProfileFacade.value = descriptor.profile
  calc.fillingProfileFacadeProblem.value = descriptor.problem
  calc.profileTypeFacadeId.value = row.profileTypeId ?? null
  calc.typeOfCoatingFacadeId.value = row.typeOfCoatingId ?? null
  calc.sidingFormFacadeId.value = null
  calc.idFacade.value                = row.id
  calc.materialFacade.value          = row.material
  calc.formFacade.value              = ''
  calc.thicknessFacade.value         = String(row.thickness)
  calc.typeOfCoatingFacade.value   = row.typeOfCoating
  calc.coatingFacadeHex.value        = row.coatingHex ?? ''
  calc.coatingFacadeImage.value      = row.coatingImage ?? ''
  calc.reliefFacadeImage.value       = row.reliefImage ?? ''
    calc.reliefFacadeAlongMode.value = row.reliefAlongMode ?? 'stretch'
    calc.reliefFacadeAcrossMode.value = row.reliefAcrossMode ?? 'repeat'

  calc.updateOrCreateBlock('fillingFacade', buildSummaryParams(), 'Заполнение (фасад)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idFacade:                row.id,
      materialFacadeGlob:     calc.materialFacadeGlob.value,
      materialFacade:          row.material,
      thicknessFacade:         String(row.thickness),
      typeOfCoatingFacade:   row.typeOfCoating,
      colorFacadeId:           calc.colorFacadeId.value,
      colorFacade:             calc.colorFacade.value,
      colorFacadeHex:          calc.colorFacadeHex.value,
      colorFacadeImage:        calc.colorFacadeImage.value,
    })
    return true
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
    return false
  }
}

async function saveColor() {
  if (!selectedRow.value) return
  applySelectedColor()
  const attempt = appearanceSave.beginSave()
  calc.updateOrCreateBlock('fillingFacade', buildSummaryParams(), 'Заполнение (фасад)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idFacade:                calc.idFacade.value || null,
      materialFacadeGlob:     calc.materialFacadeGlob.value,
      materialFacade:          calc.materialFacade.value,
      thicknessFacade:         calc.thicknessFacade.value,
      typeOfCoatingFacade:   calc.typeOfCoatingFacade.value,
      colorFacadeId:           calc.colorFacadeId.value,
      colorFacade:             calc.colorFacade.value,
      colorFacadeHex:          calc.colorFacadeHex.value,
      colorFacadeImage:        calc.colorFacadeImage.value,
    })
    appearanceSave.recordSuccess(attempt)
  } catch (e) {
    console.warn('saveWicketData (цвет) недоступен:', e)
    if (appearanceSave.recordFailure(attempt)) {
      selectedColorId.value = calc.colorFacadeId.value === null
        ? null
        : Number(calc.colorFacadeId.value)
      calc.updateOrCreateBlock('fillingFacade', buildSummaryParams(), 'Заполнение (фасад)')
    }
  } finally {
    appearanceSave.finishSave()
  }
}

async function retryAppearanceSave(): Promise<void> {
  const failedAppearance = appearanceSave.getFailedSnapshot()
  if (failedAppearance === null) return
  restoreFillingAppearance(calc, 'facade', failedAppearance)
  selectedColorId.value = failedAppearance.colorId === null
    ? null
    : Number(failedAppearance.colorId)
  await saveColor()
}

async function doRecalculate() {
  if (!calc.priceRetail.value) return
  try {
    const result = await recalculate({
      orderId: Number(calc.number.value),
      productRowId: calc.getCurrentProductRowContext().productRowId,
      productType:       calc.productType.value,
      model:              calc.model.value,
      modelId:           calc.modelId.value,
    })
    calc.updatePriceBlock(result.priceDealer, result.priceRetail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

async function selectRow(row: ProfnastilRow) {
  selectedRow.value = row
  clearColor()
  if (await save(row)) {
    appearanceSave.resetToCurrent()
    await doRecalculate()
  }
}

function deselectRow() {
  calc.fillingProfileFacade.value = null
  calc.fillingProfileFacadeProblem.value = null
  selectedRow.value = null
  clearColor()
  calc.idFacade.value = ''
  calc.materialFacade.value = ''
  calc.thicknessFacade.value = ''
  calc.typeOfCoatingFacade.value = ''
  calc.coatingFacadeHex.value = ''
  calc.coatingFacadeImage.value = ''
  calc.reliefFacadeImage.value = ''
  appearanceSave.resetToCurrent()
}

function isSelected(row: ProfnastilRow) {
  return selectedRow.value?.id === row.id
}

async function validateStep(): Promise<boolean> {
  if (appearanceSaving.value || appearanceSaveFailed.value) {
    openModal('Сначала повторите сохранение цвета.')
    return false
  }
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return false
  }
  if (!hasRequiredFillingColor(selectedColorId.value, calc.colorFacade.value)) {
    openModal('Вы не выбрали цвет!')
    return false
  }
  return true
}

const { validateBeforeLeave, next: onContinue } = createStepLeaveAttempt(
  validateStep,
  () => emit('next'),
)

defineExpose({ validateBeforeLeave })

function restoreFromCalc(): ProfnastilRow | null {
  if (!calc.idFacade.value) return null
  if (calc.colorFacadeId.value) {
    selectedColorId.value = Number(calc.colorFacadeId.value)
  }
  return {
    id:            calc.idFacade.value,
    drawingProfile: calc.fillingProfileFacade.value,
    drawingProfileProblem: calc.fillingProfileFacadeProblem.value,
    name:          calc.materialFacade.value,
    material:      calc.materialFacade.value,
    thickness:     calc.thicknessFacade.value,
    typeOfCoating: calc.typeOfCoatingFacade.value,
    coatingHex:    calc.coatingFacadeHex.value,
    coatingImage:  calc.coatingFacadeImage.value,
    reliefImage:   calc.reliefFacadeImage.value,
    reliefAlongMode: calc.reliefFacadeAlongMode.value,
    reliefAcrossMode: calc.reliefFacadeAcrossMode.value,
  }
}

watch(() => calc.idFacade.value, async (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    selectedRow.value = saved
    try {
      if (await save(saved)) appearanceSave.resetToCurrent()
    } catch (e) {
      console.warn('saveWicketData при восстановлении:', e)
    }
  }
}, { immediate: true })

onMounted(async () => {
  calc.setActivePage('page2_facade_profnastil')
  await loadTable()
  await loadColors()
})
</script>

<template>
  <div class="flex flex-col gap-3">

    <B24Modal
      v-model:open="showModal"
      :title="modalTitle"
      :description="modalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold flex-1 text-center">Заполнение (фасад)</span>
      <B24Button
        label="Далее"
        color="air-secondary"
        :disabled="appearanceSaving || appearanceSaveFailed"
        @click="onContinue"
      />
    </div>

    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <FilterDropdown
        label="Материал"
        :url="profnastilFilterDataUrl"
        data-key="material"
        v-model="filters.materials"
      />
      <FilterDropdown
        label="Тип покрытия"
        :url="profnastilFilterDataUrl"
        data-key="typeOfCoating"
        v-model="filters.typeOfCoating"
      />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableLoading">
            <td colspan="3" class="text-center py-4 text-gray-400">Загрузка...</td>
          </tr>

          <tr
            v-if="selectedRow && !rows.find(r => r.id === selectedRow!.id)"
            class="bg-blue-100"
          >
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox" checked class="accent-blue-600" @change="deselectRow" />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.id"
            :class="isSelected(row) ? 'bg-blue-100' : 'hover:bg-gray-50'"
          >
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input
                type="checkbox"
                :checked="isSelected(row)"
                class="accent-blue-600"
                @change="isSelected(row) ? deselectRow() : selectRow(row)"
              />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ row.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="3" class="text-center py-4 text-gray-400">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="pagination.pageCount > 1"
      class="flex items-center justify-between gap-3 pt-1"
    >
      <span class="text-sm text-gray-500">
        Записей: {{ pagination.totalCount }},
        страница {{ pagination.page }} из {{ pagination.pageCount }}
      </span>
      <div class="flex items-center gap-1">
        <button class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" :disabled="pagination.page <= 1" @click="goToPage(1)">«</button>
        <button class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" :disabled="pagination.page <= 1" @click="goToPage(pagination.page - 1)">‹</button>
        <button class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" :disabled="pagination.page >= pagination.pageCount" @click="goToPage(pagination.page + 1)">›</button>
        <button class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" :disabled="pagination.page >= pagination.pageCount" @click="goToPage(pagination.pageCount)">»</button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label class="font-semibold">Цвет</label>
      <B24SelectMenu
        :model-value="selectedColorId ?? undefined"
        value-key="id"
        :items="colorSelectItems"
        placeholder="Выберите цвет"
        :b24ui="{ content: 'z-50' }"
        :disabled="!selectedRow || colorLoading"
        class="w-full"
        @update:model-value="(id) => { selectedColorId = id ?? null; saveColor() }"
      />
      <span v-if="colorLoading" class="text-xs text-gray-400">Загрузка цветов...</span>
    </div>

    <div
      v-if="appearanceSaveFailed"
      data-testid="appearance-save-error"
      class="flex items-center justify-between gap-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
    >
      <span>Не удалось сохранить цвет. Повторите попытку.</span>
      <button
        data-testid="appearance-save-retry"
        type="button"
        class="rounded border border-red-400 bg-white px-3 py-1 disabled:opacity-50"
        :disabled="appearanceSaving"
        @click="retryAppearanceSave"
      >
        Повторить
      </button>
    </div>

  </div>
</template>
