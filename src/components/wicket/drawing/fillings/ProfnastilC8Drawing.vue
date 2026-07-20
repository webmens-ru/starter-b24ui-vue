<script setup lang="ts">
import ProfiledSheetDrawing from './ProfiledSheetDrawing.vue'
import type { FillingVisualProps } from './fillingDrawingTypes'

defineProps<FillingVisualProps>()

const segments = [
  { size: 52.5, shadow: false },
  { size: 5, shadow: true },
]
</script>

<template>
  <g data-testid="filling-c8" :clip-path="`url(#${idPrefix}-clip)`">
    <ProfiledSheetDrawing v-bind="$props" :segments="segments" />
  </g>
</template>
