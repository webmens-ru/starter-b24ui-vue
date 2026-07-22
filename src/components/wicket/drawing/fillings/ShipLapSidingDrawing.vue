<script setup lang="ts">
import type { FillingVisualProps } from './fillingDrawingTypes'

const props = defineProps<FillingVisualProps>()

const clipId = `${props.idPrefix}-clip`
const textureId = `${props.idPrefix}-texture`
const coatingTextureId = `${props.idPrefix}-coating-texture`
const reliefTextureId = `${props.idPrefix}-relief-texture`
</script>

<template>
  <g data-testid="filling-ship-lap" :clip-path="`url(#${clipId})`">
    <defs>
      <clipPath :id="clipId"><rect v-bind="area" /></clipPath>
      <pattern v-if="appearanceMode === 'coating' && image" :id="textureId" patternUnits="userSpaceOnUse" width="240" height="240">
        <image :href="image" width="240" height="240" preserveAspectRatio="xMidYMid slice" />
      </pattern>
      <pattern v-if="appearanceMode === 'coating' && coatingImage" :id="coatingTextureId" patternUnits="userSpaceOnUse" width="240" height="240">
        <image :href="coatingImage" width="240" height="240" preserveAspectRatio="xMidYMid slice" />
      </pattern>
      <pattern v-if="reliefImage" :id="reliefTextureId" patternUnits="userSpaceOnUse" width="240" height="240" :patternTransform="direction === 'horizontal' ? 'rotate(90)' : undefined">
        <image :href="reliefImage" width="240" height="240" preserveAspectRatio="xMidYMid slice" />
      </pattern>
    </defs>

    <!-- Базовая поверхность -->
    <rect
      v-if="appearanceMode === 'solid'"
      data-testid="filling-surface"
      v-bind="area"
      :fill="color"
    />
    <rect v-if="appearanceMode === 'coating' && !image && color" data-testid="filling-surface" v-bind="area" :fill="color" />
    <rect
      v-if="appearanceMode === 'coating' && !coatingImage && coatingColor"
      data-testid="filling-color-coating"
      v-bind="area"
      :fill="coatingColor"
      opacity="0.1"
    />

    <!-- Текстуры -->
    <rect v-if="appearanceMode === 'coating' && image" data-testid="filling-texture" v-bind="area" :fill="`url(#${textureId})`" />
    <rect v-if="appearanceMode === 'coating' && coatingImage" data-testid="filling-coating-texture" v-bind="area" :fill="`url(#${coatingTextureId})`" />
    <rect v-if="reliefImage" data-testid="filling-relief-texture" v-bind="area" :fill="`url(#${reliefTextureId})`" />

  </g>
</template>
