<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type {
  ProductRowAllowedAction,
  ProductRowSummary,
} from '../../app/api/productRows'
import { formatOrderPrice } from './orderPrice'

const props = withDefaults(defineProps<{
  productRow: ProductRowSummary
  disabled?: boolean
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
}>()

const quantity = ref(props.productRow.quantity)
const adjustmentType = ref(props.productRow.adjustmentType ?? 'none')
const adjustmentValue = ref(props.productRow.adjustmentValue ?? 0)
const adjustmentUnit = ref(props.productRow.adjustmentUnit ?? 'percent')
const plannedCompletionAt = ref(props.productRow.plannedCompletionAt?.slice(0, 10) ?? '')
const targetStatus = ref('')

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
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) {
    return props.productRow.plannedCompletionAt
  }
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

function emitTransition(): void {
  const next = targetStatus.value.trim()
  if (next !== '' && isAllowed('product_row.transition')) {
    emit('transition', props.productRow, next)
  }
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
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-gray-500">Товарная позиция №{{ productRow.id }}</p>
        <h2 class="text-lg font-semibold text-gray-800">
          {{ productRow.productType }} · модель {{ productRow.modelId }}
        </h2>
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <span
            class="inline-block size-2.5 rounded-full border border-black/10"
            :style="productRow.status.color ? { backgroundColor: productRow.status.color } : undefined"
            aria-hidden="true"
          />
          <span>{{ statusName }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ productRow.isActual ? 'Расчёт актуален' : 'Требуется расчёт' }}</span>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
        Количество
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
      </label>
    </div>

    <p
      v-if="productRow.calculationError"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ productRow.calculationError }}
    </p>

    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Базовая цена за единицу</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(productRow.baseRetailUnitPrice)">{{ formatOrderPrice(productRow.baseRetailUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(productRow.baseDealerUnitPrice)">{{ formatOrderPrice(productRow.baseDealerUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Итоговая цена за единицу</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(productRow.finalRetailUnitPrice)">{{ formatOrderPrice(productRow.finalRetailUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(productRow.finalDealerUnitPrice)">{{ formatOrderPrice(productRow.finalDealerUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Сумма товарной позиции</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(productRow.retailTotalPrice)" class="font-semibold">{{ formatOrderPrice(productRow.retailTotalPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(productRow.dealerTotalPrice)" class="font-semibold">{{ formatOrderPrice(productRow.dealerTotalPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
        </dl>
      </section>
    </div>

    <dl class="mt-4 grid gap-2 border-t border-gray-100 pt-3 text-sm sm:grid-cols-2">
      <div class="flex gap-2">
        <dt class="text-gray-500">Корректировка:</dt>
        <dd>{{ adjustmentLabel }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-gray-500">Плановый срок:</dt>
        <dd>{{ deadlineLabel }}</dd>
      </div>
    </dl>

    <div
      v-if="hasAction('product_row.change_terms') || hasAction('product_row.change_deadline')"
      class="mt-4 grid gap-3 border-t border-gray-100 pt-3 lg:grid-cols-2"
    >
      <div v-if="hasAction('product_row.change_terms')" class="flex flex-wrap items-end gap-2">
        <label class="text-sm text-gray-600">
          Тип
          <select
            v-model="adjustmentType"
            :aria-label="`Тип корректировки товарной позиции ${productRow.id}`"
            :disabled="disabled"
            class="block rounded border border-gray-300 px-2 py-1.5"
          >
            <option value="none">Без корректировки</option>
            <option value="discount">Скидка</option>
            <option value="markup">Наценка</option>
          </select>
        </label>
        <label class="text-sm text-gray-600">
          Значение
          <input
            v-model.number="adjustmentValue"
            type="number"
            min="0"
            step="0.01"
            :aria-label="`Значение корректировки товарной позиции ${productRow.id}`"
            :disabled="disabled || adjustmentType === 'none'"
            class="block w-28 rounded border border-gray-300 px-2 py-1.5"
          >
        </label>
        <label class="text-sm text-gray-600">
          Единица
          <select
            v-model="adjustmentUnit"
            :aria-label="`Единица корректировки товарной позиции ${productRow.id}`"
            :disabled="disabled || adjustmentType === 'none'"
            class="block rounded border border-gray-300 px-2 py-1.5"
          >
            <option value="percent">%</option>
            <option value="fixed">₽</option>
          </select>
        </label>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          :aria-label="`Сохранить корректировку товарной позиции ${productRow.id}`"
          :disabled="disabled"
          @click="emitAdjustment"
        >
          Сохранить
        </button>
      </div>
      <div v-if="hasAction('product_row.change_deadline')" class="flex items-end gap-2">
        <label class="text-sm text-gray-600">
          Плановый срок
          <input
            v-model="plannedCompletionAt"
            type="date"
            :aria-label="`Плановый срок товарной позиции ${productRow.id}`"
            :disabled="disabled"
            class="block rounded border border-gray-300 px-2 py-1.5"
          >
        </label>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          :aria-label="`Сохранить срок товарной позиции ${productRow.id}`"
          :disabled="disabled"
          @click="emitDeadline"
        >
          Сохранить
        </button>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Редактировать товарную позицию ${productRow.id}`"
        :disabled="!isAllowed('product_row.edit_configuration')"
        @click="emit('edit', productRow)"
      >
        Редактировать
      </button>
      <button
        v-if="hasAction('product_row.calculate')"
        type="button"
        class="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        :aria-label="`Пересчитать товарную позицию ${productRow.id}`"
        :disabled="disabled"
        @click="emit('recalculate', productRow)"
      >
        Пересчитать
      </button>
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Копировать товарную позицию ${productRow.id}`"
        :disabled="!isAllowed('product_row.copy')"
        @click="emit('copy', productRow)"
      >
        Копировать
      </button>
      <button
        type="button"
        class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Удалить товарную позицию ${productRow.id}`"
        :disabled="!isAllowed('product_row.delete')"
        @click="emit('delete', productRow)"
      >
        Удалить
      </button>

      <div class="flex min-w-[240px] flex-1 items-center gap-2 sm:ml-auto sm:max-w-md">
        <label :for="`target-status-${productRow.id}`" class="sr-only">Новый статус</label>
        <select
          :id="`target-status-${productRow.id}`"
          v-model="targetStatus"
          class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
          :aria-label="`Новый статус товарной позиции ${productRow.id}`"
          :disabled="!isAllowed('product_row.transition') || productRow.availableTransitions.length === 0"
        >
          <option value="">Выберите статус</option>
          <option v-for="code in productRow.availableTransitions" :key="code" :value="code">
            {{ transitionLabel(code) }}
          </option>
        </select>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Сменить статус товарной позиции ${productRow.id}`"
          :disabled="!isAllowed('product_row.transition') || targetStatus.trim() === ''"
          @click="emitTransition"
        >
          Сменить статус
        </button>
      </div>
    </div>
  </div>
</template>
