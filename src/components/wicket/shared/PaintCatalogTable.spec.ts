import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaintCatalogTable from './PaintCatalogTable.vue'
import type { PaintItem } from '../../../app/api/wicket.types'
const paints: PaintItem[] = [1, 2].map(id => ({ id, name: `Paint ${id}`, paintCategoryId: id, paintCategoryName: 'Category', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false, paintTypeId: id, paintTypeName: `Type ${id}`, consumptionRate: 100, priceM2: id === 1 ? 123 : null, primers: [], colors: [91, 92].map(id => ({id, name: `Color ${id}`, hex: '#112233', image: null})) }))
describe('paint catalog table', () => {
 it('shows every paint/color pair and filters by IDs without changing selection', async () => {
  const w = mount(PaintCatalogTable, { props: { paints, paintId: 1, colorId: 91 } })
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
 it('preserves FK selection when labels change and blocks selection while saving', async () => {
  const w = mount(PaintCatalogTable, { props: { paints, paintId: 2, colorId: 92, disabled: true } })
  await w.setProps({ paints: paints.map(p => ({...p, name: 'Renamed', paintTypeName: 'Renamed type', colors: p.colors.map(c => ({...c, name: 'Renamed color'}))})) })
  expect(w.get('[aria-pressed="true"]').attributes('data-paint-row')).toBe('2:92')
  await w.get('[aria-pressed="true"]').trigger('click')
  expect(w.emitted('select')).toBeUndefined()
  expect(w.get<HTMLSelectElement>('[data-testid="paint-type-filter"]').element.disabled).toBe(true)
 })
})
