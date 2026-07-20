import {flushPromises,mount} from '@vue/test-utils'
import {createPinia,setActivePinia} from 'pinia'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import type {SidingRow} from '../../../app/api/wicket'
import {useCalculation} from '../../../composables/useCalculation'
import SidingFacade from './SidingFacade.vue'

const rows:SidingRow[]=[]
vi.mock('../../../app/api/wicket',async(importOriginal)=>{const actual=await importOriginal<typeof import('../../../app/api/wicket')>();return{...actual,getSidingTable:vi.fn(async()=>({table:rows,pagination:{page:1,pageSize:100,totalCount:rows.length,pageCount:1}})),saveWicketData:vi.fn(async()=>undefined),recalculate:vi.fn()}})

describe('SidingFacade appearance state',()=>{
 beforeEach(()=>{rows.splice(0);setActivePinia(createPinia());const calc=useCalculation();calc.reset();calc.modelId.value='1'})
 it('переносит HEX и текстуру выбранного сайдинга в чертёж',async()=>{rows.push({id:7,company:'Кровельный центр',material:'Сайдинг «Бревно»',form:'Гладкая',typeOfCoating:'Глянец',color:'RAL 1014',colorHex:'#D6C29C',colorImage:'/uploads/colors/ral1014.webp'});const wrapper=mount(SidingFacade,{global:{stubs:{B24Button:true,B24Modal:true,FilterDropdown:true}}});await flushPromises();await wrapper.get('tbody input[type="checkbox"]').setValue(true);const calc=useCalculation();expect(calc.colorFacadeHex.value).toBe('#D6C29C');expect(calc.colorFacadeImage.value).toBe('/uploads/colors/ral1014.webp')})
})
