<script setup lang="ts">
import { ref } from 'vue'
import { useCalculation } from '../composables/useCalculation'

withDefaults(defineProps<{ closable?: boolean }>(), { closable: false })
const emit = defineEmits<{ close: [] }>()

const { data, number, model, priceDealer, priceRetail } = useCalculation()
const isSummaryOpen = ref(false)
</script>

<template>
  <div class="flex flex-col w-full">

    <div class="flex items-center border-b border-gray-200">
      <button
        type="button"
        class="flex flex-1 items-center justify-between px-4 py-3 text-left cursor-pointer"
        aria-controls="calculation-summary-content"
        :aria-expanded="isSummaryOpen"
        data-testid="calculation-summary-toggle"
        @click="isSummaryOpen = !isSummaryOpen"
      >
        <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Сводка расчёта</span>
        <svg
          class="size-3 shrink-0 text-gray-400 transition-transform duration-200"
          :class="isSummaryOpen ? 'rotate-180' : ''"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button
        v-if="closable"
        type="button"
        class="mr-3 flex size-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        title="Закрыть"
        @click="emit('close')"
      >
        <svg class="size-3.5" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div
      v-if="isSummaryOpen"
      id="calculation-summary-content"
      class="flex flex-col gap-4 p-[10px]"
    >

    <!-- Шапка -->
    <div v-if="number || model" class="text-sm font-semibold text-(--ui-color-text-primary)">
      <div v-if="number">№ {{ number }}</div>
      <div v-if="model" class="text-(--ui-color-text-secondary) font-normal">{{ model }}</div>
    </div>

    <!-- Блоки данных + цены в одной таблице -->
    <B24TableWrapper
      v-if="data.length > 0 || priceDealer || priceRetail"
      bordered
      rounded
      zebra
      size="sm"
      class="w-full"
    >
      <table class="w-full">
        <colgroup>
          <col class="w-1/2">
          <col class="w-1/2">
        </colgroup>
        <tbody>
          <template v-for="block in data" :key="block.blockName">
            <tr>
              <td colspan="2" class="font-semibold bg-(--ui-color-base-200) px-3 py-1.5">
                {{ block.blockName }}
              </td>
            </tr>
            <tr v-for="param in block.params" :key="param.name">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">{{ param.name }}</td>
              <td class="px-3 py-1.5">{{ param.value }}</td>
            </tr>
          </template>

          <template v-if="priceDealer || priceRetail">
            <tr>
              <td colspan="2" class="font-semibold bg-(--ui-color-base-200) px-3 py-1.5">Цена</td>
            </tr>
            <tr v-if="priceDealer">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">Дилерская цена</td>
              <td class="px-3 py-1.5 font-medium">{{ priceDealer }}</td>
            </tr>
            <tr v-if="priceRetail">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">Рек. розн. цена</td>
              <td class="px-3 py-1.5 font-medium">{{ priceRetail }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </B24TableWrapper>

    <!-- Пустое состояние -->
    <div
      v-if="data.length === 0 && !priceDealer && !priceRetail"
      class="text-sm text-(--ui-color-text-secondary) italic"
    >
      Данные появятся по мере заполнения шагов
    </div>

    </div>
  </div>
</template>
