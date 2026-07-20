<script setup lang="ts">
import ProfiledSheetDrawing from './ProfiledSheetDrawing.vue'
import type { FillingVisualProps } from './fillingDrawingTypes'

defineProps<FillingVisualProps>()

const segments = [
  { size: 67.5, shadow: false },
  { size: 17.5, shadow: true },
  { size: 35, shadow: false },
  { size: 17.5, shadow: true },
]
</script>

<template>
  <g data-testid="filling-mp20" :clip-path="`url(#${idPrefix}-clip)`">
    <ProfiledSheetDrawing v-bind="$props" :segments="segments" />
  </g>
</template>
