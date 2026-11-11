<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceTable, saveWicketData, recalculate, type FenceRow, type SidingPagination } from '../../../app/api/wicket'
import { inheritedYardLaying, applyYardSnapshot } from './fenceLayingState'
import T3FilterDropdown from './T3FilterDropdown.vue'
import { wicketFenceFilterDataUrl } from '../shared/wicketMaterialApiPaths'

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

const fenceFilterDataUrl = computed(() => wicketFenceFilterDataUrl(calc.modelId.value))

const filters = reactive({
  companies:     [] as string[],
  materials:     [] as string[],
  widthFence:    [] as string[],
  typeOfCoating: [] as string[],
})

const rows         = ref<FenceRow[]>([])
const selectedRow  = ref<FenceRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getFenceTable(calc.modelId.value, { ...filters, widthFence: widthLocked.value ? [String(calc.thicknessFacade.value)] : filters.widthFence }, page)
    rows.value        = result.table
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    console.warn('getFenceTable недоступен:', e)
    rows.value = []
  } finally {
    tableLoading.value = false
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
  calc.materialSupplierYard.value = row.company
  calc.materialYard.value          = row.material
  calc.formYard.value              = ''
  calc.thicknessYard.value         = String(row.widthFence)
  calc.typeOfCoatingYard.value   = row.typeOfCoating
  calc.colorYard.value             = ''
  calc.colorYardHex.value          = ''
  calc.colorYardImage.value        = ''
  calc.reliefYardImage.value       = row.profileImage ?? ''

  const yardSnapshot = await inheritedYardLaying(calc, inheritedMode.value, inheritedGap.value)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  calc.updateOrCreateBlock('fillingYard', [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: row.company },
    { paramCode: 'material', name: 'Материал',                value: row.material },
    { paramCode: 'fenceWidth', name: 'Ширина штакетника',       value: String(row.widthFence) },
    { paramCode: 'coating', name: 'Тип покрытия',            value: row.typeOfCoating },
  ], 'Заполнение (двор)')

  try {
    applyYardSnapshot(calc, yardSnapshot)
    await saveWicketData({
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true,
      idYard:                row.id,
      ...yardSnapshot,
      materialYardGlob:     calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      materialSupplierYard: row.company,
      materialYard:           row.material,
      widthFenceYard:         String(row.widthFence),
      typeOfCoatingYard:   row.typeOfCoating,
      colorYard:             null,
    })
    if (isCurrent()) applyYardSnapshot(calc, yardSnapshot)
  } catch (e) {
    throw e
  }
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
      materialSupplierYard: null, materialYard: null, typeOfCoatingYard: null, colorYard: null,
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

async function selectRow(row: FenceRow) {
  if (saving.value) return
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
  applyYardSnapshot(calc, { idYard: null, widthFenceYard: null, layingYardCode: inheritedMode.value, gapYardMm: inheritedGap.value, numberOfSticksYard: null })
  void persistSelection(null)
}

function isSelected(row: FenceRow) {
  return selectedRow.value?.id === row.id
}

async function onContinue() {
  if (!selectedRow.value || (widthLocked.value && Number(selectedRow.value.widthFence) !== Number(calc.thicknessFacade.value))) {
    openModal('Вы не заполнили этот блок!')
    return
  }
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

    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <T3FilterDropdown
        label="Производитель материала"
        :url="fenceFilterDataUrl"
        data-key="company"
        v-model="filters.companies"
      />
      <T3FilterDropdown
        label="Материал"
        :url="fenceFilterDataUrl"
        data-key="material"
        v-model="filters.materials"
      />
      <T3FilterDropdown
        v-if="!widthLocked"
        label="Ширина штакетника"
        :url="fenceFilterDataUrl"
        data-key="widthFence"
        v-model="filters.widthFence"
      />
      <T3FilterDropdown
        label="Тип покрытия"
        :url="fenceFilterDataUrl"
        data-key="typeOfCoating"
        v-model="filters.typeOfCoating"
      />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Производитель материала</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Ширина штакетника</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цена</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableLoading">
            <td colspan="6" class="text-center py-4 text-gray-400">Загрузка...</td>
          </tr>

          <tr
            v-if="selectedRow && !rows.find(r => r.id === selectedRow!.id)"
            class="bg-blue-100"
          >
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox" checked class="accent-blue-600" @change="deselectRow" />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.company }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.widthFence }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.price ?? '' }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.company }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.widthFence }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.price ?? '' }}</td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="6" class="text-center py-4 text-gray-400">Нет данных</td>
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

  </div>
</template>
