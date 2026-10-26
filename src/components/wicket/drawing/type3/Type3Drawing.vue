<script lang="ts">
let instanceCounter = 0
const SCHEMATIC_FRAME_COLOR = '#d1d5db'
const SCHEMATIC_FILL_COLOR = '#bfdbfe'
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useCalculation } from '../../../../composables/useCalculation'
import { resolveJumperPresentation } from '../jumperGeometry'
import { buildType3Geometry } from './type3Geometry'
import { useDrawingGeometry } from '../useDrawingGeometry'

const calc = useCalculation()
const instanceId = instanceCounter++
const showFill = ref(true)
const colorMode = ref<'realistic' | 'schematic'>('realistic')
const viewSide = ref<'street' | 'yard'>('street')
const facadePatternId = `type3-facade-${instanceId}`
const yardPatternId = `type3-yard-${instanceId}`
const upperNetPatternId = `type3-upper-net-pattern-${instanceId}`

const { geometry, error: drawingError } = useDrawingGeometry(() => buildType3Geometry({
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  clearanceProyema: calc.clearanceProyema.value,
  hasStolby: calc.hasStolby.value,
  postProfile: calc.postProfile.value,
  postProfileProblem: calc.postProfileProblem.value,
  jumperProfile: calc.jumperProfile.value,
  jumperProfileProblem: calc.jumperProfileProblem.value,
  shieldType: calc.shieldType.value,
  heightTopPart: calc.heightTopPart.value,
  heightLowerPart: calc.heightLowerPart.value,
  widthSidePart: calc.widthSidePart.value,
  numberOfSticks: calc.fillSide.value === 0 ? 0 : calc.numberOfSticks.value,
  gapName: calc.gapName.value,
  thicknessFacade: calc.thicknessFacade.value,
  raspolozheniyePolotna: calc.fillSide.value === 0 ? undefined : calc.raspolozheniyePolotna.value,
  jumperPlacement: calc.jumperPlacement.value,
  jumperPlacementProblem: calc.jumperPlacementProblem.value,
  postsPresenceProblem: calc.postsPresenceProblem.value,
  colorShieldHex: calc.colorShieldHex.value,
  colorFacadeHex: calc.colorFacadeHex.value,
  colorFacadeImage: calc.colorFacadeImage.value,
  colorYardHex: calc.colorYardHex.value,
  colorYardImage: calc.colorYardImage.value,
  fillSide: calc.fillSide.value,
  upperGrilleNetImage: calc.upperGrilleNetImage.value,
}))

const upperNetImageWidthToHeight = ref(1)
const upperNetTileWidth = computed(() => Math.max(
  1,
  geometry.value.upperNetArea.height * upperNetImageWidthToHeight.value,
))
watch(
  () => drawingError.value ? '' : geometry.value.upperNetImage,
  (imageUrl) => {
    upperNetImageWidthToHeight.value = 1
    if (!imageUrl || typeof window === 'undefined') return

    const image = new window.Image()
    image.onload = () => {
      if (drawingError.value || geometry.value.upperNetImage !== imageUrl || image.naturalHeight <= 0) return
      upperNetImageWidthToHeight.value = image.naturalWidth / image.naturalHeight
    }
    image.src = imageUrl
  },
  { immediate: true },
)

const viewedFill = computed(() => viewSide.value === 'yard' && geometry.value.yard.visible
  ? geometry.value.yard
  : geometry.value.facade)
const viewedPickets = computed(() => {
  if (calc.fillSide.value === 0 || !showFill.value) return []
  if (viewSide.value === 'yard') {
    return geometry.value.yard.visible ? geometry.value.yardPickets : []
  }
  return geometry.value.facadePickets
})
const realisticColors = computed(() => colorMode.value === 'realistic')
const displayedFrameColor = computed(() => realisticColors.value
  ? geometry.value.frameColor
  : SCHEMATIC_FRAME_COLOR)
const activePatternId = computed(() => viewSide.value === 'yard' ? yardPatternId : facadePatternId)
const picketFill = computed(() => !realisticColors.value
  ? SCHEMATIC_FILL_COLOR
  : viewedFill.value.image
  ? `url(#${activePatternId.value})`
  : viewedFill.value.color)
