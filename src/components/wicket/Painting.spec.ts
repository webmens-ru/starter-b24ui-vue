import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import Painting from './Painting.vue'
import type { DefineComponent } from 'vue'
import type { PaintItem } from '../../app/api/wicket.types'
type PaintSelectStub = DefineComponent<{ items: Array<{ type?: 'label'; label: string; id?: string }> }>
vi.mock('../../app/api/wicket', async original => ({ ...(await original<typeof import('../../app/api/wicket')>()), getColorShield: vi.fn(), saveWicketData: vi.fn().mockResolvedValue({}), recalculate: vi.fn() }))
const { getColorShield, saveWicketData, recalculate } = await import('../../app/api/wicket')
const color = (id: number) => ({ id, name: `Color ${id}`, hex: '#112233', image: null })
const paint = (id: number, colors: ReturnType<typeof color>[], extra: Partial<PaintItem> = {}): PaintItem => ({ id, name: `Paint ${id}`, paintCategoryId: 30, paintCategoryName: 'Category', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false, colors, primers: [] as Array<{id:number;name:string}>, paintTypeId: null, paintTypeName: null, consumptionRate: null, ...extra })
const catalog = () => ({ colorShield: [paint(1, [color(91)]), paint(2, [color(91), color(92)]), paint(3, [color(93), color(94)]), paint(4, [], { isFixedColor: false, requiresColorNote: true, isCustomerSupplied: true })], paintCategories: [{ id: 30, name: 'Category', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false }] })
const selectStub = { props: ['modelValue', 'items', 'disabled'], template: `<select :value="modelValue ?? ''" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)"><option value=""></option><option v-for="item in items.filter(x=>!x.type)" :value="item.id">{{item.label}}</option></select>` }
const render = () => mount(Painting, { global: { stubs: { B24SelectMenu: selectStub, SelectMenu: selectStub, B24Button: { props: ['label','disabled'], template: '<button :disabled="disabled">{{label}}</button>' }, Button: { props: ['label','disabled'], template: '<button :disabled="disabled">{{label}}</button>' } } } })
describe('separate paint and color', () => {
 beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); vi.mocked(saveWicketData).mockReset().mockResolvedValue({ lockVersion: 2 }); const c=useCalculation(); c.orderId.value=42;c.productRowId.value=7;c.modelId.value='1';vi.mocked(getColorShield).mockResolvedValue(catalog()) })
 it('groups paint options by type IDs inside the selected category, including untyped paints', async () => {
  const data = catalog()
  data.colorShield = [
   paint(1, [color(91)], { paintTypeId: 10, paintTypeName: 'Same type caption' }),
   paint(2, [color(92)], { paintTypeId: 20, paintTypeName: 'Same type caption' }),
   paint(3, [color(93)], { paintTypeId: 10, paintTypeName: 'Same type caption' }),
   paint(4, [], { isFixedColor: false, requiresColorNote: true }),
   paint(5, [color(94)], { paintCategoryId: 31, paintTypeId: 10, paintTypeName: 'Same type caption' }),
  ]
  vi.mocked(getColorShield).mockResolvedValueOnce(data)
  const w = render()
  await flushPromises()
  const options = () => w.getComponent<PaintSelectStub>('[data-testid="paint-product"]').props('items')
  expect(options()).toEqual([
   { type: 'label', label: 'Same type caption' }, { id: '1', label: 'Paint 1' }, { id: '3', label: 'Paint 3' },
   { type: 'label', label: 'Same type caption' }, { id: '2', label: 'Paint 2' },
   { type: 'label', label: 'Без типа' }, { id: '4', label: 'Paint 4' },
  ])
  await w.get('[data-testid="paint-product"]').setValue('2')
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ paintId: 2, paintColorId: 92 }))
  w.unmount()
  data.colorShield = data.colorShield.map(item => ({ ...item, paintTypeName: item.paintTypeId == null ? null : 'Renamed type' }))
  vi.mocked(getColorShield).mockResolvedValueOnce(data)
  const renamed = render()
  await flushPromises()
  expect(renamed.getComponent<PaintSelectStub>('[data-testid="paint-product"]').props('items').filter(item => !item.type).map(item => item.id)).toEqual(['1', '3', '2', '4'])
  renamed.unmount()
 })
 it('keeps incomplete drafts local and saves the complete numeric pair once', async () => {
  const c=useCalculation(); c.loadFromApi({paintId:1,paintColorId:91}); const w=render();await flushPromises();expect(saveWicketData).not.toHaveBeenCalled()
  await w.get('[data-testid="paint-product"]').setValue('3');await flushPromises();expect(c.paintId.value).toBe(1);expect(c.paintColorId.value).toBe(91);expect(saveWicketData).not.toHaveBeenCalled();expect(await w.vm.validateBeforeLeave()).toBe(false)
  await w.get('[data-testid="paint-color"]').setValue('94');await flushPromises();expect(saveWicketData).toHaveBeenCalledTimes(1);expect(saveWicketData).toHaveBeenCalledWith(expect.objectContaining({paintId:3,paintColorId:94}));expect(c.paintId.value).toBe(3);w.unmount()
 })
 it('retains shared colors and auto selects a sole color', async()=>{const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91});const w=render();await flushPromises();await w.get('[data-testid="paint-product"]').setValue('2');await flushPromises();expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:2,paintColorId:91}));await w.get('[data-testid="paint-product"]').setValue('1');await flushPromises();expect(c.paintColorId.value).toBe(91);w.unmount()})
 it('retains failed local choice and saved pair for retry',async()=>{const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91});const w=render();await flushPromises();vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('Failed'));await w.get('[data-testid="paint-product"]').setValue('3');await w.get('[data-testid="paint-color"]').setValue('93');await flushPromises();expect(c.paintId.value).toBe(1);expect(w.get<HTMLSelectElement>('[data-testid="paint-color"]').element.value).toBe('93');expect(await w.vm.validateBeforeLeave()).toBe(true);expect(c.paintId.value).toBe(3);w.unmount()})
 it('uses flags after every label is renamed and requires only explicit note flag',async()=>{const data=catalog();data.colorShield=data.colorShield.map(p=>({...p,name:'Renamed paint',paintCategoryName:'Renamed category',colors:p.colors.map(c=>({...c,name:'Renamed color'}))}));data.paintCategories[0]!.name='Renamed';vi.mocked(getColorShield).mockResolvedValueOnce(data);const c=useCalculation();const w=render();await flushPromises();await w.get('[data-testid="paint-product"]').setValue('4');await flushPromises();expect(w.find('textarea').exists()).toBe(true);expect(await w.vm.validateBeforeLeave()).toBe(false);await w.get('textarea').setValue('Sample');expect(await w.vm.validateBeforeLeave()).toBe(true);expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:4,paintColorId:null,providesPaintCode:'customer'}));expect(c.data.value.find(b=>b.blockCode==='painting')?.params).toContainEqual({paramCode:'paintProduct',name:'Краска',value:'Renamed paint'});w.unmount()})
 it('preserves unavailable saved pair but cannot offer it for a new selection',async()=>{const c=useCalculation();c.loadFromApi({paintId:99,paintColorId:999,colorShieldName:'Historical',paintSelectionUnavailable:true,paintSelection:{isFixedColor:true,requiresColorNote:false,isPaintAvailable:true}});const w=render();await flushPromises();expect(w.text()).toContain('Historical');expect(await w.vm.validateBeforeLeave()).toBe(true);await w.get('[data-testid="paint-product"]').setValue('3');expect(await w.vm.validateBeforeLeave()).toBe(false);expect(w.get('[data-testid="paint-color"]').text()).not.toContain('Historical');w.unmount()})
 it('allows customer painting without catalog',async()=>{vi.mocked(getColorShield).mockRejectedValueOnce(new Error('Offline'));const w=render();await flushPromises();await w.get('input[value="customer"]').setValue();await flushPromises();expect(await w.vm.validateBeforeLeave()).toBe(true);expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({doesPaintingFrameCode:'customer'}));w.unmount()})
 it('does not select a paint or rewrite an existing pair while loading', async () => {
  const c = useCalculation()
  const w = render()
  await flushPromises()
  expect(c.paintId.value).toBeNull()
  expect(w.get<HTMLSelectElement>('[data-testid="paint-color"]').element.disabled).toBe(true)
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
  w.unmount()
 })
 it('keeps optional individual notes optional', async () => {
  const data = catalog()
  data.colorShield[3]!.requiresColorNote = false
  vi.mocked(getColorShield).mockResolvedValueOnce(data)
  const w = render()
  await flushPromises()
  await w.get('[data-testid="paint-product"]').setValue('4')
  await flushPromises()
  expect(w.get('textarea').attributes('required')).toBeUndefined()
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  w.unmount()
 })
 it('preserves hidden saved material choices while customer performs painting', async () => {
  const c = useCalculation()
  c.loadFromApi({paintId:4,paintColorId:null,colorShieldNote:'Sample',primerId:20,doesPaintingFrameCode:'customer'})
  const w = render()
  await flushPromises()
  expect(w.find('[data-testid="paint-product"]').exists()).toBe(false)
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:4,paintColorId:null,primerId:20,colorShieldNote:'Sample'}))
  await w.get('input[value="manufacturer"]').setValue()
  await flushPromises()
  expect(w.get('textarea').element.value).toBe('Sample')
  w.unmount()
 })
 it('clears an incompatible primer after a successful new paint save', async () => {
  const data = catalog()
  data.colorShield[0]!.primers = [{id:10,name:'Primer'}]
  vi.mocked(getColorShield).mockResolvedValueOnce(data)
  const c=useCalculation()
  c.loadFromApi({paintId:1,paintColorId:91,primerId:10})
  const w=render()
  await flushPromises()
  expect(w.get('[data-testid="paint-primer"]').text()).toContain('Primer')
  await w.get('[data-testid="paint-product"]').setValue('2')
  await flushPromises()
  expect(c.primerId.value).toBeNull()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({primerId:null}))
  w.unmount()
 })
 it('shows server field validation details and blocks leaving', async () => {
  const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91})
  const w=render();await flushPromises()
  vi.mocked(saveWicketData).mockRejectedValueOnce({response:{data:{errors:{paintColorId:['Incompatible color']}}}})
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(w.text()).toContain('Incompatible color')
  w.unmount()
 })
 it('allows leaving after saved painting when recalculation fails', async () => {
  const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91});c.priceRetail.value='1000'
  const w=render();await flushPromises()
  c.data.value.push({ blockCode: 'price', blockName: 'Renamed price', params: [] })
  vi.mocked(recalculate).mockRejectedValueOnce(new Error('Price failed'))
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  expect(w.text()).toContain('Окраска сохранена')
  expect(w.text()).toContain('Price failed')
  expect(c.data.value.some(block => block.blockCode === 'price')).toBe(false)
  w.unmount()
 })
 it('does not preserve an unavailable paint through the unavailable-color exception', async () => {
  const c=useCalculation();c.loadFromApi({paintId:99,paintColorId:999,paintSelectionUnavailable:true,paintSelection:{isFixedColor:true,requiresColorNote:false,isPaintAvailable:false}})
  const w=render();await flushPromises()
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
  w.unmount()
 })

 it('locks material inputs while saving and shares the pending acknowledgement with Next', async () => {
  const c = useCalculation()
  c.loadFromApi({ paintId: 1, paintColorId: 91, paintName: 'Paint 1', colorShieldName: 'Color 91' })
  const w = render()
  await flushPromises()
  let resolveSave!: (response: {lockVersion:number}) => void
  vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve }))
  await w.get('[data-testid="paint-product"]').setValue('2')
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.disabled).toBe(true)
  expect(w.get<HTMLSelectElement>('[data-testid="paint-color"]').element.disabled).toBe(true)
  expect(w.get<HTMLFieldSetElement>('fieldset').element.disabled).toBe(true)
  expect(w.findAll('button').find(button => button.text() === 'Далее')?.attributes('disabled')).toBeDefined()
  // Even synthetic emissions from a disabled child must not start an overlapping write.
  w.findAllComponents(selectStub).find(component => component.attributes('data-testid') === 'paint-product')!.vm.$emit('update:modelValue', '1')
  w.findAllComponents(selectStub).find(component => component.attributes('data-testid') === 'paint-color')!.vm.$emit('update:modelValue', '92')
  const leaving = w.vm.validateBeforeLeave()
  await flushPromises()
  expect(saveWicketData).toHaveBeenCalledTimes(1)
  expect(c.paintId.value).toBe(1)
  resolveSave({lockVersion:2})
  expect(await leaving).toBe(true)
  expect(c.getFullSavePayload()).toMatchObject({paintId:2,paintColorId:91})
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.disabled).toBe(false)
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.value).toBe('2')
  w.unmount()
 })
 it('unlocks a failed in-flight save and retries the retained complete draft', async () => {
  const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91})
  const w=render();await flushPromises()
  let rejectSave!: (cause: Error) => void
  vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise((_resolve,reject) => {rejectSave=reject}))
  await w.get('[data-testid="paint-product"]').setValue('2')
  const leaving=w.vm.validateBeforeLeave()
  rejectSave(new Error('Retry needed'))
  expect(await leaving).toBe(false)
  expect(c.paintId.value).toBe(1)
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.disabled).toBe(false)
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  expect(saveWicketData).toHaveBeenCalledTimes(2)
  expect(c.paintId.value).toBe(2)
  w.unmount()
 })
 it('clears incompatible individual notes atomically on fixed-color success and requires a new note on return', async () => {
  const c=useCalculation();c.loadFromApi({paintId:4,paintColorId:null,colorShieldNote:'Old sample'})
  const w=render();await flushPromises()
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('Rejected fixed paint'))
  await w.get('[data-testid="paint-product"]').setValue('1');await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:1,paintColorId:91,colorShieldNote:''}))
  expect(c.getFullSavePayload()).toMatchObject({paintId:4,paintColorId:null,colorShieldNote:'Old sample'})
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  expect(c.colorShieldNote.value).toBe('')
  expect(c.data.value.find(block=>block.blockCode==='painting')?.params.some(param=>param.paramCode==='paintNote')).toBe(false)
  await w.get('[data-testid="paint-product"]').setValue('4');await flushPromises()
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(w.get('textarea').element.value).toBe('')
  w.unmount()
 })
 it('retains the draft note when switching between valid individual paints', async () => {
  const data=catalog()
  data.colorShield.push(paint(5, [], { isFixedColor:false, requiresColorNote:true }))
  vi.mocked(getColorShield).mockResolvedValueOnce(data)
  const c=useCalculation();c.loadFromApi({paintId:4,paintColorId:null,colorShieldNote:'Required sample'})
  const w=render();await flushPromises()
  await w.get('[data-testid="paint-product"]').setValue('5');await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:5,colorShieldNote:'Required sample'}))
  expect(c.colorShieldNote.value).toBe('Required sample')
  w.unmount()
 })
 it('summarizes the acknowledged pair when customer painting preserves an incomplete material draft', async () => {
  const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91,paintName:'Paint 1',colorShieldName:'Color 91'})
  const w=render();await flushPromises()
  await w.get('[data-testid="paint-product"]').setValue('3');await flushPromises()
  await w.get('input[value="customer"]').setValue();await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:1,paintColorId:91}))
  const params=c.data.value.find(block=>block.blockCode==='painting')?.params
  expect(params).toContainEqual({paramCode:'paintProduct',name:'Краска',value:'Paint 1'})
  expect(params).toContainEqual({paramCode:'color',name:'Цвет рамы',value:'Color 91'})
  w.unmount()
 })

 it('keeps inputs locked until the price response for the acknowledged save finishes', async () => {
  const c=useCalculation();c.loadFromApi({paintId:1,paintColorId:91});c.priceRetail.value='1000'
  const w=render();await flushPromises()
  let resolvePrice!: (response: {priceDealer:string;priceRetail:string}) => void
  vi.mocked(recalculate).mockImplementationOnce(() => new Promise(resolve => {resolvePrice=resolve}))
  await w.get('[data-testid="paint-product"]').setValue('2');await flushPromises()
  expect(c.paintId.value).toBe(2)
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.disabled).toBe(true)
  const leaving=w.vm.validateBeforeLeave()
  expect(saveWicketData).toHaveBeenCalledTimes(1)
  resolvePrice({priceDealer:'1500',priceRetail:'2000'})
  expect(await leaving).toBe(true)
  expect(c.priceRetail.value).toBe('2000')
  expect(w.get<HTMLSelectElement>('[data-testid="paint-product"]').element.disabled).toBe(false)
  w.unmount()
 })

 // Defensive wire-boundary resilience: individual flags are valid, but the unavailable-color
 // flag is anomalous with a null palette FK. It must not silently discard a visible note edit.
 it('keeps editable individual notes independent of preserved material state at the history boundary', async () => {
  const c=useCalculation()
  c.loadFromApi({paintId:4,paintColorId:null,colorShieldNote:'Saved sample',paintSelectionUnavailable:true,paintSelection:{isFixedColor:false,requiresColorNote:true,isPaintAvailable:true}})
  const w=render();await flushPromises()
  w.get('textarea').element.value='   '
  await w.get('textarea').trigger('input')
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
  w.get('textarea').element.value='Edited sample'
  await w.get('textarea').trigger('input')
  vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('Note rejected'))
  expect(await w.vm.validateBeforeLeave()).toBe(false)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:4,paintColorId:null,colorShieldNote:'Edited sample'}))
  expect(c.colorShieldNote.value).toBe('Saved sample')
  expect(await w.vm.validateBeforeLeave()).toBe(true)
  expect(c.colorShieldNote.value).toBe('Edited sample')
  expect(c.data.value.find(block=>block.blockCode==='painting')?.params).toContainEqual({paramCode:'paintNote',name:'Примечание к цвету краски',value:'Edited sample'})
  w.unmount()
 })
 it('keeps a local individual-note draft hidden and unsaved while customer performs painting', async () => {
  const c=useCalculation();c.loadFromApi({paintId:4,paintColorId:null,colorShieldNote:'Saved sample'})
  const w=render();await flushPromises()
  w.get('textarea').element.value='Local sample'
  await w.get('textarea').trigger('input')
  await w.get('input[value="customer"]').setValue();await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({paintId:4,colorShieldNote:'Saved sample',doesPaintingFrameCode:'customer'}))
  expect(c.colorShieldNote.value).toBe('Saved sample')
  expect(w.find('textarea').exists()).toBe(false)
  w.unmount()
 })

})
