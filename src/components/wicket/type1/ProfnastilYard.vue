<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { parseFillingDrawingDescriptor } from '../../../app/api/fillingDrawingProfiles'
import {
  getProfnastilTable,
  saveWicketData,
  recalculate,
  type ProfnastilRow,
  type SidingPagination,
} from '../../../app/api/wicket'
import ProfnastilMaterialTable from '../shared/ProfnastilMaterialTable.vue'
import FillingAppearanceFields from '../shared/FillingAppearanceFields.vue'
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

const filters = reactive({
  materials: [] as string[],
  typeOfCoating: [] as string[],
})

const rows         = ref<ProfnastilRow[]>([])
const selectedRow  = ref<ProfnastilRow | null>(null)
const tableLoading = ref(false)
let tableRevision = 0
let disposed = false
const catalogContext = computed(() => JSON.stringify([calc.orderId.value, calc.productRowId.value, calc.modelId.value, calc.materialYardGlob.value]))
onBeforeUnmount(() => { disposed = true; tableRevision++ })
watch(catalogContext, () => {
  tableRevision++
  rows.value = []
  selectedRow.value = null
  void loadTable(1)
})
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })
const appearanceSave = createFillingAppearanceSaveCoordinator(calc, 'yard')
const appearanceFields = ref<{ validate: () => boolean } | null>(null)
const appearanceSaving = appearanceSave.saving
const appearanceSaveFailed = appearanceSave.failed

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

function goToPage(page: number) {
  if (page < 1 || page > pagination.value.pageCount) return
  loadTable(page)
}

watch(filters, () => {
  currentPage.value = 1
  loadTable(1)
}, { deep: true })

function buildSummaryParams() {
  const params: { paramCode?: string; name: string; value: string }[] = [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: calc.materialSupplierYard.value },
    { paramCode: 'material', name: 'Материал',      value: selectedRow.value?.material ?? '' },
    { paramCode: 'sheetThickness', name: 'Толщина листа', value: String(selectedRow.value?.thickness ?? '') },
    { paramCode: 'coating', name: 'Тип покрытия',  value: selectedRow.value?.typeOfCoating ?? '' },
  ]
  if (calc.colorYard.value) {
    params.push({ paramCode: 'color', name: 'Цвет', value: calc.colorYard.value })
  }
  return params
}

async function save(row: ProfnastilRow): Promise<boolean> {
  const descriptor = parseFillingDrawingDescriptor(row.drawingProfile, row.drawingProfileProblem)
  calc.fillingProfileYard.value = descriptor.profile
  calc.fillingProfileYardProblem.value = descriptor.problem
  calc.profileTypeYardId.value = row.profileTypeId ?? null
  calc.typeOfCoatingYardId.value = row.typeOfCoatingId ?? null
  calc.sidingFormYardId.value = null
  calc.idYard.value                = row.id
  calc.materialYard.value          = row.material
  calc.formYard.value              = ''
  calc.thicknessYard.value         = String(row.thickness)
  calc.typeOfCoatingYard.value   = row.typeOfCoating
  calc.coatingYardHex.value        = row.coatingHex ?? ''
  calc.coatingYardImage.value      = row.coatingImage ?? ''
  calc.reliefYardImage.value       = row.reliefImage ?? ''
    calc.reliefYardAlongMode.value = row.reliefAlongMode ?? 'stretch'
    calc.reliefYardAcrossMode.value = row.reliefAcrossMode ?? 'repeat'

  calc.updateOrCreateBlock('fillingYard', buildSummaryParams(), 'Заполнение (двор)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idYard:                  row.id,
      manufacturerYardId:     calc.manufacturerYardId.value,
      materialYardGlob:       calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      materialSupplierYard:   calc.materialSupplierYard.value,
      materialYard:             row.material,
      thicknessYard:           String(row.thickness),
      typeOfCoatingYard:     row.typeOfCoating,
      colorYardId:             calc.colorYardId.value,
      colorYard:               calc.colorYard.value,
      colorYardHex:            calc.colorYardHex.value,
      colorYardImage:          calc.colorYardImage.value,
    })
    return true
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
    return false
  }
}