const viewBox = computed(() => `0 0 ${geometry.value.drawing.width} ${geometry.value.drawing.height}`)
const jumperPresentation = computed(() => resolveJumperPresentation(
  geometry.value.extraRail.placement,
  viewSide.value,
))
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="type3-drawing">
    <p v-if="drawingError" role="alert">{{ drawingError }}</p>
    <svg
      v-if="!drawingError"
      data-testid="type3-drawing-svg"
      class="block h-auto max-h-[650px] w-full"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Чертёж калитки типа 3"
      role="img"
    >
      <defs v-if="calc.fillSide.value !== 0 && realisticColors && viewedFill.image">
        <pattern :id="activePatternId" patternUnits="objectBoundingBox" width="1" height="1">
          <image :href="viewedFill.image" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>

      <defs v-if="geometry.upperNetArea.visible && geometry.upperNetImage">
        <pattern
          :id="upperNetPatternId"
          patternUnits="userSpaceOnUse"
          :x="geometry.upperNetArea.x"
          :y="geometry.upperNetArea.y"
          :width="upperNetTileWidth"
          :height="geometry.upperNetArea.height"
        >
          <image
            data-testid="type3-upper-net-image"
            :href="geometry.upperNetImage"
            x="0"
            y="0"
            :width="upperNetTileWidth"
            :height="geometry.upperNetArea.height"
            preserveAspectRatio="xMidYMid meet"
          />
        </pattern>
      </defs>

      <rect v-bind="geometry.opening" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" />
      <rect
        v-if="geometry.extraRail.visible && jumperPresentation.layer === 'background'"
        data-testid="type3-jumper-background"
        :x="geometry.extraRail.x"
        :y="geometry.extraRail.y"
        :width="geometry.extraRail.width"
        :height="geometry.extraRail.height"
        fill="none"
        stroke="#20242a"
        stroke-width="1"
        :stroke-dasharray="jumperPresentation.dashed ? '12 8' : undefined"
      />
      <g v-if="geometry.posts.visible" data-testid="type3-posts" fill="#59606b">
        <rect v-bind="geometry.posts.left" />
        <rect v-bind="geometry.posts.right" />
      </g>
      <rect
        v-if="geometry.upperNetArea.visible && geometry.upperNetImage"
        data-testid="type3-upper-net-background"
        v-bind="geometry.upperNetArea"
        :fill="displayedFrameColor"
      />
      <rect
        v-if="geometry.upperNetArea.visible && geometry.upperNetImage"
        data-testid="type3-upper-net"
        v-bind="geometry.upperNetArea"
        :fill="`url(#${upperNetPatternId})`"
      />
      <g data-testid="type3-frame" :fill="displayedFrameColor" stroke="#20242a" stroke-width="1">
        <rect v-for="(part, index) in geometry.frame" :key="`frame-${index}`" v-bind="part" />
        <rect v-if="geometry.rails.lower.visible" data-testid="type3-lower-rail" v-bind="geometry.rails.lower" />
        <rect v-if="geometry.rails.upper.visible" v-bind="geometry.rails.upper" />
        <rect v-if="geometry.rails.vertical.visible" v-bind="geometry.rails.vertical" />
      </g>
      <g data-testid="type3-pickets" :fill="picketFill" stroke="#30343a" stroke-width="0.7">
        <rect
          v-for="(picket, index) in viewedPickets"
          :key="`picket-${index}`"
          data-testid="type3-picket"
          v-bind="picket"
        />
      </g>
      <rect
        v-if="geometry.extraRail.visible && jumperPresentation.layer === 'foreground'"
        data-testid="type3-jumper-foreground"
        :x="geometry.extraRail.x"
        :y="geometry.extraRail.y"
        :width="geometry.extraRail.width"
        :height="geometry.extraRail.height"
        :fill="displayedFrameColor"
        stroke="#20242a"
        stroke-width="1"
      />
    </svg>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--ui-color-text-secondary)">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          v-model="showFill"
          data-testid="type3-drawing-fill-toggle"
          type="checkbox"
          class="size-4"
        >
        <span>Показывать заполнение</span>
      </label>

      <fieldset class="flex flex-wrap items-center gap-3">
        <legend class="sr-only">Цвета чертежа</legend>
        <span>Цвета:</span>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="colorMode"
            data-testid="type3-drawing-color-realistic"
            type="radio"
            value="realistic"
            class="size-4"
          >
          <span>Реалистичные</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="colorMode"
            data-testid="type3-drawing-color-schematic"
            type="radio"
            value="schematic"
            class="size-4"
          >
          <span>Схематичные</span>
        </label>
      </fieldset>

      <fieldset class="flex flex-wrap items-center gap-3">
        <legend class="sr-only">Сторона просмотра чертежа</legend>
        <span>Вид:</span>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="viewSide"
            data-testid="type3-drawing-view-street"
            type="radio"
            value="street"
            class="size-4"
          >
          <span>С улицы</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="viewSide"
            data-testid="type3-drawing-view-yard"
            type="radio"
            value="yard"
            class="size-4"
          >
          <span>Со двора</span>
        </label>
      </fieldset>
    </div>
  </div>
</template>
