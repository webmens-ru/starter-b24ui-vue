import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const data = ref<Array<{
  blockName: string
  params: Array<{ name: string; value: string }>
}>>([])
const number = ref<number | null>(2577)
const model = ref('"Стандарт" 50/50/МП8')
const priceDealer = ref<string | null>(null)
const priceRetail = ref<string | null>(null)

vi.mock('../composables/useCalculation', () => ({
  useCalculation: () => ({ data, number, model, priceDealer, priceRetail }),
}))

import CalculateTable from './CalculateTable.vue'

function mountTable() {
  return mount(CalculateTable, {
    global: {
      stubs: {
        B24TableWrapper: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('CalculateTable summary accordion', () => {
  beforeEach(() => {
    data.value = [
      {
        blockName: 'Вариант изготовления',
        params: [{ name: 'Материал заполнения', value: 'Предоставляет изготовитель' }],
      },
      {
        blockName: 'Заполнение',
        params: [{ name: 'Сторона заполнения', value: 'Одна сторона' }],
      },
    ]
    priceDealer.value = null
    priceRetail.value = null
  })

  it('по умолчанию показывает свёрнутую сводку', () => {
    const wrapper = mountTable()
    const toggle = wrapper.get('[data-testid="calculation-summary-toggle"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('№ 2577')
    expect(wrapper.text()).not.toContain('Предоставляет изготовитель')
  })

  it('раскрывает и повторно сворачивает всю сводку по клику на шапку', async () => {
    const wrapper = mountTable()
    const toggle = wrapper.get('[data-testid="calculation-summary-toggle"]')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('№ 2577')
    expect(wrapper.text()).toContain('Вариант изготовления')
    expect(wrapper.text()).toContain('Предоставляет изготовитель')
    expect(wrapper.findAll('[data-testid^="summary-section-toggle-"]')).toHaveLength(0)

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('№ 2577')
    expect(wrapper.text()).not.toContain('Предоставляет изготовитель')
  })
})
