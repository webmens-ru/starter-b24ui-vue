<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getSidingTable, saveWicketData, recalculate, type SidingRow, type SidingPagination } from '../../app/api/wicket'
import FilterDropdown from './FilterDropdown.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Фильтры ────────────────────────────────────────────────────────────────
const SIDING_URL = `/api/wicket/type${calc.modelId.value}/get-filter-data-siding`

const filters = reactive({
  companies:      [] as string[],
  materials:      [] as string[],
  form:           [] as string[],
  typeOfCoating:  [] as string[],
  colors:         [] as string[],
})

// ─── Таблица ─────────────────────────────────────────────────────────────────
const rows         = ref<SidingRow[]>([])
const selectedRow  = ref<SidingRow | null>(null)
const tableLoading = ref(false)
const currentPage  = ref(1)
const pagination   = ref<SidingPagination>({ page: 1, pageSize: 100, totalCount: 0, pageCount: 1 })

async function loadTable(page = currentPage.value) {
  tableLoading.value = true
  try {
    const result = await getSidingTable(calc.modelId.value, filters, page)
    rows.value       = result.table
    pagination.value = result.pagination
    currentPage.value = result.pagination.page
  } catch (e) {
    console.warn('getSidingTable недоступен:', e)
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
watch(() => calc.id_yard.value, async (val) => {
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

// ─── Восстановление сохранённой строки ───────────────────────────────────────
function restoreFromCalc(): SidingRow | null {
  if (!calc.id_yard.value) return null
  return {
    id:            calc.id_yard.value,
    company:       calc.material_supplier_yard.value,
    material:      calc.material_yard.value,
    form:          calc.form_yard.value,
    typeOfCoating: calc.type_of_coating_yard.value,
    color:         calc.color_yard.value,
  }
}

// ─── Сохранение ──────────────────────────────────────────────────────────────
async function save(row: SidingRow) {
  calc.id_yard.value                = row.id
  calc.material_supplier_yard.value = row.company
  calc.material_yard.value          = row.material
  calc.form_yard.value              = row.form
  calc.type_of_coating_yard.value   = row.typeOfCoating
  calc.color_yard.value             = row.color

  calc.updateOrCreateBlock('Заполнение (двор)', [
    { name: 'Производитель материала', value: row.company },
    { name: 'Материал',                value: row.material },
    { name: 'Форма',                   value: row.form },
    { name: 'Тип покрытия',            value: row.typeOfCoating },
    { name: 'Цвет',                    value: row.color },
  ])

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      id_yard:                  row.id,
      material_yard_glob:       calc.material_yard_glob.value ?? calc.material_facade_glob.value,
      material_supplier_yard:   row.company,
      material_yard:             row.material,
      form_yard:                row.form,
      type_of_coating_yard:     row.typeOfCoating,
      color_yard:               row.color,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
  }
}

async function doRecalculate() {
  if (!calc.price_retail.value) return
  try {
    const result = await recalculate({
      order_id: Number(calc.number.value),
      product_type:       calc.productType.value,
      model:              calc.model.value,
      model_id:           calc.modelId.value,
    })
    calc.updatePriceBlock(result.price_dealer, result.price_retail)
  } catch (e) {
    console.error('Ошибка пересчёта:', e)
  }
}

// ─── Выбор строки ────────────────────────────────────────────────────────────
async function selectRow(row: SidingRow) {
  selectedRow.value = row
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.id_yard.value = ''
}

function isSelected(row: SidingRow) {
  return selectedRow.value?.id === row.id
}

// ─── Навигация ────────────────────────────────────────────────────────────────
function onContinue() {
  if (!selectedRow.value) {
    openModal('Вы не заполнили этот блок!')
    return
  }
  emit('next')
}

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  const page = calc.material_yard_glob.value === 'Профлист'
    ? 'page2_yard_profnastil'
    : 'page2_yard_siding'
  calc.setActivePage(page)
  // Восстановление из calc — через watch(id_yard) с immediate: true
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

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold flex-1 text-center">Заполнение (двор)</span>
      <B24Button label="Далее"  color="air-secondary" @click="onContinue" />
    </div>

    <!-- Фильтры -->
    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <FilterDropdown
        label="Производитель материала"
        :url="SIDING_URL"
        data-key="company"
        v-model="filters.companies"
      />
      <FilterDropdown
        label="Материал"
        :url="SIDING_URL"
        data-key="material"
        v-model="filters.materials"
      />
      <FilterDropdown
        label="Форма"
        :url="SIDING_URL"
        data-key="form"
        v-model="filters.form"
      />
      <FilterDropdown
        label="Тип покрытия"
        :url="SIDING_URL"
        data-key="typeOfCoating"
        v-model="filters.typeOfCoating"
      />
      <FilterDropdown
        label="Цвет"
        :url="SIDING_URL"
        data-key="color"
        v-model="filters.colors"
      />
    </div>

    <!-- Таблица -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Производитель материала</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Форма</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цвет</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableLoading">
            <td colspan="6" class="text-center py-4 text-gray-400">Загрузка...</td>
          </tr>

          <!-- Сохранённая строка (если не попала в отфильтрованный список) -->
          <tr
            v-if="selectedRow && !rows.find(r => r.id === selectedRow!.id)"
            class="bg-blue-100"
          >
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input
                type="checkbox"
                checked
                class="accent-blue-600"
                @change="deselectRow"
              />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.company }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.form }}</td>
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
            <td class="border border-gray-300 px-2 py-1">{{ row.form }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.color }}</td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="6" class="text-center py-4 text-gray-400">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Пагинация -->
    <div
      v-if="pagination.pageCount > 1"
      class="flex items-center justify-between gap-3 pt-1"
    >
      <span class="text-sm text-gray-500">
        Записей: {{ pagination.totalCount }},
        страница {{ pagination.page }} из {{ pagination.pageCount }}
      </span>
      <div class="flex items-center gap-1">
        <button
          class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="pagination.page <= 1"
          @click="goToPage(1)"
        >«</button>
        <button
          class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >‹</button>
        <button
          class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="pagination.page >= pagination.pageCount"
          @click="goToPage(pagination.page + 1)"
        >›</button>
        <button
          class="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="pagination.page >= pagination.pageCount"
          @click="goToPage(pagination.pageCount)"
        >»</button>
      </div>
    </div>

  </div>
</template>
