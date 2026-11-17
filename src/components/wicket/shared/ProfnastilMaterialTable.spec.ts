import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import ProfnastilMaterialTable from './ProfnastilMaterialTable.vue'

it('selects by material ID when display names are identical and preserves the saved row outside filters', async () => {
  const row = { drawingProfile: null, drawingProfileProblem: null, id: 17, name: 'Одинаково', material: 'Переименованный профиль', typeOfCoating: 'Покрытие', thickness: 0.45, priceM2: '1250.50', profnastilFormCode: 'c8', profnastilFormTitle: 'Форма С8' }
  const saved = { ...row, id: 21 }
  const wrapper = mount(ProfnastilMaterialTable, { props: {
    modelId: '2', rows: [row], selectedRow: saved, loading: false,
    filters: { materials: [], typeOfCoating: [] },
    pagination: { page: 1, pageSize: 100, pageCount: 1, totalCount: 1 },
  }, global: { stubs: ['FilterDropdown'] } })
  expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  expect(wrapper.findAll('thead th')).toHaveLength(5)
  expect(wrapper.find('thead').text()).toContain('Тип покрытия')
  expect(wrapper.text()).toContain('Форма С8')
  expect(wrapper.text()).not.toContain('Одинаково')
  expect(wrapper.find('thead').text()).not.toContain('Материал')
  expect(wrapper.find('thead').text()).toContain('Форма')
  expect(wrapper.find('thead').text()).toContain('Цена за м²')
  expect(wrapper.findAll('tbody tr').map(row => row.findAll('td')[4]!.text().replace(/\s/g, ' '))).toEqual(['1 250,50 ₽', '1 250,50 ₽'])
  expect(wrapper.find('thead').text()).not.toContain('Толщина')
  await wrapper.findAll('tbody input')[1]!.setValue(true)
  expect(wrapper.emitted('select')?.[0]).toEqual([row])
  await wrapper.findAll('tbody input')[0]!.setValue(false)
  expect(wrapper.emitted('deselect')).toHaveLength(1)
})

it('passes model-specific filter URLs and emits coating IDs without using captions', async () => {
  const wrapper = mount(ProfnastilMaterialTable, { props: {
    modelId: '2', rows: [], selectedRow: null, loading: false,
    filters: { materials: [], typeOfCoating: [] },
    pagination: { page: 1, pageSize: 100, pageCount: 1, totalCount: 0 },
  }, global: { stubs: ['FilterDropdown'] } })
  const filters = wrapper.findAllComponents({ name: 'FilterDropdown' })
  expect(filters[0]!.props('dataKey')).toBe('profnastilForm')
  expect(filters[2]!.props('url')).toContain('/type2/')
  filters[2]!.vm.$emit('update:modelValue', ['707'])
  expect(wrapper.emitted('update:filters')?.[0]).toEqual([{ materials: [], typeOfCoating: ['707'] }])
  await wrapper.setProps({ modelId: '1' })
  expect(filters[2]!.props('url')).toContain('/type1/')
})

it('spans all five columns for loading and empty states', async () => {
  const wrapper = mount(ProfnastilMaterialTable, { props: {
    modelId: '1', rows: [], selectedRow: null, loading: true,
    filters: { materials: [], typeOfCoating: [] },
    pagination: { page: 1, pageSize: 100, pageCount: 1, totalCount: 0 },
  }, global: { stubs: ['FilterDropdown'] } })
  expect(wrapper.get('tbody td').attributes('colspan')).toBe('5')
  await wrapper.setProps({ loading: false })
  expect(wrapper.get('tbody td').attributes('colspan')).toBe('5')
})
