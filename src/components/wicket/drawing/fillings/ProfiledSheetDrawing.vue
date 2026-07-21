<script setup lang="ts">
import { computed } from 'vue'
import type { FillingVisualProps, ProfileSegment } from './fillingDrawingTypes'

const props = defineProps<FillingVisualProps & {
  segments: ProfileSegment[]
}>()

const clipId = `${props.idPrefix}-clip`
const textureId = `${props.idPrefix}-texture`
const limit = computed(() => props.direction === 'vertical' ? props.area.width : props.area.height)
const shadows = computed(() => {
  const result: Array<{ x: number; y: number; width: number; height: number }> = []
  for (let offset = 0; offset < limit.value;) {
    for (const segment of props.segments) {
      if (offset >= limit.value) break
      const size = Math.min(segment.size, limit.value - offset)
      if (segment.shadow) {
        result.push(props.direction === 'vertical'
          ? { x: props.area.x + offset, y: props.area.y, width: size, height: props.area.height }
          : { x: props.area.x, y: props.area.y + offset, width: props.area.width, height: size })
      }
      offset += segment.size
    }
  }
  return result
})
</script>

<template>
  <g :clip-path="`url(#${clipId})`">
    <defs>
      <clipPath :id="clipId"><rect v-bind="area" /></clipPath>
      <pattern v-if="appearanceMode === 'coating' && image" :id="textureId" patternUnits="userSpaceOnUse" width="240" height="240">
        <image :href="image" width="240" height="240" preserveAspectRatio="xMidYMid slice" />
      </pattern>
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
    <rect
      v-for="(shadow, index) in shadows"
      :key="index"
      data-testid="filling-profile-shadow"
      v-bind="shadow"
      fill="rgba(0,0,0,.25)"
    />
  </g>
</template>
