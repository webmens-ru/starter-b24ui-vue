<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ProductRowAllowedAction, ProductRowSummary } from '../../app/api/productRows'
import ProductRowActionsMenu from './ProductRowActionsMenu.vue'
import { formatOrderPrice } from './orderPrice'

const props = withDefaults(defineProps<{
  productRow: ProductRowSummary
  disabled?: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'edit', productRow: ProductRowSummary): void
  (event: 'copy', productRow: ProductRowSummary): void
  (event: 'updateQuantity', productRow: ProductRowSummary, quantity: number): void
  (event: 'updateAdjustment', productRow: ProductRowSummary, adjustment: {
    adjustmentType: 'none' | 'discount' | 'markup'
    adjustmentValue: number
    adjustmentUnit: 'percent' | 'fixed'
  }): void
  (event: 'updateDeadline', productRow: ProductRowSummary, plannedCompletionAt: string | null): void
  (event: 'recalculate', productRow: ProductRowSummary): void
  (event: 'delete', productRow: ProductRowSummary): void
  (event: 'transition', productRow: ProductRowSummary, toStatus: string): void
  (event: 'move', productRow: ProductRowSummary, direction: -1 | 1): void
}>()

const detailsOpen = ref(false)
const quantity = ref(props.productRow.quantity)
const adjustmentType = ref(props.productRow.adjustmentType ?? 'none')
const adjustmentValue = ref(props.productRow.adjustmentValue ?? 0)
const adjustmentUnit = ref(props.productRow.adjustmentUnit ?? 'percent')
const plannedCompletionAt = ref(props.productRow.plannedCompletionAt?.slice(0, 10) ?? '')

watch(() => props.productRow.quantity, value => {
  quantity.value = value
})

watch(() => [
  props.productRow.adjustmentType,
  props.productRow.adjustmentValue,
  props.productRow.adjustmentUnit,
  props.productRow.plannedCompletionAt,
] as const, ([type, value, unit, deadline]) => {
  adjustmentType.value = type ?? 'none'
  adjustmentValue.value = value ?? 0
  adjustmentUnit.value = unit ?? 'percent'
  plannedCompletionAt.value = deadline?.slice(0, 10) ?? ''
})

const statusName = computed(() => props.productRow.status.name || props.productRow.status.code || 'Без статуса')

const adjustmentLabel = computed(() => {
  if (props.productRow.adjustmentType === null || props.productRow.adjustmentValue === null || props.productRow.adjustmentUnit === null) {
    return 'Недоступно'
  }
  if (props.productRow.adjustmentType === 'none') return 'Без корректировки'
  const type = props.productRow.adjustmentType === 'discount' ? 'Скидка' : 'Наценка'
  const value = props.productRow.adjustmentUnit === 'percent'
    ? `${props.productRow.adjustmentValue.toLocaleString('ru-RU')} %`
    : (formatOrderPrice(props.productRow.adjustmentValue) ?? '')
  return `${type}: ${value}`
})

const deadlineLabel = computed(() => {
  if (!props.productRow.plannedCompletionAt) return 'Не задан'
  const parts = props.productRow.plannedCompletionAt.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return props.productRow.plannedCompletionAt
  const [year, month, day] = parts
  return new Intl.DateTimeFormat('ru-RU').format(new Date(year!, month! - 1, day!))
})

function isAllowed(action: ProductRowAllowedAction): boolean {
  return !props.disabled && props.productRow.allowedActions.includes(action)
}

function hasAction(action: ProductRowAllowedAction): boolean {
  return props.productRow.allowedActions.includes(action)
}

function emitQuantity(): void {
  const next = Number(quantity.value)
  if (!Number.isInteger(next) || next <= 0) {
    quantity.value = props.productRow.quantity
    return
  }
  if (next !== props.productRow.quantity) emit('updateQuantity', props.productRow, next)
}

function emitAdjustment(): void {
  const value = Number(adjustmentValue.value)
  if (!Number.isFinite(value) || value < 0) {
    adjustmentValue.value = props.productRow.adjustmentValue ?? 0
    return
  }
  emit('updateAdjustment', props.productRow, {
    adjustmentType: adjustmentType.value,
    adjustmentValue: adjustmentType.value === 'none' ? 0 : value,
    adjustmentUnit: adjustmentUnit.value,
  })
}

function emitDeadline(): void {
  emit('updateDeadline', props.productRow, plannedCompletionAt.value || null)
}
</script>

