<script setup lang="ts">
import { computed, ref } from 'vue'

import { useCalculation } from '../composables/useCalculation'
import { resolveDrawingComponent } from './wicket/drawing/drawingRegistry'

const isDrawingOpen = ref(true)
const calc = useCalculation()
const drawingComponent = computed(() => resolveDrawingComponent(String(calc.modelId.value ?? '')))
</script>

<template>
  <div class="flex flex-col w-full">
    <div class="flex items-center border-b border-gray-200">
      <button
        type="button"
        class="flex flex-1 items-center justify-between px-4 py-3 text-left cursor-pointer"
        aria-controls="drawing-panel-content"
        :aria-expanded="isDrawingOpen"
        data-testid="drawing-panel-toggle"
        @click="isDrawingOpen = !isDrawingOpen"
      >
        <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Чертёж</span>
        <svg
          class="size-3 shrink-0 text-gray-400 transition-transform duration-200"
          :class="isDrawingOpen ? 'rotate-180' : ''"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div
      v-if="isDrawingOpen"
      id="drawing-panel-content"
      class="p-[10px]"
      data-testid="drawing-panel-content"
    >
      <component :is="drawingComponent" v-if="drawingComponent"/>
    </div>
  </div>
</template>
