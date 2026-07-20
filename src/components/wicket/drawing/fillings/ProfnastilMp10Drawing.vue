<script setup lang="ts">
import ProfiledSheetDrawing from './ProfiledSheetDrawing.vue'
import type { FillingVisualProps } from './fillingDrawingTypes'

defineProps<FillingVisualProps>()

const segments = [
  { size: 15, shadow: true },
  { size: 35, shadow: false },
  { size: 15, shadow: true },
  { size: 35, shadow: false },
]
</script>

<template>
  <g data-testid="filling-mp10" :clip-path="`url(#${idPrefix}-clip)`">
    <ProfiledSheetDrawing v-bind="$props" :segments="segments" />
  </g>
</template>
