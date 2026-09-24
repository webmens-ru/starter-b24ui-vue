<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
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

const colors       = ref<ProfnastilColorOption[]>([])
const colorLoading = ref(false)
const selectedColorId = ref<number | null>(null)

const selectedColor = computed<ProfnastilColorOption | undefined>(() =>
  colors.value.find((c) => c.id === selectedColorId.value),
)

const colorSelectItems = computed(() =>
  colors.value.map((c) => ({ id: c.id, label: c.name })),
)

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
  calc.colorYardId.value    = null
  calc.colorYard.value      = ''
  calc.colorYardHex.value   = ''
  calc.colorYardImage.value = ''
}

function applySelectedColor() {
  const color = selectedColor.value
  if (color) {
    calc.colorYardId.value    = color.id
    calc.colorYard.value      = color.name
    calc.colorYardHex.value   = color.hex ?? ''
    calc.colorYardImage.value = color.image ?? ''
  } else {
    calc.colorYardId.value    = null
    calc.colorYard.value      = ''
    calc.colorYardHex.value   = ''
    calc.colorYardImage.value = ''
  }
}

function buildSummaryParams() {
  const params: { name: string; value: string }[] = [
    { name: 'Материал',      value: selectedRow.value?.material ?? '' },
    { name: 'Толщина листа', value: String(selectedRow.value?.thickness ?? '') },
    { name: 'Тип покрытия',  value: selectedRow.value?.typeOfCoating ?? '' },
  ]
  if (calc.colorYard.value) {
    params.push({ name: 'Цвет', value: calc.colorYard.value })
  }
  return params
}

async function save(row: ProfnastilRow) {
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
      materialYardGlob:       calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      materialYard:             row.material,
      thicknessYard:           String(row.thickness),
      typeOfCoatingYard:     row.typeOfCoating,
      colorYardId:             calc.colorYardId.value,
      colorYard:               calc.colorYard.value,
      colorYardHex:            calc.colorYardHex.value,
      colorYardImage:          calc.colorYardImage.value,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
  }
}

async function saveColor() {
  applySelectedColor()
  calc.updateOrCreateBlock('Заполнение (двор)', buildSummaryParams())

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idYard:                  calc.idYard.value || null,
      materialYardGlob:       calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      materialYard:             calc.materialYard.value,
      thicknessYard:           calc.thicknessYard.value,
      typeOfCoatingYard:     calc.typeOfCoatingYard.value,
      colorYardId:             calc.colorYardId.value,
      colorYard:               calc.colorYard.value,
      colorYardHex:            calc.colorYardHex.value,
      colorYardImage:          calc.colorYardImage.value,
    })
  } catch (e) {
    console.warn('saveWicketData (цвет) недоступен:', e)
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
    calc.updatePriceBlock(result.priceDealer, result.priceRetail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

async function selectRow(row: ProfnastilRow) {
  selectedRow.value = row
  clearColor()
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  clearColor()
  calc.idYard.value = ''
  calc.materialYard.value = ''
  calc.thicknessYard.value = ''
  calc.typeOfCoatingYard.value = ''
  calc.coatingYardHex.value = ''
  calc.coatingYardImage.value = ''
  calc.reliefYardImage.value = ''
}

function isSelected(row: ProfnastilRow) {
  return selectedRow.value?.id === row.id
}

function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  if (colors.value.length > 0 && selectedColorId.value === null) {
    openModal('Вы не выбрали цвет!')
    return
  }
  emit('next')
}

function restoreFromCalc(): ProfnastilRow | null {
  if (!calc.idYard.value) return null
  if (calc.colorYardId.value) {
    selectedColorId.value = Number(calc.colorYardId.value)
  }
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
        :disabled="!selectedRow || colorLoading"
        class="w-full"
        @update:model-value="(id) => { selectedColorId = id ?? null; saveColor() }"
      />
      <span v-if="colorLoading" class="text-xs text-gray-400">Загрузка цветов...</span>
    </div>

  </div>
</template>
