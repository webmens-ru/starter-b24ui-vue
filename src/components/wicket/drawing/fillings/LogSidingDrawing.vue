<script setup lang="ts">
import { computed } from 'vue'
import type { FillingVisualProps } from './fillingDrawingTypes'

const props = defineProps<FillingVisualProps>()

const clipId = `${props.idPrefix}-clip`
const textureId = `${props.idPrefix}-texture`
const gradientId = `${props.idPrefix}-log-gradient`
const limit = computed(() => props.direction === 'vertical' ? props.area.width : props.area.height)
const waves = computed(() => {
  const result: Array<{ x: number; y: number; width: number; height: number }> = []
  for (let offset = 0; offset < limit.value; offset += 175) {
    result.push(props.direction === 'vertical'
      ? { x: props.area.x + offset, y: props.area.y, width: 175, height: props.area.height }
      : { x: props.area.x, y: props.area.y + offset, width: props.area.width, height: 175 })
  }
  return result
})
const seams = computed(() => waves.value.flatMap((_, index) => {
  if ((index + 1) % 2 !== 0 || index === waves.value.length - 1) return []
  const offset = (index + 1) * 175
  return [props.direction === 'vertical'
    ? { x1: props.area.x + offset, y1: props.area.y, x2: props.area.x + offset, y2: props.area.y + props.area.height }
    : { x1: props.area.x, y1: props.area.y + offset, x2: props.area.x + props.area.width, y2: props.area.y + offset }]
}))
</script>

<template>
  <g data-testid="filling-log-siding" :clip-path="`url(#${clipId})`">
    <defs>
      <clipPath :id="clipId"><rect v-bind="area" /></clipPath>
      <pattern v-if="appearanceMode === 'coating' && image" :id="textureId" patternUnits="userSpaceOnUse" width="240" height="240">
        <image :href="image" width="240" height="240" preserveAspectRatio="xMidYMid slice" />
      </pattern>
      <linearGradient :id="gradientId" x1="0" y1="0" :x2="direction === 'horizontal' ? 0 : 1" :y2="direction === 'horizontal' ? 1 : 0">
        <stop offset="0%" stop-color="#000" stop-opacity=".28" />
        <stop offset="22%" stop-color="#000" stop-opacity=".08" />
        <stop offset="50%" stop-color="#fff" stop-opacity=".18" />
        <stop offset="78%" stop-color="#000" stop-opacity=".08" />
        <stop offset="100%" stop-color="#000" stop-opacity=".28" />
      </linearGradient>
    </defs>
    <rect
      v-if="appearanceMode === 'solid'"
      data-testid="filling-surface"
      v-bind="area"
      :fill="color"
    />
    <rect v-if="appearanceMode === 'coating' && !image && color" data-testid="filling-surface" v-bind="area" fill="#f6f6f6" />
    <rect
      v-if="appearanceMode === 'coating' && !image && color"
      data-testid="filling-color-coating"
      v-bind="area"
      :fill="color"
      opacity="0.1"
    />
    <rect v-if="appearanceMode === 'coating' && image" data-testid="filling-texture" v-bind="area" :fill="`url(#${textureId})`" />
    <g data-testid="filling-log-waves" :clip-path="`url(#${clipId})`">
      <rect v-for="(wave, index) in waves" :key="index" data-testid="filling-log-wave" v-bind="wave" :fill="`url(#${gradientId})`" />
      <line v-for="(seam, index) in seams" :key="index" v-bind="seam" stroke="#000" stroke-width="1" stroke-opacity=".2" />
    </g>
  </g>
</template>
