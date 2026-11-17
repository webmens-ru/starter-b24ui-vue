<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getLamelTable, saveWicketData, recalculate, type LamelRow, type SidingPagination } from '../../../app/api/wicket'
import ColorSelectMenu from '../shared/ColorSelectMenu.vue'
import T4FilterDropdown from './T4FilterDropdown.vue'
import { wicketLamelFilterDataUrl } from '../shared/wicketMaterialApiPaths'

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

const lamelFilterDataUrl = computed(() => wicketLamelFilterDataUrl(calc.modelId.value))

const filters = reactive({
  companies:     [] as string[],
  materials:     [] as string[],
  width:         [] as string[],
  typeOfCoating: [] as string[],
  colors:        [] as string[],
})

const rows         = ref<LamelRow[]>([])
const selectedRow  = ref<LamelRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getLamelTable(calc.modelId.value, filters, page)
    rows.value        = result.table
    const selected = result.table.find(row => String(row.id) === String(calc.idYard.value))
    if (selected) selectedRow.value = selected
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    console.warn('getLamelTable недоступен:', e)
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

// Hydration restores the snapshot without writing it back to the server.
watch(() => calc.idYard.value, async () => {
  if (String(selectedRow.value?.id ?? '') !== String(calc.idYard.value ?? '')) {
    selectedRow.value = rows.value.find(row => String(row.id) === String(calc.idYard.value)) ?? restoreFromCalc()
    if (selectedRow.value && !selectedRow.value.colors) await loadSelectedPalette()
  }
}, { immediate: true })

async function loadSelectedPalette() {
  const selectedId = calc.idYard.value
  if (!selectedId) return
  try {
    const result = await getLamelTable(calc.modelId.value, {
      companies: [], materials: [], width: [], typeOfCoating: [], colors: [], materialIds: [selectedId],
    }, 1)
    if (String(calc.idYard.value) !== String(selectedId)) return
    const selected = result.table.find(row => String(row.id) === String(selectedId))
    if (selected) selectedRow.value = selected
  } catch (error) {
    console.warn('Не удалось загрузить палитру сохранённого материала:', error)
  }
}

const colorItems = computed(() => {
  const palette = selectedRow.value?.colors ?? []
  const currentId = calc.colorYardId.value
  if (currentId !== null && currentId !== '' && !palette.some(color => String(color.id) === String(currentId))) {
    return [...palette, { id: currentId, label: calc.colorYard.value || 'Сохранённый цвет', disabled: true }]
  }
  return palette
})
const selectedColorId = computed(() => calc.colorYardId.value ?? undefined)

async function selectColor(value: string | number | undefined) {
  const row = selectedRow.value
  const color = row?.colors?.find(item => String(item.id) === String(value))
  if (!row || !color) return
  calc.colorYardId.value = color.id
  calc.colorYard.value = color.label
  calc.colorYardHex.value = color.hex ?? ''
  calc.colorYardImage.value = color.image ?? ''
  await save(row)
  await doRecalculate()
}

function restoreFromCalc(): LamelRow | null {
  if (!calc.idYard.value) return null
  return {
    id:            calc.idYard.value,
    company:       calc.materialSupplierYard.value,
    material:      calc.materialYard.value,
    width:         calc.lamelWorkingWidthYard.value ?? '',
    workingWidth: calc.lamelWorkingWidthYard.value,
    typeOfCoating: calc.typeOfCoatingYard.value,
    color:         calc.colorYard.value,
  }
}

function applyDrawingMetadata(row: LamelRow) {
  const width = Number(row.workingWidth)
  calc.lamelWorkingWidthYard.value = row.workingWidth != null && Number.isFinite(width) && width > 0 ? width : null
  calc.reliefYardImage.value = row.reliefImage ?? ''
  calc.reliefYardAlongMode.value = row.reliefAlongMode ?? 'stretch'
  calc.reliefYardAcrossMode.value = row.reliefAcrossMode ?? 'repeat'
}

