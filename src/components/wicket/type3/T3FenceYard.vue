<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFillingAppearanceOptions, getFenceTable, saveWicketData, recalculate, type FenceRow, type SidingPagination } from '../../../app/api/wicket'
import { inheritedYardLaying, applyYardSnapshot } from './fenceLayingState'
import FenceMaterialTable from '../shared/FenceMaterialTable.vue'
import FillingAppearanceFields from '../shared/FillingAppearanceFields.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
let disposed = false
const owner = calc.getCurrentProductRowContext()
const isCurrent = () => !disposed && calc.orderId.value === owner.orderId && calc.productRowId.value === owner.productRowId && String(calc.modelId.value) === String(owner.modelId)
onBeforeUnmount(() => { disposed = true })
const saving = ref(false)
const saveError = ref('')
const needsSave = ref(false)
const appearanceFields = ref<{ validate: () => boolean } | null>(null)
async function validateBeforeLeave(): Promise<boolean> {
  if (saving.value) return false
  if (needsSave.value) return persistSelection(selectedRow.value)
  return selectedRow.value ? persistSelection(selectedRow.value) : false
}
defineExpose({ validateBeforeLeave })

const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

const inheritedGap = computed(() => calc.gapName.value)
const widthLocked = computed(() => inheritedGap.value !== null && inheritedGap.value > 0)
const inheritedMode = computed(() => calc.layingFacadeCode.value ?? (inheritedGap.value === 0 ? 'butt' : inheritedGap.value === null ? null : 'gap'))

const filters = reactive({
  companies:     [] as string[],
  fenceForm: [] as string[],
  profileIds: [] as string[],
  manufacturers: [] as string[],
  materials:     [] as string[],
  widthFence:    [] as string[],
  typeOfCoating: [] as string[],
})

const rows         = ref<FenceRow[]>([])
const selectedRow  = ref<FenceRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
let tableRevision = 0
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  const revision = ++tableRevision
  const current = () => isCurrent() && revision === tableRevision
  tableLoading.value = true
  try {
    const result = await getFenceTable(calc.modelId.value, { ...filters, widthFence: widthLocked.value ? [String(calc.thicknessFacade.value)] : filters.widthFence }, page)
    if (!current()) return
    rows.value        = result.table
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    if (!current()) return
    console.warn('getFenceTable недоступен:', e)
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

// Восстановление при загрузке данных (редактирование): id_yard может появиться после монтирования
watch(() => calc.idYard.value, (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    selectedRow.value = saved
  }
}, { immediate: true })

function restoreFromCalc(): FenceRow | null {
  if (!calc.idYard.value || (widthLocked.value && Number(calc.thicknessYard.value) !== Number(calc.thicknessFacade.value))) return null
  return {
    id:            calc.idYard.value,
    fenceFormName: calc.formYard.value,
    manufacturerId: calc.manufacturerYardId.value == null ? null : Number(calc.manufacturerYardId.value),
    manufacturerName: calc.materialSupplierYard.value,
    company:       calc.materialSupplierYard.value,
    material:      calc.materialYard.value,
    widthFence:    calc.thicknessYard.value,
    profileImage:  calc.reliefYardImage.value,
    typeOfCoating: calc.typeOfCoatingYard.value,
  }
}

async function save(row: FenceRow) {
  if (widthLocked.value && Number(row.widthFence) !== Number(calc.thicknessFacade.value)) throw new Error('Ширина штакетника двора должна совпадать с фасадом')
  if (!isCurrent()) throw new Error('Расчёт изменился')

  if (String(calc.idYard.value) !== String(row.id) || Number(calc.thicknessYard.value) !== Number(row.widthFence)) {
    calc.yardButtTrimCode.value = null
    calc.yardButtTrimSide.value = null
    calc.yardButtTrim.value = null
  }
  calc.idYard.value                = row.id
  calc.manufacturerYardId.value = row.manufacturerId ?? null
  calc.materialSupplierYard.value = row.manufacturerName ?? ''
  calc.materialYard.value          = row.material
  calc.formYard.value              = row.fenceFormName ?? ''
  calc.thicknessYard.value         = String(row.widthFence)
  calc.typeOfCoatingYard.value   = row.typeOfCoating
  calc.reliefYardImage.value       = row.profileImage ?? ''

  const yardSnapshot = await inheritedYardLaying(calc, inheritedMode.value, inheritedGap.value)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  calc.updateOrCreateBlock('fillingYard', [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: calc.materialSupplierYard.value },
    { paramCode: 'material', name: 'Материал',                value: row.material },
    { paramCode: 'fenceWidth', name: 'Ширина штакетника',       value: String(row.widthFence) },
    { paramCode: 'coating', name: 'Тип покрытия',            value: row.typeOfCoating },
    { paramCode: 'color', name: 'Цвет', value: calc.colorYard.value },
  ], 'Заполнение (двор)')

  try {
    applyYardSnapshot(calc, yardSnapshot)
    await saveWicketData({
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true,
      idYard:                row.id,
      ...yardSnapshot,
      materialYardGlob:     calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      manufacturerYardId: calc.manufacturerYardId.value,
      materialSupplierYard: calc.materialSupplierYard.value,
      materialYard:           row.material,
      widthFenceYard:         String(row.widthFence),
      typeOfCoatingYard:   row.typeOfCoating,
      colorYard:             calc.colorYard.value,
    })
    if (isCurrent()) applyYardSnapshot(calc, yardSnapshot)
  } catch (e) {
    throw e
  }
}

