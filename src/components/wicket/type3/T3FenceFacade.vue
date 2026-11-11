<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceTable, saveWicketData, recalculate, type FenceRow, type SidingPagination } from '../../../app/api/wicket'
import { reconcileFacadeLaying, inheritedYardLaying, applyYardSnapshot } from './fenceLayingState'
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
const yardCleared = ref(false)
const saving = ref(false)
const saveError = ref('')
const needsSave = ref(false)
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

const fenceFilterDataUrl = computed(() => wicketFenceFilterDataUrl(calc.modelId.value))

const filters = reactive({
  companies:     [] as string[],
  materials:     [] as string[],
  widthFence:    [] as string[],
  typeOfCoating: [] as string[],
  colors:        [] as string[],
})

const rows         = ref<FenceRow[]>([])
const selectedRow  = ref<FenceRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })
async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getFenceTable(calc.modelId.value, filters, page)
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

// Восстановление при загрузке данных (редактирование): id_facade может появиться после монтирования
watch(() => calc.idFacade.value, async (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    selectedRow.value = saved
  }
}, { immediate: true })

function clearGap() {
  calc.layingFacadeCode.value = null
  calc.gapId.value = null
  calc.gapName.value = null
  calc.numberOfSticks.value = null
}

function restoreFromCalc(): FenceRow | null {
  if (!calc.idFacade.value) return null
  return {
    id:            calc.idFacade.value,
    company:       calc.materialSupplierFacade.value,
    material:      calc.materialFacade.value,
    widthFence:    calc.thicknessFacade.value,
    typeOfCoating: calc.typeOfCoatingFacade.value,
    color:         calc.colorFacade.value,
  }
}

async function save(row: FenceRow) {
  if (!isCurrent()) throw new Error('Расчёт изменился')
  await reconcileFacadeLaying(calc, row.widthFence)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  const yardSnapshot = await inheritedYardLaying(calc, calc.layingFacadeCode.value ?? (calc.gapName.value === null ? null : calc.gapName.value === 0 ? 'butt' : 'gap'), calc.gapName.value, row.widthFence)
  if (!isCurrent()) throw new Error('Расчёт изменился')

  calc.idFacade.value                = row.id
  calc.materialSupplierFacade.value = row.company
  calc.materialFacade.value          = row.material
  calc.formFacade.value              = ''
  // widthFence сохраняем в поле thicknessFacade (общая колонка ассортимента)
  calc.thicknessFacade.value         = String(row.widthFence)
  calc.typeOfCoatingFacade.value   = row.typeOfCoating
  calc.colorFacade.value             = row.color

  calc.updateOrCreateBlock('fillingFacade', [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: row.company },
    { paramCode: 'material', name: 'Материал',                value: row.material },
    { paramCode: 'fenceWidth', name: 'Ширина штакетника',       value: String(row.widthFence) },
    { paramCode: 'coating', name: 'Тип покрытия',            value: row.typeOfCoating },
    { paramCode: 'color', name: 'Цвет',                    value: row.color },
  ], 'Заполнение (фасад)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true,
      ...yardSnapshot,
      idFacade:                row.id,
      layingFacadeCode: calc.layingFacadeCode.value,
      gapId: calc.gapId.value,
      gapName: calc.gapName.value,
      numberOfSticks: calc.numberOfSticks.value,
      materialFacadeGlob:     calc.materialFacadeGlob.value,
      materialSupplierFacade: row.company,
      materialFacade:          row.material,
      widthFenceFacade:        String(row.widthFence),
      typeOfCoatingFacade:   row.typeOfCoating,
      colorFacade:             row.color,
    })
    if (isCurrent()) {
      applyYardSnapshot(calc, yardSnapshot)
      yardCleared.value = yardSnapshot.idYard === null
    }
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
      ...calc.getBaseSavePayload(), applySharedFenceLaying: true, idFacade: null, widthFenceFacade: null,
      layingYardCode: null, gapYardMm: null, numberOfSticksYard: null,
      materialSupplierFacade: null, materialFacade: null, typeOfCoatingFacade: null, colorFacade: null,
      layingFacadeCode: null, gapId: null, gapName: null, numberOfSticks: null,
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
  needsSave.value = true
  selectedRow.value = row
  if (await persistSelection(row)) await doRecalculate()
}

async function deselectRow() {
  if (saving.value) return
  needsSave.value = true
  selectedRow.value = null
  calc.idFacade.value = ''
  clearGap()
  applyYardSnapshot(calc, { layingYardCode: null, gapYardMm: null, numberOfSticksYard: null })
  void persistSelection(null)
}

function isSelected(row: FenceRow) {
  return selectedRow.value?.id === row.id
}

async function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
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
      <span class="text-3xl font-bold flex-1 text-center">Фасад — материал и цвет</span>
      <B24Button label="Далее" :disabled="saving" color="air-secondary" @click="onContinue" />
    </div>

    <p v-if="yardCleared" role="status" class="text-center text-sm">Выберите материал двора заново: его ширина должна совпадать с фасадом.</p>
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
      <T3FilterDropdown
        label="Цвет"
        :url="fenceFilterDataUrl"
        data-key="color"
        v-model="filters.colors"
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
            <th class="border border-gray-300 px-2 py-1 text-left">Цвет</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цена</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableLoading">
            <td colspan="7" class="text-center py-4 text-gray-400">Загрузка...</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.color }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.color }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.price ?? '' }}</td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="7" class="text-center py-4 text-gray-400">Нет данных</td>
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
