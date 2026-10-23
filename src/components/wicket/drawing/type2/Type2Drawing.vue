<script lang="ts">
let drawingInstanceId = 0
const SCHEMATIC_FRAME_COLOR = '#d1d5db'
const SCHEMATIC_FILL_COLOR = '#bfdbfe'
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useCalculation } from '../../../../composables/useCalculation'
import FillingDrawing from '../fillings/FillingDrawing.vue'
import { resolveFillingPreview } from '../fillings/fillingTypes'
import { useDrawingGeometry } from '../useDrawingGeometry'
import { resolveJumperPresentation } from '../jumperGeometry'
import { buildBottomRailPath, buildTopRailPath, computeType2Geometry } from './type2Geometry'

const calc = useCalculation()
const showFill = ref(true)
const colorMode = ref<'realistic' | 'schematic'>('realistic')
const viewSide = ref<'street' | 'yard'>('street')
const instanceId = drawingInstanceId++
const netPatternId = `type2-net-pattern-${instanceId}`
const lowerNetPatternId = `type2-lower-net-pattern-${instanceId}`
const upperNetPatternId = `type2-upper-net-pattern-${instanceId}`

const { geometry, error: drawingError } = useDrawingGeometry(() => computeType2Geometry({
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  clearanceProyema: calc.clearanceProyema.value,
  hasStolby: calc.hasStolby.value,
  postProfile: calc.postProfile.value,
  postProfileProblem: calc.postProfileProblem.value,
  jumperProfile: calc.jumperProfile.value,
  jumperProfileProblem: calc.jumperProfileProblem.value,
  openingOrientation: calc.openingOrientation.value,
  shieldType: calc.shieldType.value,
  heightLowerPart: calc.heightLowerPart.value,
  heightTopPart: calc.heightTopPart.value,
  widthSidePart: calc.widthSidePart.value,
  grilleLocation: calc.grilleLocation.value,
  jumperPlacement: calc.jumperPlacement.value,
  jumperPlacementProblem: calc.jumperPlacementProblem.value,
  postsPresenceProblem: calc.postsPresenceProblem.value,
  colorFacade: calc.colorFacade.value,
  colorFacadeHex: calc.colorFacadeHex.value,
  colorFacadeImage: calc.colorFacadeImage.value,
  colorFacadeReverseHex: calc.colorFacadeReverseHex?.value,
  colorFacadeReverseImage: calc.colorFacadeReverseImage?.value,
  colorYardHex: calc.colorYardHex?.value,
  colorYardImage: calc.colorYardImage?.value,
  raspolozheniyePolotna: calc.raspolozheniyePolotna.value,
  colorShieldHex: calc.colorShieldHex.value,
  sideGrilleNetImage: calc.sideGrilleNetImage?.value,
  lowerGrilleNetImage: calc.lowerGrilleNetImage?.value,
  upperGrilleNetImage: calc.upperGrilleNetImage?.value,
}))

if (import.meta.env.DEV) {
  watch(
    () => [
      calc.idFacade?.value,
      calc.colorFacade.value,
      calc.colorFacadeHex.value,
      calc.colorFacadeImage.value,
      drawingError.value ? '' : geometry.value.fill.color,
      drawingError.value ? '' : geometry.value.fill.image,
    ],
    ([idFacade, colorFacade, colorFacadeHex, colorFacadeImage, fillColor, fillImage]) => {
      console.info('[type2-drawing] SVG fill', {
        idFacade,
        colorFacade,
        colorFacadeHex,
        colorFacadeImage,
        fillColor,
        fillImage,
      })
    },
    { immediate: true },
  )
}

const viewBox = computed(() => `0 0 ${geometry.value.drawing.width} ${geometry.value.drawing.height}`)
const realisticColors = computed(() => colorMode.value === 'realistic')
const viewedFromYard = computed(() => viewSide.value === 'yard')
const reverseFacade = computed(() => viewedFromYard.value && calc.fillSide.value === 'Одна сторона')
const yardTwoSides = computed(() => viewedFromYard.value && calc.fillSide.value === 'Две стороны')
const fillingPreview = computed(() => yardTwoSides.value
  ? resolveFillingPreview(calc.idYard.value, calc.fillingProfileYard.value, calc.fillingProfileYardProblem.value, showFill.value)
  : resolveFillingPreview(calc.idFacade.value, calc.fillingProfileFacade.value, calc.fillingProfileFacadeProblem.value, showFill.value))
