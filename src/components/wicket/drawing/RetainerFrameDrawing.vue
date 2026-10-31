<script setup lang="ts">
import type { RetainerFrame } from './mitredRetainerGeometry'
defineProps<{ frame: RetainerFrame; color: string }>()
</script>
<template>
  <g :data-face="frame.face" :data-depth="frame.depth" :fill="color" stroke="#000" stroke-width="1">
    <template v-for="(part, index) in frame.parts" :key="index">
      <polygon v-if="part.points" :data-position="part.position" :points="part.points" />
      <rect v-else :data-position="part.position" :x="part.x" :y="part.y" :width="part.width" :height="part.height" />
    </template>
  </g>
</template>
