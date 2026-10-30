<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { parseOpeningOrientation } from '../openingOrientation'
import { computeJumperGeometry, resolveJumperPresentation } from './jumperGeometry'
import { parseDrawingPipeProfiles } from './pipeProfiles'
import { useDrawingGeometry } from './useDrawingGeometry'
import { computeWicketBase } from './wicketBaseGeometry'
import WicketBaseDrawing from './WicketBaseDrawing.vue'

const props = defineProps<{ profileSize: 50 | 60 }>()
const calc = useCalculation()
const yard = ref(false)
const schematic = ref(false)
function dimension(value: unknown, fallback: number, minimum: number): number {
  const parsed = value == null || value === '' ? fallback : Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum) throw new Error('Проверьте размеры проёма и зазора.')
  return parsed
}
const { geometry, error } = useDrawingGeometry(() => {
  const width = dimension(calc.widthProyema.value, 1000, 700)
  const height = dimension(calc.heightProyema.value, 2000, 1500)
  const clearance = dimension(calc.clearanceProyema.value, 50, 0)
  const pipes = parseDrawingPipeProfiles({
    hasStolby: calc.hasStolby.value, postsPresenceProblem: calc.postsPresenceProblem.value,
    postProfile: calc.postProfile.value, postProfileProblem: calc.postProfileProblem.value,
    jumperPlacement: calc.jumperPlacement.value, jumperPlacementProblem: calc.jumperPlacementProblem.value,
    jumperProfile: calc.jumperProfile.value, jumperProfileProblem: calc.jumperProfileProblem.value,
  }, props.profileSize)
  const railHeight = pipes.placement === 'above' ? pipes.overheadJumperHeight : pipes.jumperFaceSize
  const vertical = computeJumperGeometry({ openingHeight: height, bottomClearance: clearance, hasPosts: pipes.hasPosts, jumperPlacement: pipes.placement, jumperHeight: railHeight })
  const orientation = parseOpeningOrientation(calc.openingOrientation.value)
  const base = computeWicketBase({ profileSize: props.profileSize, openingWidth: width, vertical, hasPosts: pipes.hasPosts, postWidth: pipes.postWidth, orientation })
  return { width, height, base, orientation, rail: { x: 0, y: vertical.railY, width, height: railHeight }, railVisible: vertical.visible, placement: vertical.placement }
})
const color = computed(() => schematic.value ? '#d1d5db' : calc.colorShieldHex.value || '#66686c')
const presentation = computed(() => resolveJumperPresentation(geometry.value.placement, yard.value ? 'yard' : 'street'))
const viewBox = computed(() => {
  const g = geometry.value
  const padding = Math.max(0, ...g.base.hinges.map(r => Math.max(-r.x, r.x + r.width - g.width)))
  return `${-padding} 0 ${g.width + 2 * padding} ${g.height}`
})
</script>
<template>
  <div class="flex flex-col gap-3">
    <p v-if="error" role="alert">{{ error }}</p>
    <svg v-else data-testid="base-wicket-svg" class="block h-auto max-h-[650px] w-full" :viewBox="viewBox" role="img" aria-label="Чертёж каркаса калитки">
      <g :transform="yard ? `translate(${geometry.width} 0) scale(-1 1)` : undefined">
        <rect x="0" y="0" :width="geometry.width" :height="geometry.height" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" />
        <rect v-if="geometry.railVisible && presentation.layer === 'background'" data-testid="base-jumper-background" v-bind="geometry.rail" fill="none" stroke="#000" :stroke-dasharray="presentation.dashed ? '12 8' : undefined" />
        <WicketBaseDrawing :geometry="geometry.base" :orientation="geometry.orientation" :yard="yard" :color="color" test-prefix="base-wicket" />
        <rect v-if="geometry.railVisible && presentation.layer === 'foreground'" data-testid="base-jumper-foreground" v-bind="geometry.rail" :fill="color" stroke="#000" />
      </g>
    </svg>
    <div class="flex flex-wrap gap-3 text-sm">
      <fieldset class="flex gap-3"><legend class="sr-only">Вид</legend><span>Вид:</span><label><input v-model="yard" type="radio" :value="false"> С улицы</label><label><input v-model="yard" data-testid="base-view-yard" type="radio" :value="true"> Со двора</label></fieldset>
      <fieldset class="flex gap-3"><legend class="sr-only">Цвета</legend><span>Цвета:</span><label><input v-model="schematic" type="radio" :value="false"> Реалистичные</label><label><input v-model="schematic" data-testid="base-color-schematic" type="radio" :value="true"> Схематичные</label></fieldset>
    </div>
  </div>
</template>
