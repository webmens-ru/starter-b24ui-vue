<script setup lang="ts">
import type { OrderTotals } from '../../app/api/productRows'
import { formatOrderPrice } from './orderPrice'

defineProps<{
  totals: OrderTotals
}>()
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    aria-labelledby="order-totals-title"
  >
    <h2 id="order-totals-title" class="mb-3 text-lg font-semibold text-gray-800">
      Итого по заказу
    </h2>
    <dl class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-lg bg-green-50 p-3">
        <dt class="text-sm text-gray-500">Рекомендованная розничная цена</dt>
        <dd class="mt-1 text-xl font-bold text-green-700" data-order-total="retail">
          {{ formatOrderPrice(totals.priceRetail) ?? 'Недоступно' }}
        </dd>
      </div>
      <div class="rounded-lg bg-blue-50 p-3">
        <dt class="text-sm text-gray-500">Дилерская цена</dt>
        <dd class="mt-1 text-xl font-bold text-blue-700" data-order-total="dealer">
          {{ formatOrderPrice(totals.priceDealer) ?? 'Недоступно' }}
        </dd>
      </div>
    </dl>
  </section>
</template>
