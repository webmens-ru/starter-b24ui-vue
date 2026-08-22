<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type {
  OrderItemAllowedAction,
  OrderItemSummary,
} from '../../app/api/orderItems'
import { formatOrderPrice } from './orderPrice'

const props = withDefaults(defineProps<{
  item: OrderItemSummary
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'edit', item: OrderItemSummary): void
  (event: 'copy', item: OrderItemSummary): void
  (event: 'updateQuantity', item: OrderItemSummary, quantity: number): void
  (event: 'updateAdjustment', item: OrderItemSummary, adjustment: {
    adjustmentType: 'none' | 'discount' | 'markup'
    adjustmentValue: number
    adjustmentUnit: 'percent' | 'fixed'
  }): void
  (event: 'updateDeadline', item: OrderItemSummary, plannedCompletionAt: string | null): void
  (event: 'recalculate', item: OrderItemSummary): void
  (event: 'delete', item: OrderItemSummary): void
  (event: 'transition', item: OrderItemSummary, toStatus: string): void
}>()

const quantity = ref(props.item.quantity)
const adjustmentType = ref(props.item.adjustmentType ?? 'none')
const adjustmentValue = ref(props.item.adjustmentValue ?? 0)
const adjustmentUnit = ref(props.item.adjustmentUnit ?? 'percent')
const plannedCompletionAt = ref(props.item.plannedCompletionAt?.slice(0, 10) ?? '')
const targetStatus = ref('')

watch(() => props.item.quantity, value => {
  quantity.value = value
})

watch(() => [
  props.item.adjustmentType,
  props.item.adjustmentValue,
  props.item.adjustmentUnit,
  props.item.plannedCompletionAt,
] as const, ([type, value, unit, deadline]) => {
  adjustmentType.value = type ?? 'none'
  adjustmentValue.value = value ?? 0
  adjustmentUnit.value = unit ?? 'percent'
  plannedCompletionAt.value = deadline?.slice(0, 10) ?? ''
})

const statusName = computed(() => props.item.status.name || props.item.status.code || 'Без статуса')

const adjustmentLabel = computed(() => {
  if (props.item.adjustmentType === null || props.item.adjustmentValue === null || props.item.adjustmentUnit === null) {
    return 'Недоступно'
  }
  if (props.item.adjustmentType === 'none') return 'Без корректировки'
  const type = props.item.adjustmentType === 'discount' ? 'Скидка' : 'Наценка'
  const value = props.item.adjustmentUnit === 'percent'
    ? `${props.item.adjustmentValue.toLocaleString('ru-RU')} %`
    : (formatOrderPrice(props.item.adjustmentValue) ?? '')
  return `${type}: ${value}`
})

const deadlineLabel = computed(() => {
  if (!props.item.plannedCompletionAt) return 'Не задан'
  const parts = props.item.plannedCompletionAt.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) {
    return props.item.plannedCompletionAt
  }
  const [year, month, day] = parts
  return new Intl.DateTimeFormat('ru-RU').format(new Date(year!, month! - 1, day!))
})

function isAllowed(action: OrderItemAllowedAction): boolean {
  return !props.disabled && props.item.allowedActions.includes(action)
}

function hasAction(action: OrderItemAllowedAction): boolean {
  return props.item.allowedActions.includes(action)
}

function emitQuantity(): void {
  const next = Number(quantity.value)
  if (!Number.isInteger(next) || next <= 0) {
    quantity.value = props.item.quantity
    return
  }
  if (next !== props.item.quantity) emit('updateQuantity', props.item, next)
}

function emitTransition(): void {
  const next = targetStatus.value.trim()
  if (next !== '' && isAllowed('order_item.transition')) {
    emit('transition', props.item, next)
  }
}


function emitAdjustment(): void {
  const value = Number(adjustmentValue.value)
  if (!Number.isFinite(value) || value < 0) {
    adjustmentValue.value = props.item.adjustmentValue ?? 0
    return
  }
  emit('updateAdjustment', props.item, {
    adjustmentType: adjustmentType.value,
    adjustmentValue: adjustmentType.value === 'none' ? 0 : value,
    adjustmentUnit: adjustmentUnit.value,
  })
}

