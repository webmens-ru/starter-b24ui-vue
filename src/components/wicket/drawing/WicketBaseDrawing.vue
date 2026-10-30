<script setup lang="ts">
import { computed } from 'vue'
import type { OpeningOrientation } from '../../../app/api/wicket.types'
import type { WicketBaseGeometry } from './wicketBaseGeometry'
const props = defineProps<{
  geometry: WicketBaseGeometry
  orientation: OpeningOrientation | null
  yard: boolean
  color: string
  testPrefix: string
}>()
const behind = computed(() => props.orientation ? !props.orientation.opensOutward !== props.yard : false)
</script>
<template>
  <g data-testid="wicket-base">
    <g v-if="behind && geometry.hinges.length" :data-testid="`${testPrefix}-hinges`" fill="#e8b923" stroke="#000" stroke-width="1">
      <rect v-for="(part, index) in geometry.hinges" :key="index" v-bind="part" />
    </g>
    <slot name="background" />
    <g v-if="yard && geometry.strip.length" :data-testid="`${testPrefix}-strip`" :fill="color" stroke="#000" stroke-width="1">
      <rect v-for="(part, index) in geometry.strip" :key="index" v-bind="part" />
    </g>
    <slot name="inner" />
    <g :data-testid="`${testPrefix}-outer-frame`" :fill="color" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">
      <rect v-bind="geometry.outerFrame.left" /><rect v-bind="geometry.outerFrame.right" />
      <path :d="geometry.outerFrame.top" /><path :d="geometry.outerFrame.bottom" />
    </g>
    <g v-if="geometry.posts.visible" :data-testid="`${testPrefix}-posts`" :fill="color" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">
      <rect v-bind="geometry.posts.left" /><rect v-bind="geometry.posts.right" />
    </g>
    <g v-if="!behind && geometry.hinges.length" :data-testid="`${testPrefix}-hinges`" fill="#e8b923" stroke="#000" stroke-width="1">
      <rect v-for="(part, index) in geometry.hinges" :key="index" v-bind="part" />
    </g>
    <g v-if="!yard && geometry.strip.length" :data-testid="`${testPrefix}-strip`" :fill="color" stroke="#000" stroke-width="1">
      <rect v-for="(part, index) in geometry.strip" :key="index" v-bind="part" />
    </g>
    <slot name="foreground" />
  </g>
</template>
