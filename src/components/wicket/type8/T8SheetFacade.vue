<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getSheetTable, saveWicketData, recalculate, type SheetRow, type SidingPagination } from '../../../app/api/wicket'
import T8FilterDropdown from './T8FilterDropdown.vue'
import { wicketSheetFilterDataUrl } from '../shared/wicketMaterialApiPaths'

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

const sheetFilterDataUrl = computed(() => wicketSheetFilterDataUrl(calc.modelId.value))

const filters = reactive({
  companies:     [] as string[],
  materials:     [] as string[],
  thickness:     [] as string[],
  width:         [] as string[],
  typeOfCoating: [] as string[],
  colors:        [] as string[],
})

const rows         = ref<SheetRow[]>([])
const selectedRow  = ref<SheetRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getSheetTable(calc.modelId.value, filters, page)
    rows.value        = result.table
    pagination.value  = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    console.warn('getSheetTable недоступен:', e)
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

watch(() => calc.idFacade.value, async (val) => {
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

function restoreFromCalc(): SheetRow | null {
  if (!calc.idFacade.value) return null
  return {
    id:            calc.idFacade.value,
    company:       calc.materialSupplierFacade.value,
    material:      calc.materialFacade.value,
    thickness:     calc.thicknessFacade.value,
    width:         '',
    typeOfCoating: calc.typeOfCoatingFacade.value,
    color:         calc.colorFacade.value,
  }
}

async function save(row: SheetRow) {
  calc.idFacade.value                = row.id
  calc.materialSupplierFacade.value = row.company
  calc.materialFacade.value          = row.material
  calc.formFacade.value              = ''
  calc.thicknessFacade.value         = String(row.thickness)
  calc.typeOfCoatingFacade.value   = row.typeOfCoating
  calc.colorFacade.value             = row.color

  calc.updateOrCreateBlock('Заполнение (фасад)', [
    { name: 'Производитель материала', value: row.company },
    { name: 'Материал',                value: row.material },
    { name: 'Толщина листа',           value: String(row.thickness) },
    { name: 'Ширина',                  value: String(row.width) },
    { name: 'Тип покрытия',            value: row.typeOfCoating },
    { name: 'Цвет',                    value: row.color },
  ])

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      idFacade:                row.id,
      materialFacadeGlob:     calc.materialFacadeGlob.value,
      materialSupplierFacade: row.company,
      materialFacade:          row.material,
      thicknessFacade:         String(row.thickness),
      typeOfCoatingFacade:   row.typeOfCoating,
      colorFacade:             row.color,
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
      productType:       calc.productType.value,
      model:              calc.model.value,
      modelId:           calc.modelId.value,
    })
    calc.updatePriceBlock(result.priceDealer, result.priceRetail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

async function selectRow(row: SheetRow) {
  selectedRow.value = row
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.idFacade.value = ''
}

function isSelected(row: SheetRow) {
  return selectedRow.value?.id === row.id
}

function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  emit('next')
}

onMounted(async () => {
  calc.setActivePage('page2_facade_sheet')
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
      <span class="text-3xl font-bold flex-1 text-center">Заполнение (фасад)</span>
      <B24Button label="Далее"  color="air-secondary" @click="onContinue" />
    </div>

    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <T8FilterDropdown
        label="Производитель материала"
        :url="sheetFilterDataUrl"
        data-key="company"
        v-model="filters.companies"
      />
      <T8FilterDropdown
        label="Материал"
        :url="sheetFilterDataUrl"
        data-key="material"
        v-model="filters.materials"
      />
      <T8FilterDropdown
        label="Толщина листа"
        :url="sheetFilterDataUrl"
        data-key="thickness"
        v-model="filters.thickness"
      />
      <T8FilterDropdown
        label="Ширина"
        :url="sheetFilterDataUrl"
        data-key="width"
        v-model="filters.width"
      />
      <T8FilterDropdown
        label="Тип покрытия"
        :url="sheetFilterDataUrl"
        data-key="typeOfCoating"
        v-model="filters.typeOfCoating"
      />
      <T8FilterDropdown
        label="Цвет"
        :url="sheetFilterDataUrl"
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
            <th class="border border-gray-300 px-2 py-1 text-left">Толщина листа</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Ширина</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цвет</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цена за м²</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableLoading">
            <td colspan="8" class="text-center py-4 text-gray-400">Загрузка...</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.thickness }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.width }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.color }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.priceM2 ?? '' }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.thickness }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.width }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.color }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.priceM2 ?? '' }}</td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="8" class="text-center py-4 text-gray-400">Нет данных</td>
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
