import { parseDrawingFillingOrientation } from '../../../../app/fillingOrientations'
import { parseDrawingGrilleSide } from '../../../../app/grilleSides'
import { computeJumperGeometry } from '../jumperGeometry'
import { parseDrawingPipeProfiles } from '../pipeProfiles'
import { frameSubtypeCapabilities, resolveFrameSubtype } from '../../frameSubtype'
import { parseOpeningOrientation } from '../../openingOrientation'

export interface Rect { x:number; y:number; width:number; height:number }
interface VisibleRect extends Rect { visible:boolean }
export type Type1Source = Record<string, unknown>
export interface Type1Geometry {
  drawing:{width:number;height:number}; opening:Rect; gate:Rect; gateZone:Rect
  posts:{visible:boolean;left:Rect;right:Rect}; subtype:string; frame:{left:Rect;right:Rect}
  innerFrame:{top:Rect;bottom:Rect;left:Rect;right:Rect}
  rails:{lower:VisibleRect;upper:VisibleRect;vertical:VisibleRect;center:VisibleRect}
  lockPipes:Rect[]
  fillArea:Rect; netArea:VisibleRect; upperNetArea:VisibleRect
  extraRail:VisibleRect&{placement:'above'|'behind'}; hinges:Rect[]; strip:Rect[]
  fill:{color:string;image:string;reverseColor:string;reverseImage:string;direction:'horizontal'|'vertical'}
  yardFill:{color:string;image:string;direction:'horizontal'|'vertical'}
  netImage:string; upperNetImage:string; frameColor:string
}
const R=60, I=20, S=60, C=40
const t=(v:unknown)=>typeof v==='string'?v.trim():''
function n(v:unknown,f:number,min:number,max:number){
  const empty = v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  if (empty) return f;
  const p=Number(v);
  return Math.min(max,Math.max(min,Number.isFinite(p)?p:f))
}
function rect(x:number,y:number,width:number,height:number):Rect{return{x,y,width:Math.max(0,width),height:Math.max(0,height)}}
function color(v:unknown,f:string){const s=t(v);return /^#[\da-f]{6}$/i.test(s)?s:/^[\da-f]{6}$/i.test(s)?`#${s}`:f}
export function topPath(r:Rect){return`M${r.x},${r.y} L${r.x+r.width},${r.y} L${r.x+r.width-r.height},${r.y+r.height} L${r.x+r.height},${r.y+r.height} Z`}
export function bottomPath(r:Rect){return`M${r.x},${r.y+r.height} L${r.x+r.width},${r.y+r.height} L${r.x+r.width-r.height},${r.y} L${r.x+r.height},${r.y} Z`}
export function computeType1Geometry(s:Type1Source):Type1Geometry{
 const orientation=parseOpeningOrientation(s.openingOrientation)
 const fillingOrientation = parseDrawingFillingOrientation(s.raspolozheniyePolotna)
 const ow=n(s.widthProyema,1000,300,10000),oh=n(s.heightProyema,2000,500,5000),clear=n(s.clearanceProyema,50,0,500)
 const jumper=parseDrawingPipeProfiles(s,R)
 const has=jumper.hasPosts,pw=jumper.postWidth,right=orientation.hingeSide==='right'
 const sub=resolveFrameSubtype(s.shieldType),capabilities=frameSubtypeCapabilities(s.shieldType),lowerH=n(s.heightLowerPart,300,0,1000),upperH=n(s.heightTopPart,300,0,1000),sideW=n(s.widthSidePart,300,20,3000)
 const extraSize=jumper.placement==='above'?jumper.overheadJumperHeight:jumper.jumperFaceSize,verticalGeometry=computeJumperGeometry({openingHeight:oh,bottomClearance:clear,hasPosts:has,jumperPlacement:jumper.placement,jumperHeight:extraSize})
 const drawingHeight=oh,gateY=verticalGeometry.gateY,gateHeight=verticalGeometry.gateHeight,postHeight=verticalGeometry.postHeight
 const zx=has?pw:0,zw=ow-(has?pw*2:0),gw=Math.max(0,zw-14),gx=zx+(right?10:4),gate=rect(gx,gateY,gw,gateHeight),gateZone=rect(zx,gateY,zw,gateHeight)
 const gi=rect(gate.x+R,gate.y+R,gate.width-R*2,gate.height-R*2),base=rect(gi.x+I,gi.y+I,gi.width-I*2,gi.height-I*2)
 const ly=Math.max(gi.y,gate.y+gate.height-R-lowerH-S),lower={...rect(gi.x,ly,gi.width,S),visible:capabilities.lower}
 const upperMaxY=sub==='type5'?gi.y+gi.height-S-I:lower.y-S-I
 const uy=Math.min(gi.y+upperH,upperMaxY),upper={...rect(gi.x,uy,gi.width,S),visible:capabilities.top}
 const meshLeft=parseDrawingGrilleSide(s.grilleLocation,capabilities.side)==='lock'?right:!right,vx=meshLeft?Math.min(gi.x+sideW,gi.x+gi.width-S):Math.max(gi.x,gi.x+gi.width-sideW-S),vertical={...rect(vx,gi.y,S,gi.height),visible:capabilities.side}
 let fill=gi,framed=base,net={...rect(0,0,0,0),visible:false},upperNet={...rect(0,0,0,0),visible:false}
 if(capabilities.lower){const fy=capabilities.top?upper.y+upper.height:gi.y;fill=rect(gi.x,fy,gi.width,lower.y-fy);framed=rect(base.x,fy+I,base.width,lower.y-fy-I*2);const ny=lower.y+lower.height;net={...rect(gi.x,ny,gi.width,gi.y+gi.height-ny),visible:true};if(capabilities.top)upperNet={...rect(gi.x,gi.y,gi.width,upper.y-gi.y),visible:true}}
 else if(capabilities.top){const fy=upper.y+upper.height;fill=rect(gi.x,fy,gi.width,gi.y+gi.height-fy);framed=rect(base.x,fy+I,base.width,gi.y+gi.height-fy-I*2);upperNet={...rect(gi.x,gi.y,gi.width,upper.y-gi.y),visible:true}}
 else if(sub==='type4'){if(meshLeft){net={...rect(gi.x,gi.y,vertical.x-gi.x,gi.height),visible:true};fill=rect(vertical.x+S,gi.y,gi.x+gi.width-vertical.x-S,gi.height)}else{fill=rect(gi.x,gi.y,vertical.x-gi.x,gi.height);net={...rect(vertical.x+S,gi.y,gi.x+gi.width-vertical.x-S,gi.height),visible:true}}framed=rect(fill.x+I,fill.y+I,fill.width-I*2,fill.height-I*2)}
 const inner={top:rect(framed.x-I,framed.y-I,framed.width+I*2,I),bottom:rect(framed.x-I,framed.y+framed.height,framed.width+I*2,I),left:rect(framed.x-I,framed.y,I,framed.height),right:rect(framed.x+framed.width,framed.y,I,framed.height)}
 const center={...rect(framed.x,framed.y+(framed.height-C)/2,framed.width,C),visible:framed.width>0&&framed.height>0},hx=right?gate.x+gate.width-6:gate.x-10
 const horizontalFilling=fillingOrientation === 'horizontal'
 const lockPipeVisible=(horizontalFilling?fill.height:fill.width)>=500
 const lockPipes=lockPipeVisible
  ?[horizontalFilling
    ?rect(fill.x+(fill.width-C)/2,fill.y+I,C,fill.height-I*2)
    :rect(fill.x+I,fill.y+(fill.height-C)/2,fill.width-I*2,C)]
  :[]
 const hinges=[gate.y+100,gate.y+gate.height-250].flatMap(y=>[rect(hx,y,16,75),rect(hx,y+75,16,75)]),sx=right?gate.x-25:gate.x+gate.width-15,strip=[14,12,14].map((w,i,a)=>rect(sx+a.slice(0,i).reduce((q,z)=>q+z,0),gate.y,w,gate.height))
return{drawing:{width:ow,height:drawingHeight},opening:rect(0,0,ow,drawingHeight),gate,gateZone,posts:{visible:has,left:rect(0,verticalGeometry.postY,pw,postHeight),right:rect(ow-pw,verticalGeometry.postY,pw,postHeight)},subtype:sub,frame:{left:rect(gate.x,gate.y,R,gate.height),right:rect(gate.x+gate.width-R,gate.y,R,gate.height)},innerFrame:inner,rails:{lower,upper,vertical,center},lockPipes,fillArea:fill,netArea:net,upperNetArea:upperNet,extraRail:{...rect(0,verticalGeometry.railY,ow,extraSize),visible:verticalGeometry.visible,placement:verticalGeometry.placement},hinges,strip,fill:{color:color(s.colorFacadeHex,''),image:t(s.colorFacadeImage),reverseColor:color(s.colorFacadeReverseHex,'#D7D5C6'),reverseImage:t(s.colorFacadeReverseImage),direction:fillingOrientation ?? 'horizontal'},yardFill:{color:color(s.colorYardHex,''),image:t(s.colorYardImage),direction:fillingOrientation ?? 'horizontal'},netImage:sub==='type5'?'':sub==='type4'?t(s.sideGrilleNetImage):t(s.lowerGrilleNetImage),upperNetImage:capabilities.top?t(s.upperGrilleNetImage):'',frameColor:color(s.colorShieldHex,'#66686c')}
}
