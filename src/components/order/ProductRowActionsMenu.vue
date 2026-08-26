<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import type { ProductRowAllowedAction, ProductRowSummary } from '../../app/api/productRows'

const props = withDefaults(defineProps<{
  productRow: ProductRowSummary
  disabled?: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  edit: []
  recalculate: []
  copy: []
  delete: []
  transition: [toStatus: string]
  move: [direction: -1 | 1]
}>()

const open = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function isAllowed(action: ProductRowAllowedAction): boolean {
  return props.productRow.allowedActions.includes(action)
}

function close(): void {
  open.value = false
}

function toggle(): void {
  if (props.disabled) return
  open.value = !open.value
}

function select(event: 'edit' | 'recalculate' | 'copy' | 'delete'): void {
  if (props.disabled) return
  switch (event) {
    case 'edit':
      emit('edit')
      break
    case 'recalculate':
      emit('recalculate')
      break
    case 'copy':
      emit('copy')
      break
    case 'delete':
      emit('delete')
      break
  }
  close()
}

function selectTransition(toStatus: string): void {
  if (props.disabled || !isAllowed('product_row.transition')) return
  emit('transition', toStatus)
  close()
}

function selectMove(direction: -1 | 1): void {
  if (props.disabled || !isAllowed('product_row.reorder')) return
  if (direction === -1 && !props.canMoveUp) return
  if (direction === 1 && !props.canMoveDown) return
  emit('move', direction)
  close()
}

function transitionLabel(code: string): string {
  return ({
    draft: 'Вернуть в черновик',
    approval: 'На согласование',
    approved: 'Согласовать',
    production: 'В производство',
    ready: 'Готово',
    cancelled: 'Отменить',
  } as Record<string, string>)[code] ?? code
}

function handleDocumentClick(event: MouseEvent): void {
  if (open.value && !menuRoot.value?.contains(event.target as Node)) close()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div ref="menuRoot" class="relative inline-flex" @click.stop @keydown.esc="close">
    <button
      type="button"
      class="rounded border border-gray-300 px-2.5 py-1.5 text-lg leading-none text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      :aria-label="`Действия товарной позиции ${productRow.id}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      :disabled="disabled"
      @click="toggle"
    >
      ⋯
    </button>

    <div
      v-if="open"
      role="menu"
      class="absolute right-0 z-10 mt-1 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
    >
      <button
        v-if="isAllowed('product_row.edit_configuration')"
        type="button"
        role="menuitem"
        class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Редактировать товарную позицию ${productRow.id}`"
        :disabled="disabled"
        @click="select('edit')"
      >
        Редактировать
      </button>
      <button
        v-if="isAllowed('product_row.calculate')"
        type="button"
        role="menuitem"
        class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Пересчитать товарную позицию ${productRow.id}`"
        :disabled="disabled"
        @click="select('recalculate')"
      >
        Пересчитать
      </button>
      <button
        v-if="isAllowed('product_row.copy')"
        type="button"
        role="menuitem"
        class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Копировать товарную позицию ${productRow.id}`"
        :disabled="disabled"
        @click="select('copy')"
      >
        Копировать
      </button>
      <button
        v-if="isAllowed('product_row.delete')"
        type="button"
        role="menuitem"
        class="block w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Удалить товарную позицию ${productRow.id}`"
        :disabled="disabled"
        @click="select('delete')"
      >
        Удалить
      </button>

      <template v-if="isAllowed('product_row.transition')">
        <div v-if="productRow.availableTransitions.length > 0" class="my-1 border-t border-gray-100 pt-1" role="none">
          <button
            v-for="target in productRow.availableTransitions"
            :key="target"
            type="button"
            role="menuitem"
            class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            :aria-label="`Перевести товарную позицию ${productRow.id} в статус ${target}`"
            :disabled="disabled"
            @click="selectTransition(target)"
          >
            {{ transitionLabel(target) }}
          </button>
        </div>
      </template>

      <template v-if="isAllowed('product_row.reorder')">
        <div class="my-1 border-t border-gray-100 pt-1" role="none">
          <button
            type="button"
            role="menuitem"
            class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            :aria-label="`Переместить товарную позицию ${productRow.id} вверх`"
            :disabled="disabled || !canMoveUp"
            @click="selectMove(-1)"
          >
            Переместить вверх
          </button>
          <button
            type="button"
            role="menuitem"
            class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            :aria-label="`Переместить товарную позицию ${productRow.id} вниз`"
            :disabled="disabled || !canMoveDown"
            @click="selectMove(1)"
          >
            Переместить вниз
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
