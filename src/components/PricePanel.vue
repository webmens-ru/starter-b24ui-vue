<script setup lang="ts">
import { ref } from 'vue'
import { useCalculation } from '../composables/useCalculation'

const { priceDealer, priceRetail } = useCalculation()
const isPriceOpen = ref(true)
</script>

<template>
  <div class="flex flex-col w-full">
    <button
      type="button"
      class="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-left cursor-pointer"
      aria-controls="price-panel-content"
      :aria-expanded="isPriceOpen"
      @click="isPriceOpen = !isPriceOpen"
    >
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Цена</span>
      <svg
        class="size-3 shrink-0 text-gray-400 transition-transform duration-200"
        :class="isPriceOpen ? 'rotate-180' : ''"
        viewBox="0 0 10 6"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="isPriceOpen" id="price-panel-content" class="p-[10px]">
      <dl class="flex flex-col gap-3 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-(--ui-color-text-secondary)">Дилерская цена</dt>
          <dd class="text-base font-semibold text-right">{{ priceDealer === '' || priceDealer == null ? '—' : priceDealer }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-(--ui-color-text-secondary)">Рек. розн. цена</dt>
          <dd class="text-base font-semibold text-right">{{ priceRetail === '' || priceRetail == null ? '—' : priceRetail }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>
