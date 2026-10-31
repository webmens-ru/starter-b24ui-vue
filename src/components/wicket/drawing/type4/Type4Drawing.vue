<script lang="ts">
let instanceSeed = 0
</script>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCalculation } from '../../../../composables/useCalculation'
import WicketBaseDrawing from '../WicketBaseDrawing.vue'
import { useDrawingGeometry } from '../useDrawingGeometry'
import { resolveJumperPresentation } from '../jumperGeometry'
import { buildLamellae, buildType4Geometry } from './type4Geometry'
import LamellaFillingDrawing from './LamellaFillingDrawing.vue'

const id = instanceSeed++
const calc = useCalculation()
const yard = ref(false), schematic = ref(false), showFill = ref(true)
const { geometry: g, error } = useDrawingGeometry(() => buildType4Geometry({
  widthProyema: calc.widthProyema.value, heightProyema: calc.heightProyema.value, clearanceProyema: calc.clearanceProyema.value,
  hasStolby: calc.hasStolby.value, postsPresenceProblem: calc.postsPresenceProblem.value,
  postProfile: calc.postProfile.value, postProfileProblem: calc.postProfileProblem.value,
  jumperPlacement: calc.jumperPlacement.value, jumperPlacementProblem: calc.jumperPlacementProblem.value,
  jumperProfile: calc.jumperProfile.value, jumperProfileProblem: calc.jumperProfileProblem.value,
  openingOrientation: calc.openingOrientation.value, shieldType: calc.shieldType.value,
  heightTopPart: calc.heightTopPart.value, heightLowerPart: calc.heightLowerPart.value,
  widthSidePart: calc.widthSidePart.value, grilleLocation: calc.grilleLocation.value,
  upperGrilleNetImage: calc.upperGrilleNetImage.value, lowerGrilleNetImage: calc.lowerGrilleNetImage.value,
  sideGrilleNetImage: calc.sideGrilleNetImage.value,
  raspolozheniyePolotna: calc.fillSide.value === 0 ? undefined : calc.raspolozheniyePolotna.value,
}))
const netRatios = ref<Record<string, number>>({})
watch(() => error.value ? [] : g.value.netAreas.map(net => net.image), (images, _, cleanup) => {
  let active = true
  cleanup(() => { active = false })
  netRatios.value = {}
  for (const url of images) {
    if (!url || typeof window === 'undefined') continue
    const image = new window.Image()
    image.onload = () => { if (active && image.naturalHeight > 0) netRatios.value = { ...netRatios.value, [url]: image.naturalWidth / image.naturalHeight } }
    image.src = url
  }
}, { immediate: true })
function netTile(net: { area: { width: number; height: number }; image: string; side: boolean }): { width: number; height: number } {
  const ratio = netRatios.value[net.image] ?? 1
  return net.side ? { width: net.area.width, height: Math.max(1, net.area.width * ratio) } : { width: Math.max(1, net.area.height * ratio), height: net.area.height }
}
const yardMaterial = computed(() => yard.value && calc.fillSide.value === 2)
const hasFill = computed(() => showFill.value && calc.fillSide.value !== 0 && Boolean(yardMaterial.value ? calc.idYard.value : calc.idFacade.value))
const lamellaWidth = computed(() => yardMaterial.value ? calc.thicknessYard.value : calc.thicknessFacade.value)
const fillingError = computed(() => {
  if (error.value || !hasFill.value) return ''
  try {
    if (!g.value.direction) throw new Error('Выберите расположение ламелей.')
    buildLamellae(g.value.fillingArea, lamellaWidth.value, g.value.direction)
    return ''
  } catch (problem) { return problem instanceof Error ? problem.message : 'Не удалось построить заполнение.' }
})
const previewError = computed(() => error.value || fillingError.value)
const frameColor = computed(() => schematic.value ? '#d1d5db' : calc.colorShieldHex.value || '#66686c')
const reverse = computed(() => yard.value && calc.fillSide.value === 1)
const fillingProps = computed(() => ({
  area: g.value.fillingArea, direction: g.value.direction ?? 'vertical', lamellaWidth: lamellaWidth.value,
  color: schematic.value ? '#bfdbfe' : yardMaterial.value ? calc.colorYardHex.value : reverse.value ? calc.colorFacadeReverseHex.value : calc.colorFacadeHex.value,
  image: schematic.value ? '' : yardMaterial.value ? calc.colorYardImage.value : reverse.value ? calc.colorFacadeReverseImage.value : calc.colorFacadeImage.value,
  coatingColor: schematic.value || reverse.value ? '' : yardMaterial.value ? calc.coatingYardHex.value : calc.coatingFacadeHex.value,
  coatingImage: schematic.value || reverse.value ? '' : yardMaterial.value ? calc.coatingYardImage.value : calc.coatingFacadeImage.value,
  reliefImage: '', appearanceMode: schematic.value ? 'solid' as const : 'coating' as const,
  idPrefix: `type4-fill-${id}-${yard.value ? 'yard' : 'street'}`,
}))
const frontFrame = computed(() => yard.value ? g.value.innerFrames.yard : g.value.innerFrames.street)
const backFrame = computed(() => yard.value ? g.value.innerFrames.street : g.value.innerFrames.yard)
const jumperPresentation = computed(() => resolveJumperPresentation(g.value.extraRail.placement, yard.value ? 'yard' : 'street'))
const viewBox = computed(() => {
  const padding = Math.max(0, ...g.value.base.hinges.map(r => Math.max(-r.x, r.x + r.width - g.value.width)))
  return `${-padding} 0 ${g.value.width + padding * 2} ${g.value.height}`
})
</script>
<template>
  <div class="flex flex-col gap-3">
    <p v-if="previewError" role="alert">{{ previewError }}</p>
    <svg v-else data-testid="type4-drawing-svg" class="block h-auto max-h-[650px] w-full" :viewBox="viewBox" role="img" aria-label="Чертёж калитки типа 4">
      <g :transform="yard ? `translate(${g.width} 0) scale(-1 1)` : undefined">
        <rect x="0" y="0" :width="g.width" :height="g.height" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" />
        <rect v-if="g.extraRail.visible && jumperPresentation.layer === 'background'" data-testid="type4-jumper-background" :x="g.extraRail.x" :y="g.extraRail.y" :width="g.extraRail.width" :height="g.extraRail.height" fill="none" stroke="#000" stroke-dasharray="12 8" />
        <WicketBaseDrawing :geometry="g.base" :orientation="g.orientation" :yard="yard" :color="frameColor" test-prefix="type4">
          <template #background>
            <g v-for="(net, index) in g.netAreas" :key="index" data-testid="type4-net">
              <template v-if="net.image">
                <defs><pattern :id="`type4-net-${id}-${index}`" patternUnits="userSpaceOnUse" :x="net.area.x" :y="net.area.y" :width="netTile(net).width" :height="netTile(net).height">
                  <image :href="net.image" :x="net.side ? -netTile(net).height / 2 : 0" :y="net.side ? -net.area.width / 2 : 0" :width="net.side ? netTile(net).height : netTile(net).width" :height="net.side ? net.area.width : netTile(net).height" :transform="net.side ? `translate(${net.area.width / 2} ${netTile(net).height / 2}) rotate(90)` : undefined" preserveAspectRatio="xMidYMid meet" />
                </pattern></defs>
                <rect v-bind="net.area" :fill="frameColor" /><rect v-bind="net.area" :fill="`url(#type4-net-${id}-${index})`" />
              </template>
            </g>
            <g data-testid="type4-back-inner-frame" :data-face="backFrame.face" :data-depth="backFrame.depth" :fill="frameColor" stroke="#000" stroke-width="1">
              <rect v-for="(part, index) in backFrame.parts" :key="index" v-bind="part" />
            </g>
            <LamellaFillingDrawing v-if="hasFill" v-bind="fillingProps" />
          </template>
          <template #inner>
            <g data-testid="type4-inner-frame" :data-face="frontFrame.face" :data-depth="frontFrame.depth" :fill="frameColor" stroke="#000" stroke-width="1">
              <rect v-for="(part, index) in frontFrame.parts" :key="index" v-bind="part" />
              <rect v-for="(part, index) in g.rails" :key="`rail-${index}`" data-testid="type4-subtype-rail" v-bind="part" />
            </g>
          </template>
        </WicketBaseDrawing>
        <rect v-if="g.extraRail.visible && jumperPresentation.layer === 'foreground'" data-testid="type4-jumper-foreground" :x="g.extraRail.x" :y="g.extraRail.y" :width="g.extraRail.width" :height="g.extraRail.height" :fill="frameColor" stroke="#000" />
      </g>
    </svg>
    <div class="flex flex-wrap gap-3 text-sm">
      <label><input v-model="showFill" data-testid="type4-show-fill" type="checkbox"> Показывать заполнение</label>
      <fieldset class="flex gap-3"><legend class="sr-only">Вид</legend><span>Вид:</span><label><input v-model="yard" type="radio" :value="false"> С улицы</label><label><input v-model="yard" data-testid="type4-view-yard" type="radio" :value="true"> Со двора</label></fieldset>
      <fieldset class="flex gap-3"><legend class="sr-only">Цвета</legend><span>Цвета:</span><label><input v-model="schematic" type="radio" :value="false"> Реалистичные</label><label><input v-model="schematic" data-testid="type4-color-schematic" type="radio" :value="true"> Схематичные</label></fieldset>
    </div>
  </div>
</template>
