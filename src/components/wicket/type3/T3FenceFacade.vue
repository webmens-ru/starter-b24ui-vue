<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount, onMounted } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFillingAppearanceOptions, getFenceTable, saveWicketData, recalculate, type FenceRow, type SidingPagination } from '../../../app/api/wicket'
import { reconcileFacadeLaying, inheritedYardLaying, applyYardSnapshot } from './fenceLayingState'
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
const yardCleared = ref(false)
const saving = ref(false)
const saveError = ref('')
const needsSave = ref(false)
const appearanceFields = ref<{ validate: () => boolean } | null>(null)
async function validateBeforeLeave(): Promise<boolean> {
  if (saving.value) return false
  if (needsSave.value) return persistSelection(selectedRow.value)
  return !needsSave.value
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
    const result = await getFenceTable(calc.modelId.value, filters, page)
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

// Восстановление при загрузке данных (редактирование): id_facade может появиться после монтирования
watch(() => calc.idFacade.value, async (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    selectedRow.value = saved
  }
}, { immediate: true })

function clearGap() {
  calc.yardButtTrimCode.value = null
  calc.yardButtTrimSide.value = null
  calc.yardButtTrim.value = null
  calc.facadeButtTrimCode.value = null
  calc.facadeButtTrimSide.value = null
  calc.facadeButtTrim.value = null
  calc.layingFacadeCode.value = null
  calc.gapId.value = null
  calc.gapName.value = null
  calc.numberOfSticks.value = null
}

function restoreFromCalc(): FenceRow | null {
  if (!calc.idFacade.value) return null
  return {
    id:            calc.idFacade.value,
    fenceFormName: calc.formFacade.value,
    manufacturerId: calc.manufacturerFacadeId.value == null ? null : Number(calc.manufacturerFacadeId.value),
    manufacturerName: calc.materialSupplierFacade.value,
    company:       calc.materialSupplierFacade.value,
    material:      calc.materialFacade.value,
    widthFence:    calc.thicknessFacade.value,
    profileImage:  calc.reliefFacadeImage.value,
    typeOfCoating: calc.typeOfCoatingFacade.value,
  }
}

async function save(row: FenceRow) {
  if (!isCurrent()) throw new Error('Расчёт изменился')
  if (String(calc.idFacade.value) !== String(row.id) && calc.facadeButtTrimCode.value !== null) clearGap()
  await reconcileFacadeLaying(calc, row.widthFence)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  const yardSnapshot = await inheritedYardLaying(calc, calc.layingFacadeCode.value ?? (calc.gapName.value === null ? null : calc.gapName.value === 0 ? 'butt' : 'gap'), calc.gapName.value, row.widthFence)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  calc.idFacade.value                = row.id
  calc.manufacturerFacadeId.value = row.manufacturerId ?? null
  calc.materialSupplierFacade.value = row.manufacturerName ?? ''
  calc.materialFacade.value          = row.material
  calc.formFacade.value              = row.fenceFormName ?? ''
  // widthFence сохраняем в поле thicknessFacade (общая колонка ассортимента)
  calc.thicknessFacade.value         = String(row.widthFence)
  calc.typeOfCoatingFacade.value   = row.typeOfCoating
  calc.reliefFacadeImage.value       = row.profileImage ?? ''

  calc.updateOrCreateBlock('fillingFacade', [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: calc.materialSupplierFacade.value },
    { paramCode: 'material', name: 'Материал',                value: row.material },
    { paramCode: 'fenceWidth', name: 'Ширина штакетника',       value: String(row.widthFence) },
    { paramCode: 'coating', name: 'Тип покрытия',            value: row.typeOfCoating },
    { paramCode: 'color', name: 'Цвет', value: calc.colorFacade.value },
  ], 'Заполнение (фасад)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true,
      ...yardSnapshot,
      idFacade:                row.id,
      facadeButtTrimCode: calc.facadeButtTrimCode.value,
      facadeButtTrimSide: calc.facadeButtTrimSide.value,
      layingFacadeCode: calc.layingFacadeCode.value,
      gapId: calc.gapId.value,
      gapName: calc.gapName.value,
      numberOfSticks: calc.numberOfSticks.value,
      materialFacadeGlob:     calc.materialFacadeGlob.value,
      manufacturerFacadeId: calc.manufacturerFacadeId.value,
      materialSupplierFacade: calc.materialSupplierFacade.value,
      materialFacade:          row.material,
      widthFenceFacade:        String(row.widthFence),
      typeOfCoatingFacade:   row.typeOfCoating,
      colorFacade:             calc.colorFacade.value,
    })
    if (isCurrent()) {
      applyYardSnapshot(calc, yardSnapshot)
      yardCleared.value = yardSnapshot.idYard === null
    }
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
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true, idFacade: null, widthFenceFacade: null,
      layingYardCode: null, gapYardMm: null, numberOfSticksYard: null,
      manufacturerFacadeId: null, materialSupplierFacade: null, materialFacade: null, typeOfCoatingFacade: null, colorFacade: null,
      yardButtTrimCode: null, yardButtTrimSide: null, facadeButtTrimCode: null, facadeButtTrimSide: null, layingFacadeCode: null, gapId: null, gapName: null, numberOfSticks: null,
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
  if (String(calc.idFacade.value) !== String(row.id)) {
    try {
      const options = await getFillingAppearanceOptions(calc.modelId.value, 'fence', row.id)
      if (!isCurrent() || revision !== selectionRevision) return
      if (!options.colors.some(color => String(color.id) === String(calc.colorFacadeId.value))) {
        calc.colorFacadeId.value = null
        calc.colorFacade.value = ''
        calc.colorFacadeHex.value = ''
        calc.colorFacadeImage.value = ''
      }
    } catch {
      if (isCurrent() && revision === selectionRevision) saveError.value = 'Не удалось загрузить палитру материала. Повторите выбор.'
      return
    }
  }
  if (String(calc.idFacade.value) !== String(row.id) || Number(calc.thicknessFacade.value) !== Number(row.widthFence)) calc.invalidateFillingPreview('facade')
  needsSave.value = true
  selectedRow.value = row
  if (await persistSelection(row)) await doRecalculate()
}

async function deselectRow() {
  if (saving.value) return
  selectionRevision += 1
  if (calc.idFacade.value) calc.invalidateFillingPreview('facade')
  needsSave.value = true
  selectedRow.value = null
  calc.reliefFacadeImage.value = ''
  calc.manufacturerFacadeId.value = null
  calc.materialSupplierFacade.value = ''
  calc.idFacade.value = ''
  clearGap()
  applyYardSnapshot(calc, { layingYardCode: null, gapYardMm: null, numberOfSticksYard: null })
  void persistSelection(null)
}

async function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  if (appearanceFields.value?.validate?.() === false) return
  if (await validateBeforeLeave()) emit('next')
}

onMounted(async () => {
  calc.setActivePage('page2_facade_fence')
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
      <span class="text-3xl font-bold flex-1 text-center">Фасад — материал</span>
      <B24Button label="Далее" :disabled="saving" color="air-secondary" @click="onContinue" />
    </div>

    <p v-if="yardCleared" role="status" class="text-center text-sm">Выберите материал двора заново: его ширина должна совпадать с фасадом.</p>
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
      side="facade"
      :show-manufacturer="false"
      :disabled="saving"
      @change="saveAppearance"
    />

      </template>
    </FenceMaterialTable>
  </div>
</template>
