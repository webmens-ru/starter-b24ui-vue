<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getSidingTable, saveWicketData, recalculate, type SidingRow } from '../../app/api/wicket'
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
const COMPANY_URL = `/wicket/type${calc.modelId.value}/get-filter-data`
const SIDING_URL  = `/wicket/type${calc.modelId.value}/get-filter-data-siding`

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

async function loadTable() {
  tableLoading.value = true
  try {
    const result = await getSidingTable(calc.modelId.value, filters)
    rows.value = result.table
  } catch (e) {
    console.warn('getSidingTable недоступен:', e)
    rows.value = []
  } finally {
    tableLoading.value = false
  }
}

watch(filters, loadTable, { deep: true })

// ─── Восстановление сохранённой строки ───────────────────────────────────────
function restoreFromCalc(): SidingRow | null {
  if (!calc.id_facade.value) return null
  return {
    id:            calc.id_facade.value,
    company:       calc.material_supplier_facade.value,
    material:      calc.material_facade.value,
    form:          calc.form_facade.value,
    typeOfCoating: calc.type_of_coating_facade.value,
    color:         calc.color_facade.value,
  }
}

// ─── Сохранение ──────────────────────────────────────────────────────────────
async function save(row: SidingRow) {
  // Синхронизируем calc-поля
  calc.id_facade.value                = row.id
  calc.material_supplier_facade.value = row.company
  calc.material_facade.value          = row.material
  calc.form_facade.value              = row.form
  calc.type_of_coating_facade.value   = row.typeOfCoating
  calc.color_facade.value             = row.color

  // Блок данных
  calc.updateOrCreateBlock('Заполнение (фасад)', [
    { name: 'Производитель материала', value: row.company },
    { name: 'Материал',                value: row.material },
    { name: 'Форма',                   value: row.form },
    { name: 'Тип покрытия',            value: row.typeOfCoating },
    { name: 'Цвет',                    value: row.color },
  ])

  try {
    await saveWicketData({
      calculation_number:        calc.number.value,
      id_facade:                 row.id,
      material_supplier_facade:  row.company,
      material_facade:           row.material,
      form_facade:               row.form,
      type_of_coating_facade:    row.typeOfCoating,
      color_facade:              row.color,
      model_id:                  calc.modelId.value,
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

// ─── Выбор строки ────────────────────────────────────────────────────────────
async function selectRow(row: SidingRow) {
  selectedRow.value = row
  await save(row)
  await doRecalculate()
}

function deselectRow() {
  selectedRow.value = null
  calc.id_facade.value = ''
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
  calc.setActivePage('page2')
  const saved = restoreFromCalc()
  if (saved) {
    selectedRow.value = saved
    await save(saved)
  }
  // Таблица загрузится через watch(filters) при первом рендере (пустые фильтры)
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
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold">Заполнение (фасад)</span>
      <B24Button label="Далее"  color="air-secondary" @click="onContinue" />
    </div>

    <!-- Фильтры -->
    <div class="flex gap-2 flex-wrap sticky top-0 z-10 bg-gray-50 py-2 px-1 shadow-sm rounded">
      <FilterDropdown
        label="Производитель материала"
        :url="COMPANY_URL"
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
    <div class="overflow-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-[52px] z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Производитель материала</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Форма</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Цвет</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
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
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.company }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.form }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.color }}</td>
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input
                type="checkbox"
                checked
                class="accent-blue-600"
                @change="deselectRow"
              />
            </td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.id"
            :class="isSelected(row) ? 'bg-blue-100' : 'hover:bg-gray-50'"
          >
            <td class="border border-gray-300 px-2 py-1">{{ row.company }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.form }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ row.color }}</td>
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input
                type="checkbox"
                :checked="isSelected(row)"
                class="accent-blue-600"
                @change="isSelected(row) ? deselectRow() : selectRow(row)"
              />
            </td>
          </tr>

          <tr v-if="!tableLoading && rows.length === 0 && !selectedRow">
            <td colspan="6" class="text-center py-4 text-gray-400">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
