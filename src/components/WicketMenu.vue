<script setup lang="ts">
type MenuItem = { url: string; page: string; label: string }

const props = defineProps<{
  menuItems: MenuItem[]
  activePage: string
  visitedPages: string[]
  isPageAccessible: (page: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'select', item: MenuItem): void
}>()

function getColor(item: MenuItem) {
  if (props.activePage === item.page) return 'air-primary'
  if (props.visitedPages.includes(item.page)) return 'air-secondary'
  return 'air-tertiary-no-accent'
}
</script>

<template>
  <div class="flex flex-col gap-1 px-2 py-1">
    <B24Button
      v-for="item in props.menuItems"
      :key="item.page"
      :label="item.label"
      :color="getColor(item)"
      :disabled="!props.isPageAccessible(item.page)"
      :b24ui="props.activePage !== item.page ? { base: '!text-(--ui-color-text-primary)', leadingIcon: '!text-(--ui-color-text-primary)', trailingIcon: '!text-(--ui-color-text-primary)' } : {}"
      block
      size="sm"
      @click="emit('select', item)"
    />
  </div>
</template>
