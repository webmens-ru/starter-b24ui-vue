<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useCalculation} from '../../../../composables/useCalculation'
import {bottomPath,computeType1Geometry,topPath} from './type1Geometry'
let idSeed=0
const id=idSeed++,calc=useCalculation(),showFill=ref(true),colors=ref<'realistic'|'schematic'>('realistic'),side=ref<'street'|'yard'>('street')
const g=computed(()=>computeType1Geometry({widthProyema:calc.widthProyema.value,heightProyema:calc.heightProyema.value,clearanceProyema:calc.clearanceProyema.value,hasStolby:calc.hasStolby.value,stolbName:calc.stolbName.value,openingOptionName:calc.openingOptionName.value,shieldType:calc.shieldType.value,heightLowerPart:calc.heightLowerPart.value,heightTopPart:calc.heightTopPart.value,widthSidePart:calc.widthSidePart.value,grilleLocation:calc.grilleLocation.value,peremichkaPolozheniyeName:calc.peremichkaPolozheniyeName.value,peremichkaSortamentName:calc.peremichkaSortamentName.value,materialFacadeGlob:calc.materialFacadeGlob.value,materialFacade:calc.materialFacade.value,colorFacadeHex:calc.colorFacadeHex.value,colorFacadeImage:calc.colorFacadeImage.value,colorFacadeReverseHex:calc.colorFacadeReverseHex?.value,colorFacadeReverseImage:calc.colorFacadeReverseImage?.value,materialYardGlob:calc.materialYardGlob.value,materialYard:calc.materialYard.value,colorYardHex:calc.colorYardHex?.value,colorYardImage:calc.colorYardImage?.value,raspolozheniyePolotna:calc.raspolozheniyePolotna.value,colorShieldHex:calc.colorShieldHex.value,sideGrilleNetImage:calc.sideGrilleNetImage?.value,lowerGrilleNetImage:calc.lowerGrilleNetImage?.value,upperGrilleNetImage:calc.upperGrilleNetImage?.value}))
const yard=computed(()=>side.value==='yard'),real=computed(()=>colors.value==='realistic'),frameColor=computed(()=>real.value?g.value.frameColor:'#d1d5db')
const reverse=computed(()=>yard.value&&calc.fillSide.value==='Одна сторона')
const yardTwoSides=computed(()=>yard.value&&calc.fillSide.value==='Две стороны')
const activeMaterial=computed(()=>yardTwoSides.value?g.value.yardFill.material:g.value.fill.material)
const activeDirection=computed(()=>yardTwoSides.value?g.value.yardFill.direction:g.value.fill.direction)
const fillColor=computed(()=>real.value?(yardTwoSides.value?g.value.yardFill.color:reverse.value?g.value.fill.reverseColor:g.value.fill.color):'#bfdbfe')
const fillImage=computed(()=>real.value?(yardTwoSides.value?g.value.yardFill.image:reverse.value?g.value.fill.reverseImage:g.value.fill.image):'')
type ProfileShadow={x:number;y:number;width:number;height:number}
const profileShadows=computed<ProfileShadow[]>(()=>{
 const profile=activeMaterial.value==='c20'?[{size:67.5,shadow:false},{size:17.5,shadow:true},{size:35,shadow:false},{size:17.5,shadow:true}]:activeMaterial.value==='c8'?[{size:52.5,shadow:false},{size:5,shadow:true}]:[]
 if(!profile.length)return[]
 const area=g.value.fillArea,result:ProfileShadow[]=[]
 const limit=activeDirection.value==='vertical'?area.width:area.height
 for(let offset=0;offset<limit;){for(const segment of profile){if(offset>=limit)break;const size=Math.min(segment.size,limit-offset);if(segment.shadow)result.push(activeDirection.value==='vertical'?{x:area.x+offset,y:area.y,width:size,height:area.height}:{x:area.x,y:area.y+offset,width:area.width,height:size});offset+=segment.size}}
 return result
})
const logWaves=computed<ProfileShadow[]>(()=>{
 if(activeMaterial.value!=='logSiding')return[]
 const area=g.value.fillArea,result:ProfileShadow[]=[],limit=activeDirection.value==='vertical'?area.width:area.height
 for(let offset=0;offset<limit;offset+=175)result.push(activeDirection.value==='vertical'?{x:area.x+offset,y:area.y,width:175,height:area.height}:{x:area.x,y:area.y+offset,width:area.width,height:175})
 return result
})
const logSeams=computed(()=>logWaves.value.flatMap((_,index)=>{if((index+1)%2!==0||index===logWaves.value.length-1)return[];const area=g.value.fillArea,offset=(index+1)*175;return activeDirection.value==='vertical'?[{x1:area.x+offset,y1:area.y,x2:area.x+offset,y2:area.y+area.height}]:[{x1:area.x,y1:area.y+offset,x2:area.x+area.width,y2:area.y+offset}]}))
const inward=computed(()=>/внутрь/i.test(String(calc.openingOptionName.value??''))),behind=computed(()=>inward.value!==yard.value)
const transform=computed(()=>yard.value?`translate(${g.value.drawing.width} 0) scale(-1 1)`:undefined)
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
   <rect v-bind="g.opening" fill="none" stroke="#d9dde5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke"/><rect v-bind="g.gateZone" fill="rgba(37,99,235,.08)"/>
   <g v-if="behind" data-testid="type1-hinges" fill="#e8b923" stroke="#000"><rect v-for="(r,i) in g.hinges" :key="`bh${i}`" v-bind="r"/></g>
   <defs v-if="g.netArea.visible&&g.netImage">
    <pattern v-if="g.subtype==='type4'" :id="`t1-side-${id}`" patternUnits="userSpaceOnUse" :x="g.netArea.x" :y="g.netArea.y" :width="g.netArea.width" :height="netTileH"><image data-testid="type1-drawing-side-net-image" :href="g.netImage" :x="-netTileH/2" :y="-g.netArea.width/2" :width="netTileH" :height="g.netArea.width" :transform="`translate(${g.netArea.width/2} ${netTileH/2}) rotate(90)`" preserveAspectRatio="xMidYMid meet"/></pattern>
    <pattern v-else-if="g.subtype==='type2'||g.subtype==='type3'" :id="`t1-lower-${id}`" patternUnits="userSpaceOnUse" :x="g.netArea.x" :y="g.netArea.y" :width="netTileW" :height="g.netArea.height"><image data-testid="type1-drawing-net-image" :href="g.netImage" x="0" y="0" :width="netTileW" :height="g.netArea.height" preserveAspectRatio="xMidYMid meet"/></pattern>
   </defs>
   <rect v-if="g.netArea.visible&&g.netImage" data-testid="type1-net-background" v-bind="g.netArea" :fill="frameColor"/>
   <rect v-if="g.netArea.visible&&g.netImage" data-testid="type1-net" v-bind="g.netArea" :fill="`url(#${g.subtype==='type4'?`t1-side-${id}`:`t1-lower-${id}`})`"/>
   <defs v-if="g.subtype==='type3'&&g.upperNetArea.visible&&g.upperNetImage"><pattern :id="`t1-upper-${id}`" patternUnits="userSpaceOnUse" :x="g.upperNetArea.x" :y="g.upperNetArea.y" :width="upperTileW" :height="g.upperNetArea.height"><image data-testid="type1-drawing-upper-net-image" :href="g.upperNetImage" x="0" y="0" :width="upperTileW" :height="g.upperNetArea.height" preserveAspectRatio="xMidYMid meet"/></pattern></defs>
   <rect v-if="g.subtype==='type3'&&g.upperNetArea.visible&&g.upperNetImage" data-testid="type1-upper-net-background" v-bind="g.upperNetArea" :fill="frameColor"/>
   <rect v-if="g.subtype==='type3'&&g.upperNetArea.visible&&g.upperNetImage" data-testid="type1-upper-net" v-bind="g.upperNetArea" :fill="`url(#t1-upper-${id})`"/>
   <g v-if="yard&&!yardTwoSides&&showFill&&activeMaterial!=='none'" data-testid="type1-fill"><defs><pattern v-if="fillImage" :id="`t1-fill-${id}`" patternUnits="userSpaceOnUse" width="240" height="240"><image :href="fillImage" width="240" height="240" preserveAspectRatio="xMidYMid slice"/></pattern><linearGradient :id="`t1-log-${id}`" x1="0" y1="0" :x2="activeDirection==='horizontal'?0:1" :y2="activeDirection==='horizontal'?1:0"><stop offset="0%" stop-color="#000" stop-opacity=".28"/><stop offset="22%" stop-color="#000" stop-opacity=".08"/><stop offset="50%" stop-color="#fff" stop-opacity=".18"/><stop offset="78%" stop-color="#000" stop-opacity=".08"/><stop offset="100%" stop-color="#000" stop-opacity=".28"/></linearGradient><clipPath :id="`t1-log-clip-${id}`"><rect v-bind="g.fillArea"/></clipPath></defs><rect v-bind="g.fillArea" :fill="fillColor"/><rect v-if="fillImage" v-bind="g.fillArea" :fill="`url(#t1-fill-${id})`"/><rect v-for="(r,i) in profileShadows" :key="`bps${i}`" data-testid="type1-profile-shadow" v-bind="r" fill="rgba(0,0,0,.25)"/><g data-testid="type1-log-waves" :clip-path="`url(#t1-log-clip-${id})`"><rect v-for="(r,i) in logWaves" :key="`blw${i}`" data-testid="type1-log-wave" v-bind="r" :fill="`url(#t1-log-${id})`"/><line v-for="(l,i) in logSeams" :key="`bls${i}`" v-bind="l" stroke="#000" stroke-width="1" stroke-opacity=".2"/></g></g>
   <g v-if="yard" data-testid="type1-strip" :fill="frameColor" stroke="#000"><rect v-for="(r,i) in g.strip" :key="`bs${i}`" v-bind="r"/></g>
   <g data-testid="type1-frame" :fill="frameColor" stroke="#000" vector-effect="non-scaling-stroke"><rect v-for="(r,k) in g.innerFrame" :key="k" v-bind="r"/><rect v-if="g.rails.center.visible" v-bind="g.rails.center"/><rect v-if="g.rails.lower.visible" v-bind="g.rails.lower"/><rect v-if="g.rails.upper.visible" v-bind="g.rails.upper"/><rect v-if="g.rails.vertical.visible" v-bind="g.rails.vertical"/></g>
   <g :fill="frameColor" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke"><rect v-bind="g.frame.left"/><rect v-bind="g.frame.right"/><path :d="top"/><path :d="bottom"/></g>
   <g v-if="g.posts.visible" :fill="frameColor" stroke="#000" stroke-width="2"><rect v-bind="g.posts.left"/><rect v-bind="g.posts.right"/></g>
   <g v-if="!behind" data-testid="type1-hinges" fill="#e8b923" stroke="#000"><rect v-for="(r,i) in g.hinges" :key="`fh${i}`" v-bind="r"/></g>
   <g v-if="!yard" data-testid="type1-strip" :fill="frameColor" stroke="#000"><rect v-for="(r,i) in g.strip" :key="`fs${i}`" v-bind="r"/></g>
   <rect v-if="g.extraRail.visible" v-bind="g.extraRail" :fill="g.extraRail.placement==='above'?frameColor:'none'" stroke="#000" :stroke-dasharray="g.extraRail.placement==='behind'?'12 8':undefined"/>
   <g v-if="(!yard||yardTwoSides)&&showFill&&activeMaterial!=='none'" data-testid="type1-fill"><defs><pattern v-if="fillImage" :id="`t1-fill-${id}`" patternUnits="userSpaceOnUse" width="240" height="240"><image :href="fillImage" width="240" height="240" preserveAspectRatio="xMidYMid slice"/></pattern><linearGradient :id="`t1-log-${id}`" x1="0" y1="0" :x2="activeDirection==='horizontal'?0:1" :y2="activeDirection==='horizontal'?1:0"><stop offset="0%" stop-color="#000" stop-opacity=".28"/><stop offset="22%" stop-color="#000" stop-opacity=".08"/><stop offset="50%" stop-color="#fff" stop-opacity=".18"/><stop offset="78%" stop-color="#000" stop-opacity=".08"/><stop offset="100%" stop-color="#000" stop-opacity=".28"/></linearGradient><clipPath :id="`t1-log-clip-${id}`"><rect v-bind="g.fillArea"/></clipPath></defs><rect v-bind="g.fillArea" :fill="fillColor"/><rect v-if="fillImage" v-bind="g.fillArea" :fill="`url(#t1-fill-${id})`"/><rect v-for="(r,i) in profileShadows" :key="`fps${i}`" data-testid="type1-profile-shadow" v-bind="r" fill="rgba(0,0,0,.25)"/><g data-testid="type1-log-waves" :clip-path="`url(#t1-log-clip-${id})`"><rect v-for="(r,i) in logWaves" :key="`flw${i}`" data-testid="type1-log-wave" v-bind="r" :fill="`url(#t1-log-${id})`"/><line v-for="(l,i) in logSeams" :key="`fls${i}`" v-bind="l" stroke="#000" stroke-width="1" stroke-opacity=".2"/></g></g>
  </g>
 </svg>
 <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--ui-color-text-secondary)"><label><input v-model="showFill" type="checkbox"> Показывать заполнение</label><fieldset class="flex gap-3"><legend class="sr-only">Цвета</legend><span>Цвета:</span><label><input v-model="colors" type="radio" value="realistic"> Реалистичные</label><label><input v-model="colors" type="radio" value="schematic"> Схематичные</label></fieldset><fieldset class="flex gap-3"><legend class="sr-only">Вид</legend><span>Вид:</span><label><input v-model="side" data-testid="type1-view-street" type="radio" value="street"> С улицы</label><label><input v-model="side" data-testid="type1-view-yard" type="radio" value="yard"> Со двора</label></fieldset></div>
</div></template>