async function saveAppearance(): Promise<void> {
  if (!selectedRow.value || !isCurrent()) return
  needsSave.value = true
  if (await persistSelection(selectedRow.value)) await doRecalculate()
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
    if (isCurrent()) calc.updatePriceBlock(result.priceDealer, result.priceRetail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

async function persistSelection(row: FenceRow | null): Promise<boolean> {
  if (saving.value) return false
  saving.value = true
  saveError.value = ''
  try {
    if (row) await save(row)
    else await saveWicketData({
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true, idYard: null, widthFenceYard: null,
      manufacturerYardId: null, materialSupplierYard: null, materialYard: null, typeOfCoatingYard: null, colorYard: null,
      yardButtTrimCode: null, yardButtTrimSide: null, yardTrimCode: null, layingYardCode: inheritedMode.value, gapYardMm: inheritedGap.value, numberOfSticksYard: null,
    })
    needsSave.value = false
    return true
  } catch {
    saveError.value = 'Не удалось сохранить материал. Нажмите «Далее», чтобы повторить.'
    return false
  } finally {
    saving.value = false
  }
}

let selectionRevision = 0
async function selectRow(row: FenceRow) {
  if (saving.value) return
  const revision = ++selectionRevision
  if (String(calc.idYard.value) !== String(row.id)) {
    try {
      const options = await getFillingAppearanceOptions(calc.modelId.value, 'fence', row.id)
      if (!isCurrent() || revision !== selectionRevision) return
      if (!options.colors.some(color => String(color.id) === String(calc.colorYardId.value))) {
        calc.colorYardId.value = null
        calc.colorYard.value = ''
        calc.colorYardHex.value = ''
        calc.colorYardImage.value = ''
      }
    } catch {
      if (isCurrent() && revision === selectionRevision) saveError.value = 'Не удалось загрузить палитру материала. Повторите выбор.'
      return
    }
  }
  if (String(calc.idYard.value) !== String(row.id) || Number(calc.thicknessYard.value) !== Number(row.widthFence)) calc.invalidateFillingPreview('yard')
  needsSave.value = true
  selectedRow.value = row
  if (await persistSelection(row)) await doRecalculate()
}

function deselectRow() {
  if (saving.value) return
  if (calc.idYard.value) calc.invalidateFillingPreview('yard')
  needsSave.value = true
  selectedRow.value = null
  calc.reliefYardImage.value = ''
  calc.manufacturerYardId.value = null
  calc.materialSupplierYard.value = ''
  applyYardSnapshot(calc, { idYard: null, widthFenceYard: null, layingYardCode: inheritedMode.value, gapYardMm: inheritedGap.value, numberOfSticksYard: null })
  void persistSelection(null)
}

async function onContinue() {
  if (!selectedRow.value || (widthLocked.value && Number(selectedRow.value.widthFence) !== Number(calc.thicknessFacade.value))) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  if (appearanceFields.value?.validate?.() === false) return
  if (await validateBeforeLeave()) emit('next')
}

onMounted(async () => {
  calc.setActivePage('page2_yard_fence')
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
      <span class="text-3xl font-bold flex-1 text-center">Двор — материал</span>
      <B24Button label="Далее" :disabled="saving" color="air-secondary" @click="onContinue" />
    </div>

    <p class="text-center text-sm" data-testid="inherited-laying">
      Укладка как на фасаде: {{ inheritedMode === 'butt' ? 'встык' : `с зазором ${inheritedGap} мм` }}.
      <template v-if="widthLocked">Ширина штакетника: {{ calc.thicknessFacade.value }} мм.</template>
      <template v-else>Ширину штакетника можно выбрать другую.</template>
    </p>
    <p v-if="saveError" role="alert" class="text-red-700">{{ saveError }}</p>

    <FenceMaterialTable
      :model-id="calc.modelId.value" :rows="rows" :selected-row="selectedRow"
      :loading="tableLoading" :filters="filters" :pagination="pagination"
      @update:filters="Object.assign(filters, $event)"
      @select="selectRow" @deselect="deselectRow" @page="goToPage"
    >
      <template #appearance>
    <FillingAppearanceFields
      v-if="selectedRow"
      ref="appearanceFields"
      :model-id="calc.modelId.value"
      material-group="fence"
      :fence-id="selectedRow.id"
      side="yard"
      :show-manufacturer="false"
      :disabled="saving"
      @change="saveAppearance"
    />

      </template>
    </FenceMaterialTable>
  </div>
</template>
