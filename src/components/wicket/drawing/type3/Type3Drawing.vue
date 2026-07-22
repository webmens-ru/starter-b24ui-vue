<script lang="ts">
let instanceCounter = 0
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useCalculation } from '../../../../composables/useCalculation'
import { buildType3Geometry } from './type3Geometry'

const calc = useCalculation()
const instanceId = instanceCounter++
const viewSide = ref<'street' | 'yard'>('street')
const facadePatternId = `type3-facade-${instanceId}`
const yardPatternId = `type3-yard-${instanceId}`

const geometry = computed(() => buildType3Geometry({
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  clearanceProyema: calc.clearanceProyema.value,
  hasStolby: calc.hasStolby.value,
  stolbName: calc.stolbName.value,
  shieldType: calc.shieldType.value,
  heightTopPart: calc.heightTopPart.value,
  heightLowerPart: calc.heightLowerPart.value,
  widthSidePart: calc.widthSidePart.value,
  numberOfSticks: calc.numberOfSticks.value,
  gapName: calc.gapName.value,
  thicknessFacade: calc.thicknessFacade.value,
  raspolozheniyePolotna: calc.raspolozheniyePolotna.value,
  peremichkaPolozheniyeName: calc.peremichkaPolozheniyeName.value,
  colorShieldHex: calc.colorShieldHex.value,
  colorFacadeHex: calc.colorFacadeHex.value,
  colorFacadeImage: calc.colorFacadeImage.value,
  colorYardHex: calc.colorYardHex.value,
  colorYardImage: calc.colorYardImage.value,
  fillSide: calc.fillSide.value,
}))

const viewedFill = computed(() => viewSide.value === 'yard' && geometry.value.yard.visible
  ? geometry.value.yard
  : geometry.value.facade)
const viewedPickets = computed(() => viewSide.value === 'yard' && geometry.value.yard.visible
  ? geometry.value.yardPickets
  : geometry.value.facadePickets)
const activePatternId = computed(() => viewSide.value === 'yard' ? yardPatternId : facadePatternId)
const picketFill = computed(() => viewedFill.value.image
  ? `url(#${activePatternId.value})`
  : viewedFill.value.color)
const viewBox = computed(() => `0 0 ${geometry.value.drawing.width} ${geometry.value.drawing.height}`)
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="type3-drawing">
    <svg
      data-testid="type3-drawing-svg"
      class="block h-auto max-h-[650px] w-full"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Чертёж калитки типа 3"
      role="img"
    >
      <defs v-if="viewedFill.image">
        <pattern :id="activePatternId" patternUnits="objectBoundingBox" width="1" height="1">
          <image :href="viewedFill.image" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>

      <rect v-bind="geometry.opening" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" />
      <g v-if="geometry.posts.visible" data-testid="type3-posts" fill="#59606b">
        <rect v-bind="geometry.posts.left" />
        <rect v-bind="geometry.posts.right" />
      </g>
      <g :fill="geometry.frameColor" stroke="#20242a" stroke-width="1">
        <rect v-for="(part, index) in geometry.frame" :key="`frame-${index}`" v-bind="part" />
        <rect v-if="geometry.rails.lower.visible" v-bind="geometry.rails.lower" />
        <rect v-if="geometry.rails.upper.visible" v-bind="geometry.rails.upper" />
        <rect v-if="geometry.rails.vertical.visible" v-bind="geometry.rails.vertical" />
        <rect v-if="geometry.extraRail.visible" v-bind="geometry.extraRail" />
      </g>
      <g :fill="picketFill" stroke="#30343a" stroke-width="0.7">
        <rect
          v-for="(picket, index) in viewedPickets"
          :key="`picket-${index}`"
          data-testid="type3-picket"
          v-bind="picket"
        />
      </g>
    </svg>

    <div v-if="geometry.yard.visible" class="flex justify-center gap-2">
      <button type="button" :aria-pressed="viewSide === 'street'" @click="viewSide = 'street'">Улица</button>
      <button type="button" :aria-pressed="viewSide === 'yard'" @click="viewSide = 'yard'">Двор</button>
    </div>
  </div>
</template>