<template>
  <tbody :data-product-row="productRow.id" class="overflow-visible">
    <tr data-product-row-main>
      <td data-label="Товарная позиция" class="align-top">
        <div class="font-medium text-gray-800">№{{ productRow.id }} · {{ productRow.productType }}, модель {{ productRow.modelId }}</div>
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <span
            class="inline-block size-2.5 rounded-full border border-black/10"
            :style="productRow.status.color ? { backgroundColor: productRow.status.color } : undefined"
            aria-hidden="true"
          />
          <span>{{ productRow.isActual ? 'Расчёт актуален' : 'Требуется расчёт' }}</span>
        </div>
      </td>
      <td data-label="Количество" class="align-top">
        <input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          class="w-20 rounded border border-gray-300 px-2 py-1.5 text-right disabled:bg-gray-100"
          :aria-label="`Количество товарной позиции ${productRow.id}`"
          :disabled="!isAllowed('product_row.change_quantity')"
          @change="emitQuantity"
        >
      </td>
      <td data-label="Цена за единицу" class="align-top text-right tabular-nums">
        <div>
          <span v-if="formatOrderPrice(productRow.finalDealerUnitPrice)">{{ formatOrderPrice(productRow.finalDealerUnitPrice) }}</span>
          <span v-else data-price-redacted>Недоступно</span>
        </div>
        <div
          v-if="formatOrderPrice(productRow.finalRetailUnitPrice)"
          data-price-kind="final-retail-unit"
          class="mt-1 text-xs font-normal text-gray-500"
        >
          Розница: {{ formatOrderPrice(productRow.finalRetailUnitPrice) }}
        </div>
      </td>
      <td data-label="Сумма" class="align-top text-right font-semibold tabular-nums">
        <div>
          <span v-if="formatOrderPrice(productRow.dealerTotalPrice)">{{ formatOrderPrice(productRow.dealerTotalPrice) }}</span>
          <span v-else data-price-redacted>Недоступно</span>
        </div>
        <div
          v-if="formatOrderPrice(productRow.retailTotalPrice)"
          data-price-kind="retail-total"
          class="mt-1 text-xs font-normal text-gray-500"
        >
          Розница: {{ formatOrderPrice(productRow.retailTotalPrice) }}
        </div>
      </td>
      <td data-label="Статус" class="align-top text-sm text-gray-700">
        {{ statusName }} · {{ deadlineLabel }}
      </td>
      <td data-label="Действия" class="align-top text-right">
        <ProductRowActionsMenu
          :product-row="productRow"
          :disabled="disabled"
          :can-move-up="canMoveUp"
          :can-move-down="canMoveDown"
          @edit="emit('edit', productRow)"
          @recalculate="emit('recalculate', productRow)"
          @copy="emit('copy', productRow)"
          @delete="emit('delete', productRow)"
          @transition="status => emit('transition', productRow, status)"
          @move="direction => emit('move', productRow, direction)"
        />
      </td>
    </tr>

    <tr v-if="productRow.calculationError" data-product-row-error>
      <td colspan="6" class="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        {{ productRow.calculationError }}
      </td>
    </tr>

    <tr data-product-row-toggle>
      <td colspan="6" class="border-t border-gray-100 px-4 py-2">
        <button
          type="button"
          class="text-sm font-medium text-blue-700 hover:text-blue-900"
          :aria-label="`Подробнее о товарной позиции ${productRow.id}`"
          :aria-expanded="detailsOpen"
          :aria-controls="`product-row-details-${productRow.id}`"
          @click="detailsOpen = !detailsOpen"
        >
          {{ detailsOpen ? 'Скрыть подробности' : 'Подробнее' }}
        </button>
      </td>
    </tr>

    <tr v-if="detailsOpen" :id="`product-row-details-${productRow.id}`" data-product-row-details>
      <td colspan="6" class="bg-gray-50 px-4 py-4">
        <section aria-label="Цены и коммерческие условия" class="grid gap-4 lg:grid-cols-3">
          <section>
            <h3 class="mb-2 text-sm font-semibold text-gray-700">Базовая цена за единицу</h3>
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Розничная</dt><dd v-if="formatOrderPrice(productRow.baseRetailUnitPrice)">{{ formatOrderPrice(productRow.baseRetailUnitPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Дилерская</dt><dd v-if="formatOrderPrice(productRow.baseDealerUnitPrice)">{{ formatOrderPrice(productRow.baseDealerUnitPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
            </dl>
          </section>
          <section>
            <h3 class="mb-2 text-sm font-semibold text-gray-700">Итоговая цена за единицу</h3>
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Розничная</dt><dd v-if="formatOrderPrice(productRow.finalRetailUnitPrice)">{{ formatOrderPrice(productRow.finalRetailUnitPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Дилерская</dt><dd v-if="formatOrderPrice(productRow.finalDealerUnitPrice)">{{ formatOrderPrice(productRow.finalDealerUnitPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
            </dl>
          </section>
          <section>
            <h3 class="mb-2 text-sm font-semibold text-gray-700">Сумма товарной позиции</h3>
            <dl class="space-y-1 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Розничная</dt><dd v-if="formatOrderPrice(productRow.retailTotalPrice)" class="font-semibold">{{ formatOrderPrice(productRow.retailTotalPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Дилерская</dt><dd v-if="formatOrderPrice(productRow.dealerTotalPrice)" class="font-semibold">{{ formatOrderPrice(productRow.dealerTotalPrice) }}</dd><dd v-else data-price-redacted>Недоступно</dd></div>
            </dl>
          </section>
        </section>

        <dl class="mt-4 grid gap-2 border-t border-gray-200 pt-3 text-sm sm:grid-cols-2">
          <div class="flex gap-2"><dt class="text-gray-500">Корректировка:</dt><dd>{{ adjustmentLabel }}</dd></div>
          <div class="flex gap-2"><dt class="text-gray-500">Плановый срок:</dt><dd>{{ deadlineLabel }}</dd></div>
        </dl>

        <div v-if="hasAction('product_row.change_terms') || hasAction('product_row.change_deadline')" class="mt-4 grid gap-3 border-t border-gray-200 pt-3 lg:grid-cols-2">
          <div v-if="hasAction('product_row.change_terms')" class="flex flex-wrap items-end gap-2">
            <label class="text-sm text-gray-600">Тип
              <select v-model="adjustmentType" :aria-label="`Тип корректировки товарной позиции ${productRow.id}`" :disabled="disabled" class="block rounded border border-gray-300 px-2 py-1.5">
                <option value="none">Без корректировки</option><option value="discount">Скидка</option><option value="markup">Наценка</option>
              </select>
            </label>
            <label class="text-sm text-gray-600">Значение
              <input v-model.number="adjustmentValue" type="number" min="0" step="0.01" :aria-label="`Значение корректировки товарной позиции ${productRow.id}`" :disabled="disabled || adjustmentType === 'none'" class="block w-28 rounded border border-gray-300 px-2 py-1.5">
            </label>
            <label class="text-sm text-gray-600">Единица
              <select v-model="adjustmentUnit" :aria-label="`Единица корректировки товарной позиции ${productRow.id}`" :disabled="disabled || adjustmentType === 'none'" class="block rounded border border-gray-300 px-2 py-1.5">
                <option value="percent">%</option><option value="fixed">₽</option>
              </select>
            </label>
            <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40" :aria-label="`Сохранить корректировку товарной позиции ${productRow.id}`" :disabled="disabled" @click="emitAdjustment">Сохранить</button>
          </div>
          <div v-if="hasAction('product_row.change_deadline')" class="flex items-end gap-2">
            <label class="text-sm text-gray-600">Плановый срок
              <input v-model="plannedCompletionAt" type="date" :aria-label="`Плановый срок товарной позиции ${productRow.id}`" :disabled="disabled" class="block rounded border border-gray-300 px-2 py-1.5">
            </label>
            <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40" :aria-label="`Сохранить срок товарной позиции ${productRow.id}`" :disabled="disabled" @click="emitDeadline">Сохранить</button>
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</template>

<style scoped>
@media (max-width: 767px) {
  :global(table:has(tbody[data-product-row]) > thead) {
    display: none;
  }

  tbody[data-product-row] {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid rgb(229 231 235);
    border-radius: 0.75rem;
    overflow: visible;
  }

  tr[data-product-row-main] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  tr[data-product-row-main] > td {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    text-align: right;
  }

  tr[data-product-row-main] > td::before {
    content: attr(data-label);
    flex: 0 0 42%;
    color: rgb(107 114 128);
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
  }

  tr[data-product-row-main] > td:first-child,
  tr[data-product-row-main] > td:first-child::before {
    text-align: left;
  }

  tr[data-product-row-error],
  tr[data-product-row-toggle],
  tr[data-product-row-details],
  tr[data-product-row-error] > td,
  tr[data-product-row-toggle] > td,
  tr[data-product-row-details] > td {
    display: block;
    width: auto;
  }
}
</style>
