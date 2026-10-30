import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import ProfnastilMaterialTable from './ProfnastilMaterialTable.vue'

it('selects by material ID when display names are identical and preserves the saved row outside filters', async () => {
  const row = { drawingProfile: null, drawingProfileProblem: null, id: 17, name: 'Одинаково', material: 'Переименованный профиль', typeOfCoating: 'Покрытие', thickness: 0.45 }
  const saved = { ...row, id: 21 }
  const wrapper = mount(ProfnastilMaterialTable, { props: {
    modelId: '2', rows: [row], selectedRow: saved, loading: false,
    filters: { materials: [], typeOfCoating: [] },
    pagination: { page: 1, pageSize: 100, pageCount: 1, totalCount: 1 },
  }, global: { stubs: ['FilterDropdown'] } })
  expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  expect(wrapper.findAll('thead th')).toHaveLength(3)
  expect(wrapper.find('thead').text()).toContain('Тип покрытия')
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
  expect(filters[1]!.props('url')).toContain('/type2/')
  filters[1]!.vm.$emit('update:modelValue', ['707'])
  expect(wrapper.emitted('update:filters')?.[0]).toEqual([{ materials: [], typeOfCoating: ['707'] }])
  await wrapper.setProps({ modelId: '1' })
  expect(filters[1]!.props('url')).toContain('/type1/')
})
