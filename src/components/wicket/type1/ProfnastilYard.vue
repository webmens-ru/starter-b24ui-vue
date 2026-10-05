<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import {
  getProfnastilTable,
  saveWicketData,
  recalculate,
  type ProfnastilRow,
  type SidingPagination,
} from '../../../app/api/wicket'
import FilterDropdown from './FilterDropdown.vue'
import FillingAppearanceFields from '../shared/FillingAppearanceFields.vue'
import { wicketProfnastilFilterDataUrl } from '../shared/wicketMaterialApiPaths'

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
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getProfnastilTable(calc.modelId.value, filters, page)
    rows.value        = result.table
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    console.warn('getProfnastilTable недоступен:', e)
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

function buildSummaryParams() {
  const params: { name: string; value: string }[] = [
    { name: 'Производитель материала', value: calc.materialSupplierYard.value },
    { name: 'Материал',      value: selectedRow.value?.material ?? '' },
    { name: 'Толщина листа', value: String(selectedRow.value?.thickness ?? '') },
    { name: 'Тип покрытия',  value: selectedRow.value?.typeOfCoating ?? '' },
  ]
  if (calc.colorYard.value) {
    params.push({ name: 'Цвет', value: calc.colorYard.value })
  }
  return params
}

async function save(row: ProfnastilRow): Promise<boolean> {
  calc.idYard.value                = row.id
  calc.materialYard.value          = row.material
  calc.formYard.value              = ''
  calc.thicknessYard.value         = String(row.thickness)
  calc.typeOfCoatingYard.value   = row.typeOfCoating
  calc.coatingYardHex.value        = row.coatingHex ?? ''
  calc.coatingYardImage.value      = row.coatingImage ?? ''
  calc.reliefYardImage.value       = row.reliefImage ?? ''

  calc.updateOrCreateBlock('Заполнение (двор)', buildSummaryParams())

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
  if (await save(selectedRow.value)) await doRecalculate()
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
  selectedRow.value = row
  if (await save(row)) await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.resetYardFilling()
}

function isSelected(row: ProfnastilRow) {
  return selectedRow.value?.id === row.id
}

function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  emit('next')
}

function restoreFromCalc(): ProfnastilRow | null {
  if (!calc.idYard.value) return null
  return {
    id:            calc.idYard.value,
    material:      calc.materialYard.value,
    thickness:     calc.thicknessYard.value,
    typeOfCoating: calc.typeOfCoatingYard.value,
    coatingHex:    calc.coatingYardHex.value,
    coatingImage:  calc.coatingYardImage.value,
    reliefImage:   calc.reliefYardImage.value,
  }
}

watch(() => calc.idYard.value, async (val) => {
  if (!val) return
  const saved = restoreFromCalc()
  if (saved && !selectedRow.value) {
    selectedRow.value = saved
    try {
      await save(saved)
    } catch (e) {
      console.warn('saveWicketData при восстановлении:', e)
    }
  }
}, { immediate: true })

onMounted(async () => {
  const page = calc.materialYardGlob.value === 'Профлист'
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
      <B24Button label="Далее"  color="air-secondary" @click="onContinue" />
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

    <FillingAppearanceFields
      v-if="selectedRow"
      :model-id="calc.modelId.value"
      material-group="Профлист"
      side="yard"
      @change="saveAppearance"
    />

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

  </div>
</template>
