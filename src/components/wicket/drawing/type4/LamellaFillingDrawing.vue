<script setup lang="ts">
import { computed } from 'vue'
import MaterialFillingDrawing from '../fillings/MaterialFillingDrawing.vue'
import type { FillingVisualProps } from '../fillings/fillingDrawingTypes'
import { buildLamellae } from './type4Geometry'
const props = defineProps<FillingVisualProps & { lamellaWidth: unknown }>()
const lamellae = computed(() => buildLamellae(props.area, props.lamellaWidth, props.direction))
</script>
<template>
  <g data-testid="type4-lamella-filling">
    <MaterialFillingDrawing v-bind="props" />
    <rect v-for="(part, index) in lamellae" :key="index" data-testid="type4-lamella" v-bind="part" fill="none" stroke="#30343a" stroke-width="0.7" />
  </g>
</template>
