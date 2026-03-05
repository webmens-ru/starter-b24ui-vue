<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getProfnastilTable, saveWicketData, recalculate, type ProfnastilRow, type SidingPagination } from '../../app/api/wicket'
import FilterDropdown from './FilterDropdown.vue'

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

const FILTER_URL = `/api/wicket/type${calc.modelId.value}/get-filter-data`

const filters = reactive({
  companies: [] as string[],
  materials: [] as string[],
  thickness: [] as string[],
  colors:    [] as string[],
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

function restoreFromCalc(): ProfnastilRow | null {
  if (!calc.id_facade.value) return null
  return {
    id:            calc.id_facade.value,
    company:       calc.material_supplier_facade.value,
    material:      calc.material_facade.value,
    thickness:     calc.thickness_facade.value,
    typeOfCoating: calc.type_of_coating_facade.value,
    color:         calc.color_facade.value,
  }
}

async function save(row: ProfnastilRow) {
  calc.id_facade.value                = row.id
  calc.material_supplier_facade.value = row.company
  calc.material_facade.value          = row.material
  calc.form_facade.value              = ''
  calc.thickness_facade.value         = row.thickness
  calc.type_of_coating_facade.value   = row.typeOfCoating
  calc.color_facade.value             = row.color

  calc.updateOrCreateBlock('Заполнение (фасад)', [
    { name: 'Производитель материала', value: row.company },
    { name: 'Материал',                value: row.material },
    { name: 'Толщина листа',           value: row.thickness },
    { name: 'Тип покрытия',            value: row.typeOfCoating },
    { name: 'Цвет',                    value: row.color },
  ])

  try {
    await saveWicketData({
      calculation_number:       calc.number.value,
      id_facade:                row.id,
      material_supplier_facade: row.company,
      material_facade:          row.material,
      thickness_facade:         row.thickness,
      type_of_coating_facade:   row.typeOfCoating,
      color_facade:             row.color,
      model_id:                 calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
  }
}

async function doRecalculate() {
  if (!calc.price_retail.value) return
  try {
    const result = await recalculate({
      calculation_number: calc.number.value,
      product_type:       calc.productType.value,
      model:              calc.model.value,
      model_id:           calc.modelId.value,
    })
    calc.updatePriceBlock(result.price_dealer, result.price_retail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

async function selectRow(row: ProfnastilRow) {
  selectedRow.value = row
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.id_facade.value = ''
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

onMounted(async () => {
  calc.setActivePage('page2_facade_profnastil')
  const saved = restoreFromCalc()
  if (saved) {
    selectedRow.value = saved
    await save(saved)
  }
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

    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold flex-1 text-center">Заполнение (фасад)</span>
      <B24Button label="Далее"  color="air-secondary" @click="onContinue" />
    </div>

    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <FilterDropdown
        label="Производитель материала"
        :url="FILTER_URL"
        data-key="company"
        v-model="filters.companies"
      />
      <FilterDropdown
        label="Материал"
        :url="FILTER_URL"
        data-key="material"
        v-model="filters.materials"
      />
      <FilterDropdown
        label="Толщина листа"
        :url="FILTER_URL"
        data-key="thickness"
        v-model="filters.thickness"
      />
      <FilterDropdown
        label="Цвет"
        :url="FILTER_URL"
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
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цвет</th>
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
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.thickness }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.color }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.color }}</td>
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
