<script lang="ts">
let idSeed=0
</script>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useCalculation} from '../../../../composables/useCalculation'
import FillingDrawing from '../fillings/FillingDrawing.vue'
import {resolveJumperPresentation} from '../jumperGeometry'
import {bottomPath,computeType1Geometry,topPath} from './type1Geometry'
const id=idSeed++,calc=useCalculation(),showFill=ref(true),colors=ref<'realistic'|'schematic'>('realistic'),side=ref<'street'|'yard'>('street')
const g=computed(()=>computeType1Geometry({widthProyema:calc.widthProyema.value,heightProyema:calc.heightProyema.value,clearanceProyema:calc.clearanceProyema.value,hasStolby:calc.hasStolby.value,stolbName:calc.stolbName.value,openingOptionName:calc.openingOptionName.value,shieldType:calc.shieldType.value,heightLowerPart:calc.heightLowerPart.value,heightTopPart:calc.heightTopPart.value,widthSidePart:calc.widthSidePart.value,grilleLocation:calc.grilleLocation.value,peremichkaPolozheniyeName:calc.peremichkaPolozheniyeName.value,peremichkaSortamentName:calc.peremichkaSortamentName.value,colorFacadeHex:calc.colorFacadeHex.value,colorFacadeImage:calc.colorFacadeImage.value,colorFacadeReverseHex:calc.colorFacadeReverseHex?.value,colorFacadeReverseImage:calc.colorFacadeReverseImage?.value,colorYardHex:calc.colorYardHex?.value,colorYardImage:calc.colorYardImage?.value,raspolozheniyePolotna:calc.raspolozheniyePolotna.value,colorShieldHex:calc.colorShieldHex.value,sideGrilleNetImage:calc.sideGrilleNetImage?.value,lowerGrilleNetImage:calc.lowerGrilleNetImage?.value,upperGrilleNetImage:calc.upperGrilleNetImage?.value}))
const yard=computed(()=>side.value==='yard'),real=computed(()=>colors.value==='realistic'),frameColor=computed(()=>real.value?g.value.frameColor:'#d1d5db')
const reverse=computed(()=>yard.value&&calc.fillSide.value==='Одна сторона')
const yardTwoSides=computed(()=>yard.value&&calc.fillSide.value==='Две стороны')
const activeMaterialGroup=computed(()=>yardTwoSides.value?(calc.materialYardGlob.value??''):(calc.materialFacadeGlob.value??''))
const activeMaterialName=computed(()=>yardTwoSides.value?(calc.materialYard.value??''):(calc.materialFacade.value??''))
const activeDirection=computed(()=>yardTwoSides.value?g.value.yardFill.direction:g.value.fill.direction)
const fillColor=computed(()=>real.value?(yardTwoSides.value?g.value.yardFill.color:reverse.value?g.value.fill.reverseColor:g.value.fill.color):'#bfdbfe')
const fillImage=computed(()=>real.value?(yardTwoSides.value?g.value.yardFill.image:reverse.value?g.value.fill.reverseImage:g.value.fill.image):'')
const coatingColor=computed(()=>real.value&&!reverse.value?(yardTwoSides.value?(calc.coatingYardHex?.value??''):(calc.coatingFacadeHex?.value??'')):'')
const coatingImage=computed(()=>real.value&&!reverse.value?(yardTwoSides.value?(calc.coatingYardImage?.value??''):(calc.coatingFacadeImage?.value??'')):'')
const reliefImage=computed(()=>yardTwoSides.value?(calc.reliefYardImage?.value??''):(calc.reliefFacadeImage?.value??''))
const inward=computed(()=>/внутрь/i.test(String(calc.openingOptionName.value??''))),behind=computed(()=>inward.value!==yard.value)
const transform=computed(()=>yard.value?`translate(${g.value.drawing.width} 0) scale(-1 1)`:undefined)
const jumperPresentation=computed(()=>resolveJumperPresentation(g.value.extraRail.placement,side.value))
const top=computed(()=>topPath({x:g.value.gate.x,y:g.value.gate.y,width:g.value.gate.width,height:Math.min(60,g.value.gate.height)}))
const bottom=computed(()=>bottomPath({x:g.value.gate.x,y:g.value.gate.y+Math.max(0,g.value.gate.height-60),width:g.value.gate.width,height:Math.min(60,g.value.gate.height)}))
const netRatio=ref(1),upperRatio=ref(1)
function track(url:string,set:(v:number)=>void){set(1);if(!url||typeof window==='undefined')return;const image=new window.Image();image.onload=()=>{if(image.naturalHeight>0)set(image.naturalWidth/image.naturalHeight)};image.src=url}
watch(()=>g.value.netImage,v=>track(v,x=>netRatio.value=x),{immediate:true});watch(()=>g.value.upperNetImage,v=>track(v,x=>upperRatio.value=x),{immediate:true})
const netTileH=computed(()=>Math.max(1,g.value.netArea.width*netRatio.value)),netTileW=computed(()=>Math.max(1,g.value.netArea.height*netRatio.value)),upperTileW=computed(()=>Math.max(1,g.value.upperNetArea.height*upperRatio.value))
</script>
<template><div class="flex flex-col gap-3">
 <svg data-testid="type1-drawing-svg" class="block h-auto max-h-[650px] w-full" :viewBox="`0 0 ${g.drawing.width} ${g.drawing.height}`" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Чертёж калитки типа 1">
  <g :transform="transform">
   <rect v-bind="g.opening" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke"/>
   <rect v-if="g.extraRail.visible&&jumperPresentation.layer==='background'" data-testid="type1-jumper-background" :x="g.extraRail.x" :y="g.extraRail.y" :width="g.extraRail.width" :height="g.extraRail.height" fill="none" stroke="#000" :stroke-dasharray="jumperPresentation.dashed?'12 8':undefined"/>
   <rect v-bind="g.gateZone" fill="rgba(37,99,235,.08)"/>
   <g v-if="behind" data-testid="type1-hinges" fill="#e8b923" stroke="#000"><rect v-for="(r,i) in g.hinges" :key="`bh${i}`" v-bind="r"/></g>
   <defs v-if="g.netArea.visible&&g.netImage">
    <pattern v-if="g.subtype==='type4'" :id="`t1-side-${id}`" patternUnits="userSpaceOnUse" :x="g.netArea.x" :y="g.netArea.y" :width="g.netArea.width" :height="netTileH"><image data-testid="type1-drawing-side-net-image" :href="g.netImage" :x="-netTileH/2" :y="-g.netArea.width/2" :width="netTileH" :height="g.netArea.width" :transform="`translate(${g.netArea.width/2} ${netTileH/2}) rotate(90)`" preserveAspectRatio="xMidYMid meet"/></pattern>
    <pattern v-else-if="g.subtype==='type2'||g.subtype==='type3'" :id="`t1-lower-${id}`" patternUnits="userSpaceOnUse" :x="g.netArea.x" :y="g.netArea.y" :width="netTileW" :height="g.netArea.height"><image data-testid="type1-drawing-net-image" :href="g.netImage" x="0" y="0" :width="netTileW" :height="g.netArea.height" preserveAspectRatio="xMidYMid meet"/></pattern>
   </defs>
   <rect v-if="g.netArea.visible&&g.netImage" data-testid="type1-net-background" v-bind="g.netArea" :fill="frameColor"/>
   <rect v-if="g.netArea.visible&&g.netImage" data-testid="type1-net" v-bind="g.netArea" :fill="`url(#${g.subtype==='type4'?`t1-side-${id}`:`t1-lower-${id}`})`"/>
   <defs v-if="g.rails.upper.visible&&g.upperNetArea.visible&&g.upperNetImage"><pattern :id="`t1-upper-${id}`" patternUnits="userSpaceOnUse" :x="g.upperNetArea.x" :y="g.upperNetArea.y" :width="upperTileW" :height="g.upperNetArea.height"><image data-testid="type1-drawing-upper-net-image" :href="g.upperNetImage" x="0" y="0" :width="upperTileW" :height="g.upperNetArea.height" preserveAspectRatio="xMidYMid meet"/></pattern></defs>
   <rect v-if="g.rails.upper.visible&&g.upperNetArea.visible&&g.upperNetImage" data-testid="type1-upper-net-background" v-bind="g.upperNetArea" :fill="frameColor"/>
   <rect v-if="g.rails.upper.visible&&g.upperNetArea.visible&&g.upperNetImage" data-testid="type1-upper-net" v-bind="g.upperNetArea" :fill="`url(#t1-upper-${id})`"/>
   <g v-if="yard&&!yardTwoSides&&showFill" data-testid="type1-fill"><FillingDrawing :area="g.fillArea" :material-group="activeMaterialGroup" :material-name="activeMaterialName" :direction="activeDirection" :color="fillColor" :image="fillImage" :coating-color="coatingColor" :coating-image="coatingImage" :relief-image="reliefImage" :appearance-mode="real?'coating':'solid'" :id-prefix="`type1-${id}-${yard?'yard':'street'}`"/></g>
   <g v-if="yard" data-testid="type1-strip" :fill="frameColor" stroke="#000"><rect v-for="(r,i) in g.strip" :key="`bs${i}`" v-bind="r"/></g>
   <g data-testid="type1-frame" :fill="frameColor" stroke="#000" vector-effect="non-scaling-stroke"><rect v-for="(r,k) in g.innerFrame" :key="k" v-bind="r"/><rect v-for="(r,i) in g.lockPipes" :key="`lock${i}`" data-testid="type1-lock-pipe" v-bind="r"/><rect v-if="g.rails.lower.visible" v-bind="g.rails.lower"/><rect v-if="g.rails.upper.visible" v-bind="g.rails.upper"/><rect v-if="g.rails.vertical.visible" v-bind="g.rails.vertical"/></g>
   <g :fill="frameColor" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke"><rect v-bind="g.frame.left"/><rect v-bind="g.frame.right"/><path :d="top"/><path :d="bottom"/></g>
   <g v-if="g.posts.visible" :fill="frameColor" stroke="#000" stroke-width="2"><rect v-bind="g.posts.left"/><rect v-bind="g.posts.right"/></g>
   <g v-if="!behind" data-testid="type1-hinges" fill="#e8b923" stroke="#000"><rect v-for="(r,i) in g.hinges" :key="`fh${i}`" v-bind="r"/></g>
   <g v-if="!yard" data-testid="type1-strip" :fill="frameColor" stroke="#000"><rect v-for="(r,i) in g.strip" :key="`fs${i}`" v-bind="r"/></g>
   <g v-if="(!yard||yardTwoSides)&&showFill" data-testid="type1-fill"><FillingDrawing :area="g.fillArea" :material-group="activeMaterialGroup" :material-name="activeMaterialName" :direction="activeDirection" :color="fillColor" :image="fillImage" :coating-color="coatingColor" :coating-image="coatingImage" :relief-image="reliefImage" :appearance-mode="real?'coating':'solid'" :id-prefix="`type1-${id}-${yard?'yard':'street'}`"/></g>
   <rect v-if="g.extraRail.visible&&jumperPresentation.layer==='foreground'" data-testid="type1-jumper-foreground" :x="g.extraRail.x" :y="g.extraRail.y" :width="g.extraRail.width" :height="g.extraRail.height" :fill="frameColor" stroke="#000"/>
  </g>
 </svg>
 <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--ui-color-text-secondary)"><label><input v-model="showFill" type="checkbox"> Показывать заполнение</label><fieldset class="flex gap-3"><legend class="sr-only">Цвета</legend><span>Цвета:</span><label><input v-model="colors" type="radio" value="realistic"> Реалистичные</label><label><input v-model="colors" type="radio" value="schematic"> Схематичные</label></fieldset><fieldset class="flex gap-3"><legend class="sr-only">Вид</legend><span>Вид:</span><label><input v-model="side" data-testid="type1-view-street" type="radio" value="street"> С улицы</label><label><input v-model="side" data-testid="type1-view-yard" type="radio" value="yard"> Со двора</label></fieldset></div>
</div></template>
