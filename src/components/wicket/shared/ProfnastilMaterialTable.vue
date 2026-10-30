<script setup lang="ts">
import { formatMaterialPrice } from './materialPrice'
import { computed } from 'vue'
import type { ProfnastilRow, SidingPagination } from '../../../app/api/wicket'
import FilterDropdown from '../type1/FilterDropdown.vue'
import { wicketProfnastilFilterDataUrl } from './wicketMaterialApiPaths'

type Filters = { materials: string[]; typeOfCoating: string[] }
const props = defineProps<{
  modelId: string | number
  rows: ProfnastilRow[]
  selectedRow: ProfnastilRow | null
  loading: boolean
  filters: Filters
  pagination: SidingPagination
}>()
const emit = defineEmits<{
  (event: 'select', row: ProfnastilRow): void
  (event: 'deselect'): void
  (event: 'page', page: number): void
  (event: 'update:filters', filters: Filters): void
}>()
const profnastilFilterDataUrl = computed(() => wicketProfnastilFilterDataUrl(props.modelId))
function updateFilter(key: keyof Filters, values: string[]): void {
  emit('update:filters', { ...props.filters, [key]: values })
}
function isSelected(row: ProfnastilRow): boolean {
  return props.selectedRow !== null && String(props.selectedRow.id) === String(row.id)
}
function selectRow(row: ProfnastilRow): void { emit('select', row) }
function deselectRow(): void { emit('deselect') }
function goToPage(page: number): void { emit('page', page) }
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <FilterDropdown
        label="Материал"
        :url="profnastilFilterDataUrl"
        data-key="material"
        :model-value="filters.materials" @update:model-value="updateFilter('materials', $event)"
      />
      <FilterDropdown
        label="Тип покрытия"
        :url="profnastilFilterDataUrl"
        data-key="typeOfCoating"
        :model-value="filters.typeOfCoating" @update:model-value="updateFilter('typeOfCoating', $event)"
      />
    </div>

    <slot name="appearance" />

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Материал</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Тип покрытия</th>
            <th class="border border-gray-300 px-2 py-1 text-right whitespace-nowrap">Цена за м²</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="text-center py-4 text-gray-400">Загрузка...</td>
          </tr>

          <tr
            v-if="selectedRow && !rows.some(isSelected)"
            class="bg-blue-100"
          >
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox" checked class="accent-blue-600" @change="deselectRow" />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.material }}</td>
            <td class="border border-gray-300 px-2 py-1">{{ selectedRow.typeOfCoating }}</td>
            <td class="border border-gray-300 px-2 py-1 text-right whitespace-nowrap">{{ formatMaterialPrice(selectedRow.priceM2) }}</td>
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
            <td class="border border-gray-300 px-2 py-1 text-right whitespace-nowrap">{{ formatMaterialPrice(row.priceM2) }}</td>
          </tr>

          <tr v-if="!loading && rows.length === 0 && !selectedRow">
            <td colspan="4" class="text-center py-4 text-gray-400">Нет данных</td>
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
