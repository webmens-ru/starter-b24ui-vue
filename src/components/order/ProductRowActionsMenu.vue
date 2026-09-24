<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import type { ProductRowAllowedAction, ProductRowSummary } from '../../app/api/productRows'

const props = withDefaults(defineProps<{
  productRow: ProductRowSummary
  disabled?: boolean
  reorderDisabled?: boolean
  costDetailsUrl?: string
  pdfUrl?: string
  htmlUrl?: string
  canMoveUp: boolean
  canMoveDown: boolean
}>(), {
  disabled: false,
  reorderDisabled: false,
})

const emit = defineEmits<{
  edit: []
  recalculate: []
  copy: []
  delete: []
  transition: [toStatus: string]
  move: [direction: -1 | 1]
  openCostDetails: []
}>()

const open = ref(false)
const confirmingDelete = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const menuPanel = ref<HTMLElement | null>(null)
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

function enabledMenuItems(): HTMLElement[] {
  return Array.from(menuPanel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
}

function focusMenuItem(target: HTMLElement | undefined | null): void {
  if (!target) return
  for (const item of enabledMenuItems()) item.tabIndex = item === target ? 0 : -1
  target.focus()
}

function focusMenuBoundary(boundary: 'first' | 'last'): void {
  void nextTick(() => {
    const items = enabledMenuItems()
    const target = boundary === 'first' ? items[0] : items[items.length - 1]
    focusMenuItem(target)
  })
}

function focusOutsideMenu(backwards: boolean): void {
  const focusable = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  ))
  const activeIndex = focusable.findIndex(element => element === document.activeElement)
  const step = backwards ? -1 : 1
  let target = focusable[activeIndex + step]
  while (target && menuPanel.value?.contains(target)) {
    target = focusable[focusable.indexOf(target) + step]
  }
  closeWithoutRestoringFocus()
  void nextTick(() => (target ?? triggerButton.value)?.focus())
}

function openMenu(initialFocus: 'first' | 'last'): void {
  if (props.disabled) return
  open.value = true
  confirmingDelete.value = false
  focusMenuBoundary(initialFocus)
}

function toggle(): void {
  if (props.disabled) return
  if (open.value) close()
  else openMenu('first')
}

function handleTriggerKeydown(event: KeyboardEvent): void {
  const boundary = event.key === 'ArrowUp' ? 'last' : 'first'
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  openMenu(boundary)
}

function handleMenuKeydown(event: KeyboardEvent): void {
  if (!open.value || confirmingDelete.value) return
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    focusOutsideMenu(event.shiftKey)
    return
  }
  const items = enabledMenuItems()
  if (items.length === 0) return
  const currentIndex = items.findIndex(item => item === document.activeElement)
  let nextIndex: number | null = null
  switch (event.key) {
    case 'ArrowDown':
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
      break
    case 'ArrowUp':
      nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = items.length - 1
      break
  }
  if (nextIndex === null) return
  event.preventDefault()
  event.stopPropagation()
  focusMenuItem(items[nextIndex])
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

function selectCostDetails(): void {
  if (props.disabled) return
  emit('openCostDetails')
  close()
}

function requestDelete(): void {
  if (props.disabled || !isAllowed('product_row.delete')) return
  confirmingDelete.value = true
  void nextTick(() => cancelDeleteButton.value?.focus())
}

function cancelDelete(): void {
  confirmingDelete.value = false
  void nextTick(() => focusMenuItem(deleteActionButton.value))
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
  if (props.disabled || props.reorderDisabled || !isAllowed('product_row.reorder')) return
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

function handleDocumentFocusIn(event: FocusEvent): void {
  if (open.value && !menuRoot.value?.contains(event.target as Node)) closeWithoutRestoringFocus()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) close()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('focusin', handleDocumentFocusIn)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('focusin', handleDocumentFocusIn)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div ref="menuRoot" class="relative inline-flex" @keydown.esc.stop="close">
    <button
      ref="triggerButton"
      :id="`product-row-actions-trigger-${productRow.id}`"
      type="button"
      class="rounded border border-gray-300 px-2.5 py-1.5 text-lg leading-none text-gray-700 hover:bg-gray-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
      :aria-label="`Действия товарной позиции ${productRow.id}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="`product-row-actions-${productRow.id}`"
      :aria-disabled="disabled ? 'true' : undefined"
      @click="toggle"
      @keydown="handleTriggerKeydown"
    >
      ⋯
    </button>

    <div
      v-if="open"
      :id="`product-row-actions-${productRow.id}`"
      ref="menuPanel"
      :role="confirmingDelete ? 'alertdialog' : 'menu'"
      :aria-labelledby="confirmingDelete
        ? `delete-confirmation-title-${productRow.id}`
        : `product-row-actions-trigger-${productRow.id}`"
      class="absolute right-0 z-10 mt-1 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      @keydown="handleMenuKeydown"
    >
      <template v-if="!confirmingDelete">
        <button
          v-if="isAllowed('product_row.edit_configuration')"
          type="button"
          role="menuitem"
          tabindex="-1"
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
          tabindex="-1"
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
          tabindex="-1"
          class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Копировать товарную позицию ${productRow.id}`"
          :disabled="disabled"
          @click="select('copy')"
        >
          Копировать
        </button>
        <button
          v-if="costDetailsUrl"
          type="button"
          role="menuitem"
          tabindex="-1"
          class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Открыть детализацию стоимости товарной позиции ${productRow.id}`"
          :disabled="disabled"
          @click="selectCostDetails"
        >
          Открыть детализацию стоимости
        </button>
        <a
          v-if="pdfUrl"
          :href="pdfUrl"
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          tabindex="-1"
          class="product-row-actions-menu__pdf block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Сформировать PDF товарной позиции ${productRow.id}`"
          @click="closeWithoutRestoringFocus"
        >
          Сформировать PDF
        </a>
        <a
          v-if="htmlUrl"
          :href="htmlUrl"
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          tabindex="-1"
          class="product-row-actions-menu__html block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Сформировать HTML товарной позиции ${productRow.id}`"
          @click="closeWithoutRestoringFocus"
        >
          Сформировать HTML
        </a>

        <template v-if="isAllowed('product_row.transition')">
          <div v-if="productRow.availableTransitions.length > 0" class="my-1 border-t border-gray-100 pt-1" role="none">
            <button
              v-for="target in productRow.availableTransitions"
              :key="target"
              type="button"
              role="menuitem"
              tabindex="-1"
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
              tabindex="-1"
              class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              :aria-label="`Переместить товарную позицию ${productRow.id} вверх`"
              :disabled="disabled || reorderDisabled || !canMoveUp"
              @click="selectMove(-1)"
            >
              Переместить вверх
            </button>
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              :aria-label="`Переместить товарную позицию ${productRow.id} вниз`"
              :disabled="disabled || reorderDisabled || !canMoveDown"
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
            tabindex="-1"
            class="block w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            :aria-label="`Удалить товарную позицию ${productRow.id}`"
            :disabled="disabled"
            @click.stop="requestDelete"
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

<style scoped>
.product-row-actions-menu__pdf,
.product-row-actions-menu__pdf:visited,
.product-row-actions-menu__pdf:hover,
.product-row-actions-menu__pdf:focus {
  color: inherit;
  font-size: inherit;
  text-decoration: none;
}
</style>
