import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FilterDropdown from './FilterDropdown.vue'

vi.mock('../../../app/api/wicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/api/wicket')>()
  return {
    ...actual,
    getFilterOptions: vi.fn(async () => ({
      sidingForm: [{ id: '01', name: 'Переименованная форма' }],
      material: [
        { id: 'С20', name: 'С20' },
        { id: 'МП20', name: 'МП20' },
      ],
    })),
  }
})

describe('FilterDropdown', () => {
  it('selects and clears a siding form using its unchanged string code', async () => {
    const wrapper = mount(FilterDropdown, {
      props: { label: 'Форма сайдинга', url: '/api/filter', dataKey: 'sidingForm', modelValue: [] },
    })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Переименованная форма')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['01']])
    await wrapper.setProps({ modelValue: ['01'] })
    await wrapper.get('input[type="checkbox"]').setValue(false)
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([[]])
    wrapper.unmount()
  })

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
