<script setup lang="ts">
import './catalogTable.css'
import { formatMaterialPrice } from './materialPrice'
import { computed } from 'vue'
import type { FenceRow, SidingPagination } from '../../../app/api/wicket'
import T3FilterDropdown from '../type3/T3FilterDropdown.vue'
import { wicketFenceFilterDataUrl } from './wicketMaterialApiPaths'

type Filters = { fenceForm?: string[]; profileIds?: string[]; typeOfCoating: string[] }
const props = defineProps<{
  modelId: string | number
  rows: FenceRow[]
  selectedRow: FenceRow | null
  loading: boolean
  filters: Filters
  pagination: SidingPagination
}>()
const emit = defineEmits<{
  (event: 'select', row: FenceRow): void
  (event: 'deselect'): void
  (event: 'page', page: number): void
  (event: 'update:filters', filters: Filters): void
}>()
const fenceFilterDataUrl = computed(() => wicketFenceFilterDataUrl(props.modelId))
function updateFilter(key: keyof Filters, values: string[]): void {
  emit('update:filters', { ...props.filters, [key]: values })
}
function isSelected(row: FenceRow): boolean {
  return props.selectedRow !== null && String(props.selectedRow.id) === String(row.id)
}
function selectRow(row: FenceRow): void { emit('select', row) }
function deselectRow(): void { emit('deselect') }
function goToPage(page: number): void { emit('page', page) }
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 flex-wrap bg-gray-50 py-2 px-1 rounded border border-gray-200">
      <T3FilterDropdown label="Форма" :url="fenceFilterDataUrl" data-key="fenceForm"
        :model-value="filters.fenceForm ?? []" @update:model-value="updateFilter('fenceForm', $event)" />
      <T3FilterDropdown
        label="Тип"
        :url="fenceFilterDataUrl"
        data-key="profile"
        :model-value="filters.profileIds ?? []" @update:model-value="updateFilter('profileIds', $event)"
      />
      <T3FilterDropdown
        label="Тип покрытия"
        :url="fenceFilterDataUrl"
        data-key="typeOfCoating"
        :model-value="filters.typeOfCoating" @update:model-value="updateFilter('typeOfCoating', $event)"
      />
    </div>

    <slot name="appearance" />

    <div class="catalog-table-container">
      <table class="catalog-table">
        <thead class="sticky top-0 z-[9]">
          <tr>
            <th scope="col" class="catalog-table-choice">Выбрать</th>
            <th scope="col" class="text-left">Форма</th>
            <th scope="col" class="text-left">Тип</th>
            <th scope="col" class="text-left">Тип покрытия</th>
            <th scope="col" class="text-right whitespace-nowrap">Цена за пог. м</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="text-center py-4 text-gray-400">Загрузка...</td>
          </tr>

          <tr
            v-if="selectedRow && !rows.some(isSelected)"
            class="selected catalog-table-hoverable"
            @click="deselectRow"
          >
            <td class="text-center">
              <input type="checkbox" @click.stop checked class="accent-blue-600" @change="deselectRow" />
            </td>
            <td>{{ selectedRow.fenceFormName }}</td>
            <td class="font-semibold">{{ selectedRow.profileMarking ?? selectedRow.material ?? '—' }}</td>
            <td>{{ selectedRow.typeOfCoating }}</td>
            <td class="text-right whitespace-nowrap">{{ formatMaterialPrice(selectedRow.price) }}</td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.id"
            class="catalog-table-hoverable"
            :class="{ selected: isSelected(row) }"
            @click="isSelected(row) ? deselectRow() : selectRow(row)"
          >
            <td class="text-center">
              <input
                type="checkbox"
                @click.stop
                :checked="isSelected(row)"
                class="accent-blue-600"
                @change="isSelected(row) ? deselectRow() : selectRow(row)"
              />
            </td>
            <td>{{ row.fenceFormName }}</td>
            <td class="font-semibold">{{ row.profileMarking ?? row.material ?? '—' }}</td>
            <td>{{ row.typeOfCoating }}</td>
            <td class="text-right whitespace-nowrap">{{ formatMaterialPrice(row.price) }}</td>
          </tr>

          <tr v-if="!loading && rows.length === 0 && !selectedRow">
            <td colspan="5" class="text-center py-4 text-gray-400">Нет данных</td>
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
