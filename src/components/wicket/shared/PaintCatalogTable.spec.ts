import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import b24UiPlugin from '@bitrix24/b24ui-nuxt/vue-plugin'
import { describe, expect, it } from 'vitest'
import PaintCatalogTable from './PaintCatalogTable.vue'
import type { PaintItem } from '../../../app/api/wicket.types'
const paints: PaintItem[] = [1, 2].map(id => ({ id, name: `Paint ${id}`, paintCategoryId: id, paintCategoryName: 'Category', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false, paintTypeId: id, paintTypeName: `Type ${id}`, consumptionRate: 100, priceM2: id === 1 ? 123 : null, primers: [], colors: [91, 92].map(id => ({id, name: `Color ${id}`, hex: '#112233', image: null})) }))
const selectStub = { props: ['modelValue', 'items', 'disabled'], template: `<select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)"><option v-for="item in items" :value="item.id">{{ item.label }}</option></select>` }
const stubbed = { global: { stubs: { B24SelectMenu: selectStub, SelectMenu: selectStub } } }
describe('paint catalog table', () => {
 it('filters by type ID and partial color text without changing selection', async () => {
  const w = mount(PaintCatalogTable, { ...stubbed, props: { paints, paintId: 1, colorId: 91 } })
  expect(w.findAll('tbody tr')).toHaveLength(4)
  expect(w.text()).toContain('123')
  await w.get('[data-testid="paint-type-filter"]').setValue('2')
  await w.get('[data-testid="paint-color-filter"]').setValue('92')
  expect(w.findAll('tbody tr')).toHaveLength(1)
  expect(w.get('tbody').text()).toContain('Type 2')
  expect(w.emitted('select')).toBeUndefined()
  await w.get('tbody button').trigger('click')
  expect(w.emitted('select')).toEqual([[2, 92]])
 })
 it('selects one paint/color pair through an explicit checkbox without duplicate row events', async () => {
  const w = mount(PaintCatalogTable, { ...stubbed, props: { paints, paintId: 1, colorId: 91 } })
  expect(w.findAll('input[type="checkbox"]')).toHaveLength(4)
  expect(w.findAll<HTMLInputElement>('input[type="checkbox"]').filter(input => input.element.checked)).toHaveLength(1)
  const next = w.get<HTMLInputElement>('[data-paint-checkbox="2:92"]')
  await next.trigger('click')
  expect(w.emitted('select')).toEqual([[2, 92]])
  await w.setProps({ paintId: 2, colorId: 92 })
  expect(next.element.checked).toBe(true)
  expect(w.get<HTMLInputElement>('[data-paint-checkbox="1:91"]').element.checked).toBe(false)
  await next.trigger('click')
  expect(next.element.checked).toBe(true)
  expect(w.emitted('select')).toEqual([[2, 92], [2, 92]])
  await w.setProps({ disabled: true })
  expect(next.element.disabled).toBe(true)
  await next.trigger('click')
  expect(w.emitted('select')).toHaveLength(2)
  w.unmount()
 })
 it('preserves FK selection when labels change and blocks selection while saving', async () => {
  const w = mount(PaintCatalogTable, { ...stubbed, props: { paints, paintId: 2, colorId: 92, disabled: true } })
  await w.setProps({ paints: paints.map(p => ({...p, name: 'Renamed', paintTypeName: 'Renamed type', colors: p.colors.map(c => ({...c, name: 'Renamed color'}))})) })
  expect(w.get('[aria-pressed="true"]').attributes('data-paint-row')).toBe('2:92')
  await w.get('[aria-pressed="true"]').trigger('click')
  expect(w.emitted('select')).toBeUndefined()
  expect(w.get<HTMLSelectElement>('[data-testid="paint-type-filter"]').element.disabled).toBe(true)
 })
})

it('filters table immediately by partial color text without changing the saved selection', async () => {
 const options = paints.map(paint => ({ ...paint, colors: [
  { id: 91, name: 'RAL 1000', label: 'RAL 1000 - Зелёно-бежевый', hex: '#112233', image: null },
  { id: 92, name: 'RAL 1001', label: 'RAL 1001 - Бежевый', hex: '#112233', image: null },
  { id: 93, name: 'RAL 9003', label: 'RAL 9003 - White', hex: '#ffffff', image: null },
 ] }))
 const w = mount(PaintCatalogTable, { ...stubbed, props: { paints: options, paintId: 1, colorId: 93 } })
 const input = w.get<HTMLInputElement>('input[data-testid="paint-color-filter"]')
 await input.setValue('  бЕж ')
 expect(w.findAll('tbody tr')).toHaveLength(4)
 expect(w.get('tbody').text()).not.toContain('White')
 expect(w.emitted('select')).toBeUndefined()
 await w.get('[data-testid="paint-type-filter"]').setValue('2')
 expect(w.findAll('tbody tr')).toHaveLength(2)
 await input.setValue('1001')
 expect(w.findAll('tbody tr')).toHaveLength(1)
 await input.setValue('not found')
 expect(w.findAll('tbody tr')).toHaveLength(0)
 expect(w.get('[role="status"]').text()).toContain('Нет красок')
 await input.setValue('')
 expect(w.findAll('tbody tr')).toHaveLength(3)
 await w.get('[data-testid="paint-type-filter"]').setValue('all')
 expect(w.get<HTMLInputElement>('[data-paint-checkbox="1:93"]').element.checked).toBe(true)
 expect(w.emitted('select')).toBeUndefined()
 w.unmount()
})

it('retains searchable type selection alongside the live color query', async () => {
 const w = mount(PaintCatalogTable, { props: { paints, paintId: 1, colorId: 91 }, attachTo: document.body, global: { plugins: [b24UiPlugin] } })
 await w.get('input[data-testid="paint-color-filter"]').setValue('92')
 expect(w.findAll('tbody tr')).toHaveLength(2)
 await w.get('[data-testid="paint-type-filter"]').trigger('click'); await flushPromises()
 const popup = new DOMWrapper(document.body)
 await popup.get('input[placeholder="\u041f\u043e\u0438\u0441\u043a \u0442\u0438\u043f\u0430 \u043a\u0440\u0430\u0441\u043a\u0438"]').setValue('Type 2'); await flushPromises()
 expect(popup.findAll('[role="option"]').map(option => option.text())).toEqual(['Type 2'])
 await popup.get('[role="option"]').trigger('click'); await flushPromises()
 expect(w.findAll('tbody tr')).toHaveLength(1)
 expect(w.get('tbody').text()).toContain('Type 2')
 expect(w.emitted('select')).toBeUndefined()
 w.unmount()
})