async function saveAppearance() {
  if (!selectedRow.value) return
  const attempt = appearanceSave.beginSave()
  try {
    if (await save(selectedRow.value)) {
      if (appearanceSave.recordSuccess(attempt)) {
        calc.updateOrCreateBlock('fillingYard', buildSummaryParams(), 'Заполнение (двор)')
        await doRecalculate()
      }
      return
    }

    if (appearanceSave.recordFailure(attempt)) {
      calc.updateOrCreateBlock('fillingYard', buildSummaryParams(), 'Заполнение (двор)')
    }
  } finally {
    appearanceSave.finishSave()
  }
}

async function retryAppearanceSave(): Promise<void> {
  const failedAppearance = appearanceSave.getFailedSnapshot()
  if (failedAppearance === null) return
  restoreFillingAppearance(calc, 'yard', failedAppearance)
  await saveAppearance()
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
  if (!selectedRow.value || String(selectedRow.value.id) !== String(row.id)) {
    calc.resetYardFilling()
  }
  const attempt = appearanceSave.beginRevision()
  selectedRow.value = row
  if (await save(row)) {
    if (appearanceSave.recordSuccess(attempt)) await doRecalculate()
  }
}

function deselectRow() {
  selectedRow.value = null
  calc.resetYardFilling()
  appearanceSave.resetToCurrent()
}



async function validateStep(): Promise<boolean> {
  if (appearanceSaving.value || appearanceSaveFailed.value) {
    openModal('Сначала повторите сохранение оформления.')
    return false
  }
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return false
  }
  return appearanceFields.value?.validate() ?? false
}

const { validateBeforeLeave, next: onContinue } = createStepLeaveAttempt(
  validateStep,
  () => emit('next'),
)

defineExpose({ validateBeforeLeave })

function restoreFromCalc(): ProfnastilRow | null {
  if (!calc.idYard.value) return null
  return {
    id:            calc.idYard.value,
    drawingProfile: calc.fillingProfileYard.value,
    drawingProfileProblem: calc.fillingProfileYardProblem.value,
    name:          calc.materialYard.value,
    material:      calc.materialYard.value,
    thickness:     calc.thicknessYard.value,
    typeOfCoating: calc.typeOfCoatingYard.value,
    coatingHex:    calc.coatingYardHex.value,
    coatingImage:  calc.coatingYardImage.value,
    reliefImage:   calc.reliefYardImage.value,
    reliefAlongMode: calc.reliefYardAlongMode.value,
    reliefAcrossMode: calc.reliefYardAcrossMode.value,
  }
}

watch(() => calc.idYard.value, async (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    const attempt = appearanceSave.beginRevision()
    selectedRow.value = saved
    try {
      if (await save(saved)) appearanceSave.recordSuccess(attempt)
    } catch (e) {
      console.warn('saveWicketData при восстановлении:', e)
    }
  }
}, { immediate: true })

onMounted(async () => {
  const page = calc.materialYardGlob.value === 'profnastil'
    ? 'page2_yard_profnastil'
    : 'page2_yard_siding'
  calc.setActivePage(page)
  await loadTable()
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
      <span class="text-3xl font-bold flex-1 text-center">Заполнение (двор)</span>
      <B24Button
        label="Далее"
        color="air-secondary"
        :disabled="appearanceSaving || appearanceSaveFailed"
        @click="onContinue"
      />
    </div>

    <ProfnastilMaterialTable
      :model-id="calc.modelId.value" :rows="rows" :selected-row="selectedRow"
      :loading="tableLoading" :filters="filters" :pagination="pagination"
      @update:filters="Object.assign(filters, $event)"
      @select="selectRow" @deselect="deselectRow" @page="goToPage"
    >
      <template #appearance>
        <FillingAppearanceFields
          v-if="selectedRow" ref="appearanceFields" :model-id="calc.modelId.value"
          material-group="profnastil" side="yard" @change="saveAppearance"
        />
      </template>
    </ProfnastilMaterialTable>

    <div
      v-if="appearanceSaveFailed"
      data-testid="appearance-save-error"
      class="flex items-center justify-between gap-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
    >
      <span>Не удалось сохранить оформление. Повторите попытку.</span>
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