function emitDeadline(): void {
  emit('updateDeadline', props.item, plannedCompletionAt.value || null)
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
        <h2 class="text-lg font-semibold text-gray-800">
          {{ item.productType }} · модель {{ item.modelId }}
        </h2>
        <div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <span
            class="inline-block size-2.5 rounded-full border border-black/10"
            :style="item.status.color ? { backgroundColor: item.status.color } : undefined"
            aria-hidden="true"
          />
          <span>{{ statusName }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ item.isActual ? 'Расчёт актуален' : 'Требуется расчёт' }}</span>
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
          :aria-label="`Количество позиции ${item.id}`"
          :disabled="!isAllowed('order_item.change_quantity')"
          @change="emitQuantity"
        >
      </label>
    </div>

    <p
      v-if="item.calculationError"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ item.calculationError }}
    </p>

    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Базовая цена за единицу</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(item.baseRetailUnitPrice)">{{ formatOrderPrice(item.baseRetailUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(item.baseDealerUnitPrice)">{{ formatOrderPrice(item.baseDealerUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Итоговая цена за единицу</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(item.finalRetailUnitPrice)">{{ formatOrderPrice(item.finalRetailUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(item.finalDealerUnitPrice)">{{ formatOrderPrice(item.finalDealerUnitPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Сумма позиции</h3>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Розничная</dt>
            <dd v-if="formatOrderPrice(item.retailTotalPrice)" class="font-semibold">{{ formatOrderPrice(item.retailTotalPrice) }}</dd>
            <dd v-else data-price-redacted>Недоступно</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-gray-500">Дилерская</dt>
            <dd v-if="formatOrderPrice(item.dealerTotalPrice)" class="font-semibold">{{ formatOrderPrice(item.dealerTotalPrice) }}</dd>
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
      v-if="hasAction('order_item.change_terms') || hasAction('order_item.change_deadline')"
      class="mt-4 grid gap-3 border-t border-gray-100 pt-3 lg:grid-cols-2"
    >
      <div v-if="hasAction('order_item.change_terms')" class="flex flex-wrap items-end gap-2">
        <label class="text-sm text-gray-600">
          Тип
          <select
            v-model="adjustmentType"
            :aria-label="`Тип корректировки позиции ${item.id}`"
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
            :aria-label="`Значение корректировки позиции ${item.id}`"
            :disabled="disabled || adjustmentType === 'none'"
            class="block w-28 rounded border border-gray-300 px-2 py-1.5"
          >
        </label>
        <label class="text-sm text-gray-600">
          Единица
          <select
            v-model="adjustmentUnit"
            :aria-label="`Единица корректировки позиции ${item.id}`"
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
          :aria-label="`Сохранить корректировку позиции ${item.id}`"
          :disabled="disabled"
          @click="emitAdjustment"
        >
          Сохранить
        </button>
      </div>
      <div v-if="hasAction('order_item.change_deadline')" class="flex items-end gap-2">
        <label class="text-sm text-gray-600">
          Плановый срок
          <input
            v-model="plannedCompletionAt"
            type="date"
            :aria-label="`Плановый срок позиции ${item.id}`"
            :disabled="disabled"
            class="block rounded border border-gray-300 px-2 py-1.5"
          >
        </label>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          :aria-label="`Сохранить срок позиции ${item.id}`"
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
        :aria-label="`Редактировать позицию ${item.id}`"
        :disabled="!isAllowed('order_item.edit_configuration')"
        @click="emit('edit', item)"
      >
        Редактировать
      </button>
      <button
        v-if="hasAction('order_item.calculate')"
        type="button"
        class="rounded border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        :aria-label="`Пересчитать позицию ${item.id}`"
        :disabled="disabled"
        @click="emit('recalculate', item)"
      >
        Пересчитать
      </button>
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Копировать позицию ${item.id}`"
        :disabled="!isAllowed('order_item.copy')"
        @click="emit('copy', item)"
      >
        Копировать
      </button>
      <button
        type="button"
        class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="`Удалить позицию ${item.id}`"
        :disabled="!isAllowed('order_item.delete')"
        @click="emit('delete', item)"
      >
        Удалить
      </button>

      <div class="flex min-w-[240px] flex-1 items-center gap-2 sm:ml-auto sm:max-w-md">
        <label :for="`target-status-${item.id}`" class="sr-only">Новый статус</label>
        <select
          :id="`target-status-${item.id}`"
          v-model="targetStatus"
          class="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
          :aria-label="`Новый статус позиции ${item.id}`"
          :disabled="!isAllowed('order_item.transition') || item.availableTransitions.length === 0"
        >
          <option value="">Выберите статус</option>
          <option v-for="code in item.availableTransitions" :key="code" :value="code">
            {{ transitionLabel(code) }}
          </option>
        </select>
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Сменить статус позиции ${item.id}`"
          :disabled="!isAllowed('order_item.transition') || targetStatus.trim() === ''"
          @click="emitTransition"
        >
          Сменить статус
        </button>
      </div>
    </div>
  </div>
</template>
