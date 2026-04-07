<script setup lang="ts">
import { computed } from 'vue'

type MenuItem = { url: string; page: string; label: string }
type ItemState = 'active' | 'visited' | 'default'

const props = defineProps<{
  menuItems: MenuItem[]
  activePage: string
  visitedPages: string[]
  isPageAccessible: (page: string) => boolean
  /** Страницы с неполным заполнением — подсвечиваются красной обводкой */
  incompletePages?: string[]
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: MenuItem): void
}>()

const stateMap = computed<Map<string, ItemState>>(() => {
  const visited = new Set(props.visitedPages)
  return new Map(props.menuItems.map(item => [
    item.page,
    item.page === props.activePage ? 'active'
      : visited.has(item.page) ? 'visited'
      : 'default',
  ]))
})

const incompleteSet = computed(() => new Set(props.incompletePages ?? []))

const colorMap = {
  active:  'air-primary',
  visited: 'air-secondary',
  default: 'air-tertiary-no-accent',
} as const

const dotClassMap: Record<ItemState, string> = {
  active:  'bg-blue-500 ring-2 ring-blue-200 text-white',
  visited: 'bg-gray-400 text-white',
  default: 'bg-gray-200 text-gray-400',
}

const inactiveB24ui = {
  base:         '!text-(--ui-color-text-primary)',
  leadingIcon:  '!text-(--ui-color-text-primary)',
  trailingIcon: '!text-(--ui-color-text-primary)',
}
</script>

<template>
  <!-- Expanded mode -->
  <div v-if="!collapsed" class="flex flex-col gap-1 px-2 py-1">
    <B24Button
      v-for="item in menuItems"
      :key="item.page"
      :label="item.label"
      :color="colorMap[stateMap.get(item.page)!]"
      :disabled="!isPageAccessible(item.page)"
      :b24ui="stateMap.get(item.page) !== 'active' ? inactiveB24ui : {}"
      :class="{ 'ring-2 ring-red-500 ring-inset': incompleteSet.has(item.page) }"
      block
      size="sm"
      @click="emit('select', item)"
    />
  </div>

  <!-- Collapsed mode: numbered dots -->
  <div v-else class="flex flex-col items-center gap-1.5 px-1 py-1">
    <button
      v-for="(item, index) in menuItems"
      :key="item.page"
      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      :class="[
        dotClassMap[stateMap.get(item.page)!],
        incompleteSet.has(item.page) && 'ring-2 ring-red-500 ring-inset'
      ]"
      :disabled="!isPageAccessible(item.page)"
      :title="item.label"
      @click="emit('select', item)"
    >
      {{ index + 1 }}
    </button>
  </div>
</template>
