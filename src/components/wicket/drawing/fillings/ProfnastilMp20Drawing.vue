<script setup lang="ts">
import ProfiledSheetDrawing from './ProfiledSheetDrawing.vue'
import type { FillingVisualProps } from './fillingDrawingTypes'

defineProps<FillingVisualProps>()

const segments = [
  { size: 17.5, shadow: true },   // узкая — блик (перед 67.5)
  { size: 67.5, shadow: false },  // широкая — цвет
  { size: 17.5, shadow: true },   // узкая — тень
  { size: 35, shadow: false },    // средняя — цвет
]
</script>

<template>
  <g data-testid="filling-mp20" :clip-path="`url(#${idPrefix}-clip)`">
    <ProfiledSheetDrawing v-bind="$props" :segments="segments" />
  </g>
</template>
