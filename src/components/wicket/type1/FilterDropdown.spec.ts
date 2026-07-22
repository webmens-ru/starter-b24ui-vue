import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FilterDropdown from './FilterDropdown.vue'

vi.mock('../../../app/api/wicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/api/wicket')>()
  return {
    ...actual,
    getFilterOptions: vi.fn(async () => ({
      material: [
        { id: 'С20', name: 'С20' },
        { id: 'МП20', name: 'МП20' },
      ],
    })),
  }
})

describe('FilterDropdown', () => {
  it('показывает понятный сброс выбранного фильтра', async () => {
    const wrapper = mount(FilterDropdown, {
      props: {
        label: 'Материал',
        url: '/api/filter',
        dataKey: 'material',
        modelValue: ['С20'],
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('Материал · 1')
    expect(wrapper.text()).toContain('Сбросить фильтр')

    await wrapper.get('[data-testid="filter-reset"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]])
  })
})