const previewError = computed(() => drawingError.value || fillingPreview.value.error)
const activeDirection = computed(() => yardTwoSides.value
  ? geometry.value.yardFill.direction
  : geometry.value.fill.direction)
const displayedFrameColor = computed(() => realisticColors.value
  ? geometry.value.frameColor
  : SCHEMATIC_FRAME_COLOR)
const displayedFillColor = computed(() => realisticColors.value
  ? (yardTwoSides.value
      ? geometry.value.yardFill.color
      : reverseFacade.value
        ? geometry.value.fill.reverseColor
        : geometry.value.fill.color)
  : SCHEMATIC_FILL_COLOR)
const displayedFillImage = computed(() => {
  if (!realisticColors.value) return ''
  if (yardTwoSides.value) return geometry.value.yardFill.image
  return reverseFacade.value ? geometry.value.fill.reverseImage : geometry.value.fill.image
})
const displayedCoatingColor = computed(() => realisticColors.value && !reverseFacade.value
  ? (yardTwoSides.value ? (calc.coatingYardHex?.value ?? '') : (calc.coatingFacadeHex?.value ?? ''))
  : '')
const displayedCoatingImage = computed(() => realisticColors.value && !reverseFacade.value
  ? (yardTwoSides.value ? (calc.coatingYardImage?.value ?? '') : (calc.coatingFacadeImage?.value ?? ''))
  : '')
const displayedReliefImage = computed(() => yardTwoSides.value
  ? (calc.reliefYardImage?.value ?? '')
  : (calc.reliefFacadeImage?.value ?? ''))
const netImageWidthToHeight = ref(1)
const netTileHeight = computed(() => Math.max(1, geometry.value.netArea.width * netImageWidthToHeight.value))
const netTileWidth = computed(() => Math.max(1, geometry.value.netArea.height * netImageWidthToHeight.value))
const upperNetImageWidthToHeight = ref(1)
const upperNetTileWidth = computed(() => Math.max(
  1,
  geometry.value.upperNetArea.height * upperNetImageWidthToHeight.value,
))
const opensInward = computed(() => !calc.openingOrientation.value!.opensOutward)
const hingesBehind = computed(() => opensInward.value !== viewedFromYard.value)
const viewTransform = computed(() => viewedFromYard.value
  ? `translate(${geometry.value.drawing.width} 0) scale(-1 1)`
  : undefined)
const jumperPresentation = computed(() => resolveJumperPresentation(
  geometry.value.extraRail.placement,
  viewSide.value,
))

watch(
  () => drawingError.value ? '' : geometry.value.netImage,
  (imageUrl) => {
    netImageWidthToHeight.value = 1
    if (!imageUrl || typeof window === 'undefined') return

    const image = new window.Image()
    image.onload = () => {
      if (drawingError.value || geometry.value.netImage !== imageUrl || image.naturalHeight <= 0) return
      netImageWidthToHeight.value = image.naturalWidth / image.naturalHeight
    }
    image.src = imageUrl
  },
  { immediate: true },
)
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
const topRailPath = computed(() => buildTopRailPath({
  x: geometry.value.gate.x,
  y: geometry.value.gate.y,
  width: geometry.value.gate.width,
  height: Math.min(50, geometry.value.gate.height),
}))
const bottomRailPath = computed(() => buildBottomRailPath({
  x: geometry.value.gate.x,
  y: geometry.value.gate.y + Math.max(0, geometry.value.gate.height - 50),
  width: geometry.value.gate.width,
  height: Math.min(50, geometry.value.gate.height),
}))

