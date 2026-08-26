<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

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
const confirmingDelete = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const triggerButton = ref<HTMLButtonElement | null>(null)
const deleteActionButton = ref<HTMLButtonElement | null>(null)
const cancelDeleteButton = ref<HTMLButtonElement | null>(null)

function isAllowed(action: ProductRowAllowedAction): boolean {
  return props.productRow.allowedActions.includes(action)
}

function close(): void {
  open.value = false
  confirmingDelete.value = false
  void nextTick(() => triggerButton.value?.focus())
}

function closeWithoutRestoringFocus(): void {
  open.value = false
  confirmingDelete.value = false
}

function toggle(): void {
  if (props.disabled) return
  if (open.value) close()
  else open.value = true
}

function select(event: 'edit' | 'recalculate' | 'copy'): void {
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
  }
  close()
}

function requestDelete(): void {
  if (props.disabled || !isAllowed('product_row.delete')) return
  confirmingDelete.value = true
  void nextTick(() => cancelDeleteButton.value?.focus())
}

function cancelDelete(): void {
  confirmingDelete.value = false
  void nextTick(() => deleteActionButton.value?.focus())
}

function confirmDelete(): void {
  if (props.disabled || !isAllowed('product_row.delete')) return
  emit('delete')
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
  if (open.value && !menuRoot.value?.contains(event.target as Node)) closeWithoutRestoringFocus()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) close()
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
  <div ref="menuRoot" class="relative inline-flex" @keydown.esc.stop="close">
    <button
      ref="triggerButton"
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
      :role="confirmingDelete ? 'alertdialog' : 'menu'"
      :aria-labelledby="confirmingDelete ? `delete-confirmation-title-${productRow.id}` : undefined"
      class="absolute right-0 z-10 mt-1 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
    >
      <template v-if="!confirmingDelete">
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

        <div
          v-if="isAllowed('product_row.delete')"
          data-destructive-actions
          class="my-1 border-t border-gray-200 pt-1"
          role="none"
        >
          <button
            ref="deleteActionButton"
            type="button"
            role="menuitem"
            class="block w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            :aria-label="`Удалить товарную позицию ${productRow.id}`"
            :disabled="disabled"
            @click="requestDelete"
          >
            Удалить
          </button>
        </div>
      </template>

      <div v-else class="p-2">
        <p :id="`delete-confirmation-title-${productRow.id}`" class="text-sm font-semibold text-gray-900">
          Удалить товарную позицию?
        </p>
        <p class="mt-1 text-xs text-gray-600">Это действие нельзя отменить.</p>
        <div class="mt-3 flex justify-end gap-2">
          <button
            ref="cancelDeleteButton"
            type="button"
            class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            :aria-label="`Отменить удаление товарной позиции ${productRow.id}`"
            @click="cancelDelete"
          >
            Отмена
          </button>
          <button
            type="button"
            class="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            :aria-label="`Подтвердить удаление товарной позиции ${productRow.id}`"
            :disabled="disabled"
            @click="confirmDelete"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