async function save(row: LamelRow) {
  applyDrawingMetadata(row)
  calc.idYard.value                = row.id
  calc.materialSupplierYard.value = row.company
  calc.materialYard.value          = row.material
  calc.formYard.value              = ''
  calc.thicknessYard.value         = String(row.width)
  calc.typeOfCoatingYard.value   = row.typeOfCoating
  // Colour labels are presentation snapshots; the FK is selected independently.

  calc.updateOrCreateBlock('fillingYard', [
    { paramCode: 'materialManufacturer', name: 'Производитель материала', value: row.company },
    { paramCode: 'material', name: 'Материал',                value: row.material },
    { paramCode: 'lamellaWidth', name: 'Ширина ламели',           value: String(row.width) },
    { paramCode: 'coating', name: 'Тип покрытия',            value: row.typeOfCoating },
    { paramCode: 'color', name: 'Цвет',                    value: calc.colorYard.value },
  ], 'Заполнение (двор)')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idYard:                row.id,
      materialYardGlob:     calc.materialYardGlob.value ?? calc.materialFacadeGlob.value,
      materialSupplierYard: row.company,
      materialYard:           row.material,
      typeOfCoatingYard:   row.typeOfCoating,
      colorYard:             calc.colorYard.value,
      colorYardId:           calc.colorYardId.value,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
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

async function selectRow(row: LamelRow) {
  const current = calc.colorYardId.value
  const validColor = row.colors?.find(color => String(color.id) === String(current))
  calc.colorYardId.value = validColor?.id ?? null
  calc.colorYard.value = validColor?.label ?? ''
  calc.colorYardHex.value = validColor?.hex ?? ''
  calc.colorYardImage.value = validColor?.image ?? ''
  applyDrawingMetadata(row)
  selectedRow.value = row
  calc.idYard.value = row.id
  if (!validColor) return
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.lamelWorkingWidthYard.value = null
  calc.reliefYardImage.value = ''
  calc.idYard.value = ''
  calc.colorYardId.value = null
  calc.colorYard.value = ''
  calc.colorYardHex.value = ''
  calc.colorYardImage.value = ''
}

function isSelected(row: LamelRow) {
  return selectedRow.value?.id === row.id
}

function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  if (!calc.colorYardId.value && !calc.colorYard.value) {
    openModal('Выберите цвет ламелей!')
    return
  }
  emit('next')
}

onMounted(async () => {
  calc.setActivePage('page2_yard_lamel')
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
      <T4FilterDropdown
        label="Производитель материала"
        :url="lamelFilterDataUrl"
        data-key="company"
        v-model="filters.companies"
      />
      <T4FilterDropdown
        label="Материал"
        :url="lamelFilterDataUrl"
        data-key="material"
        v-model="filters.materials"
      />
      <T4FilterDropdown
        label="Ширина ламели"
        :url="lamelFilterDataUrl"
        data-key="width"
        v-model="filters.width"
      />
      <T4FilterDropdown
        label="Тип покрытия"
        :url="lamelFilterDataUrl"
        data-key="typeOfCoating"
        v-model="filters.typeOfCoating"
      />
      <T4FilterDropdown
        label="Цвет"
        :url="lamelFilterDataUrl"
        data-key="color"
        v-model="filters.colors"
      />
    </div>

    <div v-if="selectedRow" class="max-w-lg">
      <label class="block text-sm mb-1">Цвет ламелей</label>
      <ColorSelectMenu :model-value="selectedColorId" :items="colorItems" placeholder="Выберите цвет" @update:model-value="selectColor" />
      <p v-if="!selectedColorId && calc.colorYard.value" class="text-sm text-gray-500">Сохранённый цвет: {{ calc.colorYard.value }}</p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Производитель материала</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Ширина ламели</th>
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
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.width }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.colorTitles?.join(', ') || selectedRow.color }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.width }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.colorTitles?.join(', ') || row.color }}</td>
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