</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="previewError" role="alert">{{ previewError }}</p>
    <svg v-else
      data-testid="type2-drawing-svg"
      class="block h-auto max-h-[650px] w-full"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-label="Чертёж калитки типа 2"
      role="img"
    >
      <g data-testid="type2-drawing-view" :transform="viewTransform">
      <!-- Проём -->
      <rect
        :x="geometry.opening.x"
        :y="geometry.opening.y"
        :width="geometry.opening.width"
        :height="geometry.opening.height"
        fill="none"
        stroke="#d9dde5"
        stroke-width="1"
        stroke-dasharray="12 8"
        vector-effect="non-scaling-stroke"
      />

      <rect
        v-if="geometry.extraRail.visible && jumperPresentation.layer === 'background'"
        data-testid="type2-drawing-jumper-background"
        :x="geometry.extraRail.x"
        :y="geometry.extraRail.y"
        :width="geometry.extraRail.width"
        :height="geometry.extraRail.height"
        fill="none"
        stroke="#000"
        stroke-width="1"
        :stroke-dasharray="jumperPresentation.dashed ? '12 8' : undefined"
        vector-effect="non-scaling-stroke"
      />

      <!-- Зона калитки -->
      <rect
        :x="geometry.gateZone.x"
        :y="geometry.gateZone.y"
        :width="geometry.gateZone.width"
        :height="geometry.gateZone.height"
        fill="rgba(37, 99, 235, 0.08)"
      />

      <!-- При открывании внутрь петли находятся за рамой -->
      <g
        v-if="hingesBehind"
        data-testid="type2-drawing-hinges"
        fill="#e8b923"
        stroke="#000"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <rect
          v-for="(hinge, index) in geometry.hinges"
          :key="`back-hinge-${index}`"
          :x="hinge.x"
          :y="hinge.y"
          :width="hinge.width"
          :height="hinge.height"
        />
      </g>

      <!-- Выбранная сетка в боковой области подтипа 4 -->
      <defs v-if="geometry.subtype === 'type4' && geometry.netArea.visible && geometry.netImage">
        <pattern
          :id="netPatternId"
          patternUnits="userSpaceOnUse"
          :x="geometry.netArea.x"
          :y="geometry.netArea.y"
          :width="geometry.netArea.width"
          :height="netTileHeight"
        >
          <image
            data-testid="type2-drawing-net-image"
            :href="geometry.netImage"
            :x="-netTileHeight / 2"
            :y="-geometry.netArea.width / 2"
            :width="netTileHeight"
            :height="geometry.netArea.width"
            :transform="`translate(${geometry.netArea.width / 2} ${netTileHeight / 2}) rotate(90)`"
            preserveAspectRatio="xMidYMid meet"
          />
        </pattern>
      </defs>
      <rect
        v-if="geometry.subtype === 'type4' && geometry.netArea.visible && geometry.netImage"
        data-testid="type2-drawing-net-background"
        :x="geometry.netArea.x"
        :y="geometry.netArea.y"
        :width="geometry.netArea.width"
        :height="geometry.netArea.height"
        :fill="displayedFrameColor"
      />
      <rect
        v-if="geometry.subtype === 'type4' && geometry.netArea.visible && geometry.netImage"
        data-testid="type2-drawing-net"
        :x="geometry.netArea.x"
        :y="geometry.netArea.y"
        :width="geometry.netArea.width"
        :height="geometry.netArea.height"
        :fill="`url(#${netPatternId})`"
      />

      <!-- Нижняя сетка подтипов 2 и 3: целые плитки слева направо -->
      <defs v-if="(geometry.subtype === 'type2' || geometry.subtype === 'type3') && geometry.netArea.visible && geometry.netImage">
        <pattern
          :id="lowerNetPatternId"
          patternUnits="userSpaceOnUse"
          :x="geometry.netArea.x"
          :y="geometry.netArea.y"
          :width="netTileWidth"
          :height="geometry.netArea.height"
        >
          <image
            data-testid="type2-drawing-net-image"
            :href="geometry.netImage"
            x="0"
            y="0"
            :width="netTileWidth"
            :height="geometry.netArea.height"
            preserveAspectRatio="xMidYMid meet"
          />
        </pattern>
      </defs>
      <rect
        v-if="(geometry.subtype === 'type2' || geometry.subtype === 'type3') && geometry.netArea.visible && geometry.netImage"
        data-testid="type2-drawing-net-background"
        :x="geometry.netArea.x"
        :y="geometry.netArea.y"
        :width="geometry.netArea.width"
        :height="geometry.netArea.height"
        :fill="displayedFrameColor"
      />
      <rect
        v-if="(geometry.subtype === 'type2' || geometry.subtype === 'type3') && geometry.netArea.visible && geometry.netImage"
        data-testid="type2-drawing-net"
        :x="geometry.netArea.x"
        :y="geometry.netArea.y"
        :width="geometry.netArea.width"
        :height="geometry.netArea.height"
        :fill="`url(#${lowerNetPatternId})`"
      />

      <!-- Верхняя сетка подтипов 3 и 5: целые плитки слева направо -->
      <defs v-if="geometry.rails.upperSubtype.visible && geometry.upperNetArea.visible && geometry.upperNetImage">
        <pattern
          :id="upperNetPatternId"
          patternUnits="userSpaceOnUse"
          :x="geometry.upperNetArea.x"
          :y="geometry.upperNetArea.y"
          :width="upperNetTileWidth"
          :height="geometry.upperNetArea.height"
        >
          <image
            data-testid="type2-drawing-upper-net-image"
            :href="geometry.upperNetImage"
            x="0"
            y="0"
            :width="upperNetTileWidth"
            :height="geometry.upperNetArea.height"
            preserveAspectRatio="xMidYMid meet"
          />
        </pattern>
      </defs>
      <rect
        v-if="geometry.rails.upperSubtype.visible && geometry.upperNetArea.visible && geometry.upperNetImage"
        data-testid="type2-drawing-upper-net-background"
        :x="geometry.upperNetArea.x"
        :y="geometry.upperNetArea.y"
        :width="geometry.upperNetArea.width"
        :height="geometry.upperNetArea.height"
        :fill="displayedFrameColor"
      />
      <rect
        v-if="geometry.rails.upperSubtype.visible && geometry.upperNetArea.visible && geometry.upperNetImage"
        data-testid="type2-drawing-upper-net"
        :x="geometry.upperNetArea.x"
        :y="geometry.upperNetArea.y"
        :width="geometry.upperNetArea.width"
        :height="geometry.upperNetArea.height"
        :fill="`url(#${upperNetPatternId})`"
      />

      <!-- Со двора профлист находится за каркасом -->
      <g
        v-if="viewedFromYard && !yardTwoSides && showFill"
        data-testid="type2-drawing-fill"
      >
        <FillingDrawing
          :area="geometry.fillArea"
          :profile="fillingPreview.profile"
          :direction="activeDirection"
          :color="displayedFillColor"
          :image="displayedFillImage"
          :coating-color="displayedCoatingColor"
          :coating-image="displayedCoatingImage"
          :relief-image="displayedReliefImage"
          :appearance-mode="realisticColors ? 'coating' : 'solid'"
          :id-prefix="`type2-${instanceId}-yard`"
        />
      </g>

      <!-- Со двора притворная полоса находится за рамой -->
      <g
        v-if="viewedFromYard"
        data-testid="type2-drawing-strip"
        :fill="displayedFrameColor"
        stroke="#000"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <rect
          v-for="(strip, index) in geometry.strip"
          :key="`back-strip-${index}`"
          :x="strip.x"
          :y="strip.y"
          :width="strip.width"
          :height="strip.height"
        />
      </g>

      <!-- Внутренний каркас и подтипные рейки -->
      <g data-testid="type2-drawing-frame" :fill="displayedFrameColor" stroke="#000" stroke-width="1" vector-effect="non-scaling-stroke">
        <rect
          :x="geometry.innerFrame.top.x"
          :y="geometry.innerFrame.top.y"
          :width="geometry.innerFrame.top.width"
          :height="geometry.innerFrame.top.height"
        />
        <rect
          :x="geometry.innerFrame.bottom.x"
          :y="geometry.innerFrame.bottom.y"
          :width="geometry.innerFrame.bottom.width"
          :height="geometry.innerFrame.bottom.height"
        />
        <rect
          :x="geometry.innerFrame.left.x"
          :y="geometry.innerFrame.left.y"
          :width="geometry.innerFrame.left.width"
          :height="geometry.innerFrame.left.height"
        />
        <rect
          :x="geometry.innerFrame.right.x"
          :y="geometry.innerFrame.right.y"
          :width="geometry.innerFrame.right.width"
          :height="geometry.innerFrame.right.height"
        />
        <rect
          v-if="geometry.rails.centerFill.visible"
          :x="geometry.rails.centerFill.x"
          :y="geometry.rails.centerFill.y"
          :width="geometry.rails.centerFill.width"
          :height="geometry.rails.centerFill.height"
        />
        <rect
          v-if="geometry.rails.lowerSubtype.visible"
          :x="geometry.rails.lowerSubtype.x"
          :y="geometry.rails.lowerSubtype.y"
          :width="geometry.rails.lowerSubtype.width"
          :height="geometry.rails.lowerSubtype.height"
        />
        <rect
          v-if="geometry.rails.upperSubtype.visible"
          :x="geometry.rails.upperSubtype.x"
          :y="geometry.rails.upperSubtype.y"
          :width="geometry.rails.upperSubtype.width"
          :height="geometry.rails.upperSubtype.height"
        />
        <rect
          v-if="geometry.rails.verticalSubtype.visible"
          :x="geometry.rails.verticalSubtype.x"
          :y="geometry.rails.verticalSubtype.y"
          :width="geometry.rails.verticalSubtype.width"
          :height="geometry.rails.verticalSubtype.height"
        />
      </g>

      <!-- Боковые рамки (лево/право) -->
      <g :fill="displayedFrameColor" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">
        <rect :x="geometry.gate.x" :y="geometry.gate.y" width="50" :height="geometry.gate.height"/>
        <rect :x="geometry.gate.x + Math.max(0, geometry.gate.width - 50)" :y="geometry.gate.y" width="50" :height="geometry.gate.height"/>
      </g>

      <!-- Направляющие верх/низ — поверх боковых рамок для видимости трапеции -->
      <g :fill="displayedFrameColor" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">
        <path :d="topRailPath"/>
        <path :d="bottomRailPath"/>
      </g>

      <!-- Столбы -->
      <g v-if="geometry.posts.visible" data-testid="type2-drawing-posts" :fill="displayedFrameColor" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">
        <rect
          :x="geometry.posts.left.x"
          :y="geometry.posts.left.y"
          :width="geometry.posts.left.width"
          :height="geometry.posts.left.height"
        />
        <rect
          :x="geometry.posts.right.x"
          :y="geometry.posts.right.y"
          :width="geometry.posts.right.width"
          :height="geometry.posts.right.height"
        />
      </g>

      <!-- Петли -->
      <g
        v-if="!hingesBehind"
        data-testid="type2-drawing-hinges"
        fill="#e8b923"
        stroke="#000"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <rect
          v-for="(hinge, index) in geometry.hinges"
          :key="`hinge-${index}`"
          :x="hinge.x"
          :y="hinge.y"
          :width="hinge.width"
          :height="hinge.height"
        />
      </g>

      <!-- Притворная полоса с улицы -->
      <g
        v-if="!viewedFromYard"
        data-testid="type2-drawing-strip"
        :fill="displayedFrameColor"
        stroke="#000"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <rect
          v-for="(strip, index) in geometry.strip"
          :key="`strip-${index}`"
          :x="strip.x"
          :y="strip.y"
          :width="strip.width"
          :height="strip.height"
        />
      </g>

      <!-- С улицы профлист находится перед каркасом -->
      <g
        v-if="(!viewedFromYard || yardTwoSides) && showFill"
        data-testid="type2-drawing-fill"
      >
        <FillingDrawing
          :area="geometry.fillArea"
          :profile="fillingPreview.profile"
          :direction="activeDirection"
          :color="displayedFillColor"
          :image="displayedFillImage"
          :coating-color="displayedCoatingColor"
          :coating-image="displayedCoatingImage"
          :relief-image="displayedReliefImage"
          :appearance-mode="realisticColors ? 'coating' : 'solid'"
          :id-prefix="`type2-${instanceId}-street`"
        />
      </g>

      <!-- Перемычка переднего плана -->
      <rect
        v-if="geometry.extraRail.visible && jumperPresentation.layer === 'foreground'"
        data-testid="type2-drawing-jumper-foreground"
        :x="geometry.extraRail.x"
        :y="geometry.extraRail.y"
        :width="geometry.extraRail.width"
        :height="geometry.extraRail.height"
        :fill="displayedFrameColor"
        stroke="#000"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />

      </g>
    </svg>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--ui-color-text-secondary)">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          v-model="showFill"
          data-testid="type2-drawing-fill-toggle"
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
            data-testid="type2-drawing-color-realistic"
            type="radio"
            value="realistic"
            class="size-4"
          >
          <span>Реалистичные</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="colorMode"
            data-testid="type2-drawing-color-schematic"
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
            data-testid="type2-drawing-view-street"
            type="radio"
            value="street"
            class="size-4"
          >
          <span>С улицы</span>
        </label>
        <label class="flex cursor-pointer items-center gap-2">
          <input
            v-model="viewSide"
            data-testid="type2-drawing-view-yard"
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
