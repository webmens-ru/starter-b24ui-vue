<script setup lang="ts">
import { useCalculation } from '../composables/useCalculation'

const { data, number, model, price_dealer, price_retail } = useCalculation()
</script>

<template>
  <div class="flex flex-col gap-4 w-full">

    <!-- Шапка -->
    <div v-if="number || model" class="text-sm font-semibold text-(--ui-color-text-primary)">
      <div v-if="number">№ {{ number }}</div>
      <div v-if="model" class="text-(--ui-color-text-secondary) font-normal">{{ model }}</div>
    </div>

    <!-- Блоки данных + цены в одной таблице -->
    <B24TableWrapper
      v-if="data.length > 0 || price_dealer || price_retail"
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
              <td
                colspan="2"
                class="font-semibold bg-(--ui-color-base-200) px-3 py-1.5"
              >
                {{ block.blockName }}
              </td>
            </tr>
            <tr v-for="param in block.params" :key="param.name">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">{{ param.name }}</td>
              <td class="px-3 py-1.5">{{ param.value }}</td>
            </tr>
          </template>

          <template v-if="price_dealer || price_retail">
            <tr>
              <td colspan="2" class="font-semibold bg-(--ui-color-base-200) px-3 py-1.5">
                Цена
              </td>
            </tr>
            <tr v-if="price_dealer">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">Дилерская цена</td>
              <td class="px-3 py-1.5 font-medium">{{ price_dealer }}</td>
            </tr>
            <tr v-if="price_retail">
              <td class="text-(--ui-color-text-secondary) px-3 py-1.5">Рек. розн. цена</td>
              <td class="px-3 py-1.5 font-medium">{{ price_retail }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </B24TableWrapper>

    <!-- Пустое состояние -->
    <div
      v-if="data.length === 0 && !price_dealer && !price_retail"
      class="text-sm text-(--ui-color-text-secondary) italic"
    >
      Данные появятся по мере заполнения шагов
    </div>

  </div>
</template>
