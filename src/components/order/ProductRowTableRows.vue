<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ProductRowAllowedAction, ProductRowSummary } from '../../app/api/productRows'
import ProductRowActionsMenu from './ProductRowActionsMenu.vue'
import { formatOrderPrice } from './orderPrice'

const props = withDefaults(defineProps<{
  productRow: ProductRowSummary
  disabled?: boolean
  reorderDisabled?: boolean
  costDetailsUrl?: string
  pdfUrl?: string
  canMoveUp: boolean
  canMoveDown: boolean
}>(), {
  disabled: false,
  reorderDisabled: false,
})

const emit = defineEmits<{
  (event: 'edit', productRow: ProductRowSummary): void
  (event: 'copy', productRow: ProductRowSummary): void
  (event: 'openCostDetails', productRow: ProductRowSummary): void
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
const hasUnitPrice = computed(() => props.productRow.finalDealerUnitPrice !== null || props.productRow.finalRetailUnitPrice !== null)
const hasTotalPrice = computed(() => props.productRow.dealerTotalPrice !== null || props.productRow.retailTotalPrice !== null)
const hasAnyPrice = computed(() => [
  props.productRow.baseRetailUnitPrice,
  props.productRow.baseDealerUnitPrice,
  props.productRow.finalRetailUnitPrice,
  props.productRow.finalDealerUnitPrice,
  props.productRow.retailTotalPrice,
  props.productRow.dealerTotalPrice,
].some(price => price !== null))

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
  <section :data-product-row="productRow.id" role="rowgroup" class="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
    <div data-product-row-main role="row" class="product-row-grid items-start gap-x-5 gap-y-4 px-5 py-5">
      <div role="cell" data-label="Товарная позиция" class="min-w-0">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Товарная позиция</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
          <div data-product-row-eyebrow class="text-sm text-gray-500">Позиция №{{ productRow.id }}</div>
          <div data-product-row-title class="font-medium text-gray-800">
            {{ productRow.name }}<template v-if="productRow.article"> · {{ productRow.article }}</template>
          </div>
          <div v-if="productRow.unit" class="text-xs text-gray-500">{{ productRow.unit.name }} ({{ productRow.unit.symbol }})</div>
          <div class="mt-1 text-sm text-gray-600">{{ productRow.isActual ? 'Расчёт актуален' : 'Требуется расчёт' }}</div>
        </div>
      </div>
      <div role="cell" data-label="Количество" class="min-w-0">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Количество</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
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
        </div>
      </div>
      <div role="cell" data-label="Цена за единицу" class="min-w-0 text-right tabular-nums max-lg:text-left">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Цена за единицу</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
          <span v-if="!hasUnitPrice" data-price-redacted>Недоступно</span>
          <span v-else-if="!productRow.isActual" data-price-stale>Требуется расчёт</span>
          <template v-else>
            <div>
              <span v-if="formatOrderPrice(productRow.finalDealerUnitPrice)" data-price-kind="final-dealer-unit" class="font-semibold">{{ formatOrderPrice(productRow.finalDealerUnitPrice) }}</span>
              <span v-else data-price-redacted>Недоступно</span>
            </div>
            <div
              v-if="formatOrderPrice(productRow.finalRetailUnitPrice)"
              data-price-kind="final-retail-unit"
              class="mt-1 text-xs font-normal text-gray-500"
            >
              Розница: {{ formatOrderPrice(productRow.finalRetailUnitPrice) }}
            </div>
          </template>
        </div>
      </div>
      <div role="cell" data-label="Сумма" class="min-w-0 text-right tabular-nums max-lg:text-left">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Сумма</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
          <span v-if="!hasTotalPrice" data-price-redacted>Недоступно</span>
          <span v-else-if="!productRow.isActual" data-price-stale>Требуется расчёт</span>
          <template v-else>
            <div>
              <span v-if="formatOrderPrice(productRow.dealerTotalPrice)" data-price-kind="dealer-total" class="font-semibold">{{ formatOrderPrice(productRow.dealerTotalPrice) }}</span>
              <span v-else data-price-redacted>Недоступно</span>
            </div>
            <div
              v-if="formatOrderPrice(productRow.retailTotalPrice)"
              data-price-kind="retail-total"
              class="mt-1 text-xs font-normal text-gray-500"
            >
              Розница: {{ formatOrderPrice(productRow.retailTotalPrice) }}
            </div>
          </template>
        </div>
      </div>
      <div role="cell" data-label="Статус" class="min-w-0 text-sm text-gray-700">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Статус</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
          <div data-product-row-status data-status-badge class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <span
              class="inline-block size-2.5 rounded-full border border-black/10"
              :style="productRow.status.color ? { backgroundColor: productRow.status.color } : undefined"
              aria-hidden="true"
            />
            <span>{{ statusName }}</span>
          </div>
          <div data-product-row-deadline class="mt-2 text-xs text-gray-500">Срок: {{ deadlineLabel }}</div>
        </div>
      </div>
      <div role="cell" data-label="Действия" class="min-w-0 text-right max-lg:text-left">
        <span data-mobile-cell-label class="block text-xs font-medium uppercase tracking-wide text-gray-500">Действия</span>
        <div data-mobile-cell-value class="mt-2 block w-full min-w-0">
          <ProductRowActionsMenu
            :product-row="productRow"
            :disabled="disabled"
            :reorder-disabled="reorderDisabled"
            :cost-details-url="costDetailsUrl"
            :pdf-url="pdfUrl"
            :can-move-up="canMoveUp"
            :can-move-down="canMoveDown"
            @edit="emit('edit', productRow)"
            @recalculate="emit('recalculate', productRow)"
            @copy="emit('copy', productRow)"
            @open-cost-details="emit('openCostDetails', productRow)"
            @delete="emit('delete', productRow)"
            @transition="status => emit('transition', productRow, status)"
            @move="direction => emit('move', productRow, direction)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="productRow.calculationError"
      data-product-row-error
      class="flex items-center justify-between gap-4 border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
    >
      <span>{{ productRow.calculationError }}</span>
      <button
        type="button"
        class="shrink-0 font-medium text-blue-700 hover:text-blue-900"
        :aria-label="`Подробнее об ошибке расчёта товарной позиции ${productRow.id}`"
        @click="detailsOpen = true"
      >
        Подробнее
      </button>
    </div>

    <div data-product-row-toggle class="border-t border-gray-100 px-5 py-3">
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
    </div>

    <div v-if="detailsOpen" :id="`product-row-details-${productRow.id}`" data-product-row-details class="bg-gray-50 px-5 py-5">
      <div v-if="!productRow.isActual && hasAnyPrice" data-price-stale class="text-sm font-medium text-gray-600">
        Требуется расчёт
      </div>
      <section v-else aria-label="Цены и коммерческие условия" class="grid gap-4 lg:grid-cols-3">
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
    </div>
  </section>
</template>

<style scoped>
.product-row-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 2fr) minmax(5rem, .65fr) minmax(8.5rem, 1.15fr) minmax(8.5rem, 1.15fr) minmax(9rem, 1.2fr) 2.75rem;
}

@media (max-width: 1023px) {
  .product-row-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .product-row-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
