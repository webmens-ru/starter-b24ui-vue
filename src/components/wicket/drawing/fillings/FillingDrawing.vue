<script setup lang="ts">
import { computed } from 'vue'
import { resolveFillingType } from './fillingTypes'
import ProfnastilC8Drawing from './ProfnastilC8Drawing.vue'
import ProfnastilC20Drawing from './ProfnastilC20Drawing.vue'
import ProfnastilMp10Drawing from './ProfnastilMp10Drawing.vue'
import ProfnastilMp20Drawing from './ProfnastilMp20Drawing.vue'
import LogSidingDrawing from './LogSidingDrawing.vue'
import ShipLapSidingDrawing from './ShipLapSidingDrawing.vue'
import type { FillingDrawingProps } from './fillingDrawingTypes'

const props = defineProps<FillingDrawingProps>()
const renderers = {
  c8: ProfnastilC8Drawing,
  c20: ProfnastilC20Drawing,
  mp10: ProfnastilMp10Drawing,
  mp20: ProfnastilMp20Drawing,
  logSiding: LogSidingDrawing,
  shipLap: ShipLapSidingDrawing,
}
const renderer = computed(() => {
  const fillingType = resolveFillingType(props.profile)
  return fillingType === null ? undefined : renderers[fillingType]
})
</script>

<template>
  <g v-if="renderer" data-testid="filling-drawing">
    <component
      :is="renderer"
      :area="area"
      :direction="direction"
      :color="color"
      :image="image"
      :coating-color="coatingColor"
      :coating-image="coatingImage"
      :relief-image="reliefImage"
      :appearance-mode="appearanceMode"
      :id-prefix="idPrefix"
    />
  </g>
</template>
