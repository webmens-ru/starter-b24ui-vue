<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { getFilterOptions, type FilterOptionItem } from '../../../app/api/wicket'

const props = defineProps<{
  label: string
  url: string
  dataKey: string
  searchPlaceholder?: string
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const isOpen  = ref(false)
const search  = ref('')
const options = ref<FilterOptionItem[]>([])
const loaded  = ref(false)
const loading = ref(false)

function onDocumentClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

watch(isOpen, (open) => {
  if (open) document.addEventListener('mousedown', onDocumentClick)
  else document.removeEventListener('mousedown', onDocumentClick)
})

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick))

function normalizeOptions(
  items: Array<{ id: string | number; name?: string | number | null }>,
): FilterOptionItem[] {
  return (items ?? []).map((o) => ({
    id: String(o.id),
    name: String(o.name ?? ''),
  }))
}

async function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value && !loaded.value) {
    loading.value = true
    try {
      const data = await getFilterOptions(props.url, props.dataKey)
      options.value = normalizeOptions(data[props.dataKey] ?? [])
      loaded.value = true
    } catch (e) {
      console.warn('getFilterOptions недоступен:', e)
    } finally {
      loading.value = false
    }
  }
}

const filteredOptions = computed(() =>
  options.value.filter((o) =>
    o.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

function onCheck(id: string, checked: boolean) {
  const next = [...props.modelValue]
  if (checked) {
    if (!next.some((v) => String(v) === id)) next.push(id)
  } else {
    const i = next.findIndex((v) => String(v) === id)
    if (i > -1) next.splice(i, 1)
  }
  emit('update:modelValue', next)
}

function isChecked(id: string): boolean {
  return props.modelValue.some((v) => String(v) === id)
}
</script>

<template>
  <div ref="containerRef" class="flex-1 min-w-max relative">
    <button
      type="button"
      class="w-full flex items-start justify-between gap-1 px-3 py-2.5 border border-gray-300 rounded bg-white text-base hover:bg-gray-50 transition-colors"
      @click="toggle"
    >
      <span class="text-left leading-tight whitespace-normal">{{ label }}</span>
      <span
        class="inline-block shrink-0 mt-1 w-0 h-0 border-l-4 border-r-4 border-l-transparent border-r-transparent border-t-4 border-t-gray-700 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full left-0 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 border-t-0 rounded-b z-50 shadow"
    >
      <div v-if="loading" class="px-2 py-1 text-xs text-gray-400">Загрузка...</div>
      <template v-else>
        <input
          v-model="search"
          type="text"
          :placeholder="searchPlaceholder ?? `Поиск ${label.toLowerCase()}`"
          class="w-full px-2 py-1 text-xs border-b border-gray-200 outline-none"
        />
        <ul class="list-none p-0 m-0">
          <li
            v-for="option in filteredOptions"
            :key="option.id"
            class="px-2 py-1"
          >
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                :value="option.id"
                :checked="isChecked(option.id)"
                class="accent-blue-600"
                @change="onCheck(option.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ option.name }}
            </label>
          </li>
          <li v-if="filteredOptions.length === 0" class="px-2 py-1 text-xs text-gray-400">
            Ничего не найдено
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>
