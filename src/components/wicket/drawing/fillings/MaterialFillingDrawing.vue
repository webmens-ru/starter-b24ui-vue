<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FillingVisualProps } from './fillingDrawingTypes'
import { imageDimensions, reliefLayout, type ImageDimensions, type ReliefMode } from './reliefLayout'

const props = defineProps<FillingVisualProps & { reliefAlongMode?: ReliefMode; reliefAcrossMode?: ReliefMode }>()
const dimensions = ref<ImageDimensions | null>(null)
const clipId = `${props.idPrefix}-clip`
const textureId = `${props.idPrefix}-texture`
const coatingId = `${props.idPrefix}-coating-texture`
const reliefId = `${props.idPrefix}-relief-texture`
watch(() => props.reliefImage, async (source, _, cleanup) => {
  dimensions.value = null
  if (!source) return
  const controller = new AbortController()
  cleanup(() => controller.abort())
  const result = await imageDimensions(source, controller.signal)
  if (!controller.signal.aborted) dimensions.value = result
}, { immediate: true })
const tile = computed(() => dimensions.value && reliefLayout(props.area, dimensions.value, props.direction, props.reliefAlongMode ?? 'stretch', props.reliefAcrossMode ?? 'repeat'))
const reliefTransform = computed(() => props.direction === 'horizontal'
  ? `translate(${props.area.x + props.area.width} ${props.area.y}) rotate(90)`
  : `translate(${props.area.x} ${props.area.y})`)
</script>

<template>
  <g data-testid="filling-drawing" :clip-path="`url(#${clipId})`">
    <defs>
      <clipPath :id="clipId"><rect v-bind="area" /></clipPath>
      <pattern v-if="image" :id="textureId" patternUnits="userSpaceOnUse" width="240" height="240"><image :href="image" width="240" height="240" preserveAspectRatio="xMidYMid slice" /></pattern>
      <pattern v-if="coatingImage" :id="coatingId" patternUnits="userSpaceOnUse" width="240" height="240"><image :href="coatingImage" width="240" height="240" preserveAspectRatio="xMidYMid slice" /></pattern>
      <pattern v-if="tile" :id="reliefId" data-testid="relief-pattern" patternUnits="userSpaceOnUse" :width="tile.width" :height="tile.height" :patternTransform="reliefTransform">
        <image :href="reliefImage" :width="tile.width" :height="tile.height" preserveAspectRatio="none" />
      </pattern>
    </defs>
    <rect data-testid="filling-surface" v-bind="area" :fill="color || '#d1d5db'" />
    <rect v-if="appearanceMode === 'coating' && image" data-testid="filling-texture" v-bind="area" :fill="`url(#${textureId})`" />
    <rect v-if="appearanceMode === 'coating' && coatingColor && !coatingImage" data-testid="filling-color-coating" v-bind="area" :fill="coatingColor" opacity="0.1" />
    <rect v-if="appearanceMode === 'coating' && coatingImage" data-testid="filling-coating-texture" v-bind="area" :fill="`url(#${coatingId})`" />
    <rect v-if="tile" data-testid="filling-relief-texture" v-bind="area" :fill="`url(#${reliefId})`" />
  </g>
</template>
