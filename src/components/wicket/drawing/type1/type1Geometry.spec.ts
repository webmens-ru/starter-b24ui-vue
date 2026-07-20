import {describe,expect,it} from 'vitest'
import {computeType1Geometry} from './type1Geometry'
describe('computeType1Geometry',()=>{
 it('использует отдельную раму Type 1 шириной 60 мм',()=>{const g=computeType1Geometry({});expect(g.frame.left.width).toBe(60);expect(g.drawing).toEqual({width:1000,height:2000})})
 it('учитывает профиль столба',()=>{expect(computeType1Geometry({stolbName:'50/100/3'}).posts.left.width).toBe(100)})
 it('создаёт сетки подтипов',()=>{const g=computeType1Geometry({shieldType:'Тип_3',lowerGrilleNetImage:'/l.png',upperGrilleNetImage:'/u.png'});expect(g.netImage).toBe('/l.png');expect(g.upperNetImage).toBe('/u.png');expect(g.netArea.visible).toBe(true)})
 it('распознаёт профлист С20 отдельно от С8',()=>{expect(computeType1Geometry({materialFacadeGlob:'Профлист',materialFacade:'Профнастил С-20'}).fill.material).toBe('c20')})
 it('распознаёт сайдинг бревно как отдельный профиль',()=>{expect(computeType1Geometry({materialFacadeGlob:'Сайдинг',materialFacade:'Сайдинг «Бревно»'}).fill.material).toBe('logSiding')})
})
