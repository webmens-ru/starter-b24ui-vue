<script setup lang="ts">
import { computed } from 'vue'
import type { FillingArea } from './fillingDrawingTypes'

const props = defineProps<{ area: FillingArea; width: number; color: string }>()
const strips = computed(() => {
  const { x, y, width: w, height: h } = props.area
  const face = Math.min(props.width, w / 2, h / 2)
  if (![x, y, w, h, face].every(Number.isFinite) || face <= 0) return []
  // Vertical strips run full height; horizontal strips overlap their square ends.
  return [
    { x, y, width: face, height: h },
    { x: x + w - face, y, width: face, height: h },
    { x, y, width: w, height: face },
    { x, y: y + h - face, width: w, height: face },
  ]
})
</script>

<template>
  <g v-if="strips.length" data-testid="siding-edging" :data-face-width="width" :fill="color || '#d1d5db'" stroke="#555555" stroke-width="1">
    <rect v-for="(strip, index) in strips" :key="index" v-bind="strip" vector-effect="non-scaling-stroke" />
  </g>
</template>
