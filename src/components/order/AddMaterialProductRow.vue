<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { getMaterialItems, getMaterialTypes, type MaterialItemDto, type MaterialTypeDto } from '../../app/api/wicket'
import type { ProductRowInstallationRole } from '../../app/api/productRows'

export interface StandaloneMaterialSubmission {
  materialItemId: number
  quantity: number
  installationRole: ProductRowInstallationRole | null
  customerOwned: boolean
}

defineProps<{ orderId: number, disabled?: boolean }>()

const emit = defineEmits<{
  submit: [submission: StandaloneMaterialSubmission]
  close: []
}>()

const types = ref<MaterialTypeDto[]>([])
const items = ref<MaterialItemDto[]>([])
const selectedTypeCode = ref('')
const selectedMaterialItemId = ref<number | null>(null)
const quantity = ref(1)
const customerOwned = ref(false)
const withInstallation = ref(false)
const query = ref('')
const loadingTypes = ref(false)
const loadingItems = ref(false)
const errorMessage = ref<string | null>(null)
let latestItemsLoad = 0

const installationRoleByType: Record<string, ProductRowInstallationRole> = {
  lock_component: 'lock_component_installation',
  skud: 'skud_installation',
  door_closer: 'door_closer_installation',
  bumper: 'bumper_installation',
}

const activeTypes = computed(() => types.value.filter(type => (
  type as MaterialTypeDto & { isActive?: boolean }
).isActive !== false))

const filteredItems = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase('ru-RU')
  if (normalized === '') return items.value
  return items.value.filter(item => `${item.name} ${item.article}`.toLocaleLowerCase('ru-RU').includes(normalized))
})

const selectedItem = computed(() => items.value.find(item => item.id === selectedMaterialItemId.value) ?? null)
const installationRole = computed(() => installationRoleByType[selectedTypeCode.value] ?? null)

async function loadTypes(): Promise<void> {
  loadingTypes.value = true
  errorMessage.value = null
  try {
    types.value = await getMaterialTypes()
  } catch {
    errorMessage.value = 'Не удалось загрузить типы материалов'
  } finally {
    loadingTypes.value = false
  }
}

async function loadItems(typeCode: string): Promise<void> {
  const loadId = ++latestItemsLoad
  items.value = []
  selectedMaterialItemId.value = null
  if (typeCode === '') return
  loadingItems.value = true
  errorMessage.value = null
  try {
    const nextItems = await getMaterialItems({ typeCode, productType: 'wicket', modelId: 1 })
    if (loadId !== latestItemsLoad || selectedTypeCode.value !== typeCode) return
    items.value = nextItems
  } catch {
    if (loadId === latestItemsLoad && selectedTypeCode.value === typeCode) errorMessage.value = 'Не удалось загрузить материалы'
  } finally {
    if (loadId === latestItemsLoad && selectedTypeCode.value === typeCode) loadingItems.value = false
  }
}

function submit(): void {
  if (!selectedItem.value || !Number.isInteger(quantity.value) || quantity.value <= 0) return
  if (withInstallation.value && installationRole.value === null) return
  emit('submit', {
    materialItemId: selectedItem.value.id,
    quantity: quantity.value,
    installationRole: withInstallation.value ? installationRole.value : null,
    customerOwned: customerOwned.value,
  })
}

watch(selectedTypeCode, typeCode => { void loadItems(typeCode) })
onMounted(() => { void loadTypes() })
</script>

<template>
  <section role="dialog" aria-modal="true" aria-labelledby="add-material-title" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 id="add-material-title" class="text-lg font-semibold text-gray-800">Добавить материал</h2>
        <p class="mt-1 text-sm text-gray-500">Цены определяются сервером после добавления.</p>
      </div>
      <button type="button" aria-label="Закрыть добавление материала" :disabled="disabled" @click="emit('close')">×</button>
    </div>
    <p v-if="errorMessage" role="alert" class="mt-3 text-sm text-red-700">{{ errorMessage }}</p>
    <div class="mt-4 grid gap-3">
      <label class="text-sm text-gray-700">Тип материала
        <select v-model="selectedTypeCode" aria-label="Тип материала" :disabled="disabled || loadingTypes" class="mt-1 block w-full rounded border border-gray-300 px-3 py-2">
          <option value="">Выберите тип</option>
          <option v-for="type in activeTypes" :key="type.id" :value="type.code">{{ type.name }}</option>
        </select>
      </label>
      <label class="text-sm text-gray-700">Поиск
        <input v-model="query" type="search" aria-label="Поиск материала" :disabled="disabled || loadingItems" class="mt-1 block w-full rounded border border-gray-300 px-3 py-2">
      </label>
      <label class="text-sm text-gray-700">Материал
        <select v-model.number="selectedMaterialItemId" aria-label="Материал" :disabled="disabled || loadingItems || selectedTypeCode === ''" class="mt-1 block w-full rounded border border-gray-300 px-3 py-2">
          <option :value="null">Выберите материал</option>
          <option v-for="item in filteredItems" :key="item.id" :value="item.id">{{ item.name }}<template v-if="item.article"> · {{ item.article }}</template></option>
        </select>
      </label>
      <label class="text-sm text-gray-700">Количество
        <input v-model.number="quantity" type="number" min="1" step="1" aria-label="Количество материала" :disabled="disabled" class="mt-1 block w-28 rounded border border-gray-300 px-3 py-2">
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="customerOwned" type="checkbox" aria-label="Материал заказчика" :disabled="disabled">
        Материал заказчика
      </label>
      <label v-if="installationRole" class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="withInstallation" type="checkbox" aria-label="Добавить установку" :disabled="disabled">
        Добавить установку
      </label>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded border border-gray-300 px-4 py-2" :disabled="disabled" @click="emit('close')">Отмена</button>
        <button type="button" class="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40" aria-label="Добавить материал в заказ" :disabled="disabled || !selectedItem" @click="submit">Добавить</button>
      </div>
    </div>
  </section>
</template>
