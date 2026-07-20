import {describe,expect,it} from 'vitest'
import {mockGetSidingTable} from './mockWicket'

describe('mockGetSidingTable',()=>{
 it('возвращает визуальный цвет сайдинга как реальный API',async()=>{const result=await mockGetSidingTable({companies:[],materials:['Сайдинг «Бревно»'],form:[],typeOfCoating:[],colors:['RAL 1015']});expect(result.table[0].colorHex).toBe('#E6D2B5')})
})
