import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { useCalculation } from '../../composables/useCalculation'
import { getCoverStrips, saveWicketData } from '../../app/api/wicket'
import CoverStrip from './CoverStrip.vue'

vi.mock('../../app/api/wicket', async original => ({ ...await original<typeof import('../../app/api/wicket')>(), getCoverStrips: vi.fn(), saveWicketData: vi.fn(async () => ({ lockVersion: 1 })), recalculate: vi.fn() }))
const item = (materialItemId: number, colors = [2, 3]) => ({ materialItemId, name: `Материал ${materialItemId}`, article: '', price: 10, attributes: {}, orderParameters: [{ attributeId: 5, code: 'color', name: 'Переименованный цвет', dataType: 'color', required: true, values: colors.map(id => ({ id, label: `Цвет ${id}` })) }] })
const ButtonStub = defineComponent({ props: ['label'], template: '<button>{{ label }}</button>' })
const SelectStub = defineComponent({ props: ['modelValue', 'items', 'placeholder'], emits: ['update:modelValue'], template: `<select :value="modelValue ?? ''" @change="$emit('update:modelValue', Number($event.target.value) || undefined)"><option value="">{{ placeholder }}</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.label }}</option></select>` })
const mountCoverStrip = () => mount(CoverStrip, { global: { stubs: {
  B24Button: ButtonStub, Button: ButtonStub, B24SelectMenu: SelectStub, SelectMenu: SelectStub,
} } })
const setup = async () => { const wrapper = mountCoverStrip(); await flushPromises(); return wrapper }
const click = async (wrapper: ReturnType<typeof mount>, text: string) => { await wrapper.findAll('button').find(b => b.text() === text)!.trigger('click'); await flushPromises() }
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); vi.mocked(getCoverStrips).mockResolvedValue({ items: [item(10), item(11, [4])] }); vi.mocked(saveWicketData).mockResolvedValue({ lockVersion: 1 }); const calc = useCalculation(); calc.orderId.value = 1; calc.productRowId.value = 2; calc.modelId.value = '1' })
it('starts with none and retains at most four incomplete cards in shared validation', async () => {
  const wrapper = await setup(); expect(wrapper.text()).toContain('Не требуется'); expect(saveWicketData).not.toHaveBeenCalled()
  for (let i = 0; i < 5; i++) await click(wrapper, 'Добавить нащельник')
  expect(useCalculation().coverStripDrafts.value).toHaveLength(4)
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
})
it('saves repeated pieces with independent colors, resets changed material, and auto selects singleton', async () => {
  const wrapper = await setup()
  await click(wrapper, 'Добавить нащельник'); await wrapper.find('[data-material]').setValue('10'); await wrapper.find('[data-color]').setValue('2'); await flushPromises()
  await click(wrapper, 'Добавить нащельник'); await wrapper.findAll('[data-material]')[1]!.setValue('10'); await wrapper.findAll('[data-color]')[1]!.setValue('3'); await flushPromises()
  expect(vi.mocked(saveWicketData).mock.lastCall?.[0].coverStrips).toEqual([{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }] }, { materialItemId: 10, parameters: [{ attributeId: 5, colorId: 3 }] }])
  await wrapper.find('[data-material]').setValue('11'); await flushPromises()
  expect(useCalculation().coverStripDrafts.value[0]?.parameters).toEqual([{ attributeId: 5, colorId: 4 }])
  await wrapper.find('[data-material]').setValue('10'); await flushPromises()
  expect(useCalculation().coverStripDrafts.value[0]?.parameters[0]?.colorId).toBeNull()
  await click(wrapper, 'Не требуется'); expect(vi.mocked(saveWicketData).mock.lastCall?.[0].coverStrips).toEqual([])
})
it('restores saved list and friendly summary when autosave fails', async () => {
  const calc = useCalculation(); calc.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 2 }] }] })
  const wrapper = await setup(); vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('SQL SELECT secret'))
  await wrapper.find('[data-color]').setValue('3'); await flushPromises()
  expect(calc.coverStripDrafts.value[0]?.parameters[0]?.colorId).toBe(2)
  expect(wrapper.text()).toContain('Не удалось сохранить'); expect(wrapper.text()).not.toContain('SQL SELECT')
})
it('displays unavailable saved description and requires replacement', async () => {
  const calc = useCalculation(); calc.loadFromApi({ orderId: 1, productRowId: 2, modelId: '1', coverStrips: [{ materialItemId: 999, parameters: [{ attributeId: 5, colorId: 8 }] }], orders: [{ blockCode: 'coverStrips', blockName: 'Нащельники', params: [{ paramCode: 'coverStrip1', name: 'Нащельник 1', value: 'Сохранённое название и цвет' }] }] })
  const wrapper = await setup(); expect(wrapper.text()).toContain('Сохранённое название и цвет'); expect(wrapper.text()).toContain('Замените')
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(false)
})
it('serializes latest complete list while a save is in flight and drains before navigation', async () => {
  let release!: (value: { lockVersion: number }) => void
  vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const wrapper = await setup()
  await click(wrapper, 'Добавить нащельник'); await wrapper.find('[data-material]').setValue('11'); await flushPromises()
  expect(saveWicketData).toHaveBeenCalledTimes(1)
  await click(wrapper, 'Добавить нащельник'); await wrapper.findAll('[data-material]')[1]!.setValue('11'); await flushPromises()
  expect(saveWicketData).toHaveBeenCalledTimes(1)
  release({ lockVersion: 1 }); await flushPromises()
  expect(vi.mocked(saveWicketData).mock.lastCall?.[0].coverStrips).toHaveLength(2)
  expect(await (wrapper.vm as unknown as { validateBeforeLeave(): Promise<boolean> }).validateBeforeLeave()).toBe(true)
  expect(useCalculation().coverStrips.value).toHaveLength(2)
})
it('does not apply late catalog response to another product row', async () => {
  let release!: (value: { items: ReturnType<typeof item>[] }) => void
  vi.mocked(getCoverStrips).mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const wrapper = mountCoverStrip()
  const calc = useCalculation()
  calc.loadFromApi({ orderId: 1, productRowId: 3, modelId: '1', coverStrips: [{ materialItemId: 11, parameters: [{ attributeId: 5, colorId: 4 }] }] })
  release({ items: [] }); await flushPromises()
  expect(calc.coverStripDrafts.value[0]?.unavailable).toBeUndefined()
  wrapper.unmount()
})
it('does not restore another row after a late failed save', async () => {
  let reject!: (error: Error) => void
  const wrapper = await setup()
  vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  await click(wrapper, 'Добавить нащельник'); await wrapper.find('[data-material]').setValue('11'); await flushPromises()
  const calc = useCalculation(); calc.loadFromApi({ orderId: 1, productRowId: 3, modelId: '1', coverStrips: [] })
  reject(new Error('technical')); await flushPromises()
  expect(calc.coverStripDrafts.value).toEqual([])
  expect(calc.coverStrips.value).toEqual([])
})
it('keeps saved choices when recalculation fails', async () => {
  const { recalculate } = await import('../../app/api/wicket')
  vi.mocked(recalculate).mockRejectedValueOnce(new Error('technical'))
  const wrapper = await setup(); useCalculation().priceRetail.value = '100'
  await click(wrapper, 'Добавить нащельник'); await wrapper.find('[data-material]').setValue('11'); await flushPromises()
  expect(useCalculation().coverStrips.value[0]?.materialItemId).toBe(11)
  expect(wrapper.text()).toContain('сохранены, но не удалось обновить стоимость')
})
it('retains draft on remount and uses stable IDs after catalog captions change', async () => {
  const wrapper = await setup(); await click(wrapper, 'Добавить нащельник'); await wrapper.find('[data-material]').setValue('10'); await flushPromises(); wrapper.unmount()
  vi.mocked(getCoverStrips).mockResolvedValueOnce({ items: [{ ...item(10), name: 'Полностью другая подпись' }] })
  const second = await setup(); expect(useCalculation().coverStripDrafts.value).toHaveLength(1)
  await second.find('[data-color]').setValue('3'); await flushPromises()
  expect(vi.mocked(saveWicketData).mock.lastCall?.[0].coverStrips).toEqual([{ materialItemId: 10, parameters: [{ attributeId: 5, colorId: 3 }] }])
  await click(second, 'Удалить'); expect(useCalculation().coverStrips.value).toEqual([])
})
it('distinguishes same-named materials using typed ready dimensions before selection', async () => {
  vi.mocked(getCoverStrips).mockResolvedValueOnce({ items: [
    { ...item(10), name: 'Одинаковое название', attributes: { width: 40, height: 2000 } },
    { ...item(11), name: 'Одинаковое название', attributes: { width: 25, secondWidth: 25, height: 2500 } },
  ] })
  const wrapper = await setup()
  await click(wrapper, 'Добавить нащельник')
  const options = wrapper.find('[data-material]').findAll('option')
  expect(options.find(option => option.attributes('value') === '10')?.text()).toBe('Одинаковое название; 40×2000 мм')
  expect(options.find(option => option.attributes('value') === '11')?.text()).toBe('Одинаковое название; 25×25×2500 мм')
  await wrapper.find('[data-material]').setValue('11')
  await wrapper.find('[data-color]').setValue('3')
  await flushPromises()
  expect(vi.mocked(saveWicketData).mock.lastCall?.[0].coverStrips).toEqual([{ materialItemId: 11, parameters: [{ attributeId: 5, colorId: 3 }] }])
})
