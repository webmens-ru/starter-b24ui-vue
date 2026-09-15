import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SidingRow } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import SidingYard from './SidingYard.vue'

const apiMocks = vi.hoisted(() => ({
  getSidingTable: vi.fn(),
  getFillingAppearanceOptions: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  getSidingTable: apiMocks.getSidingTable,
  getFillingAppearanceOptions: apiMocks.getFillingAppearanceOptions,
  saveWicketData: apiMocks.saveWicketData,
  recalculate: apiMocks.recalculate,
}))

const SelectMenuStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `
    <select :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">Не выбран</option>
      <option v-for="item in items" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
  `,
})

const FilterDropdownStub = defineComponent({
  name: 'FilterDropdown',
  props: ['label'],
  template: '<button class="filter-stub">{{ label }}</button>',
})

const rows: SidingRow[] = [
  { id: 17, material: 'Бревно', form: 'Гладкая', typeOfCoating: 'Глянец' },
  { id: 21, material: 'Доска', form: 'Накатка', typeOfCoating: 'Матовый' },
]

function mountYard() {
  return mount(SidingYard, {
    global: {
      stubs: {
        B24Button: true,
        Button: true,
        B24Modal: true,
        Modal: true,
        B24SelectMenu: SelectMenuStub,
        SelectMenu: SelectMenuStub,
        FilterDropdown: FilterDropdownStub,
      },
    },
  })
}

describe('SidingYard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 70
    calc.modelId.value = '1'
    calc.fillSide.value = 'Две стороны'
    calc.materialYardGlob.value = 'Сайдинг'
    calc.manufacturerFacadeId.value = 30
    calc.materialSupplierFacade.value = 'Сохранённый фасад'
    calc.colorFacadeId.value = 80
    calc.colorFacade.value = 'Сохранённый цвет фасада'
    calc.colorFacadeHex.value = '#080808'
    calc.colorFacadeImage.value = '/colors/facade.webp'
    apiMocks.getSidingTable.mockReset()
    apiMocks.getSidingTable.mockResolvedValue({
      table: rows,
      pagination: { page: 1, pageSize: 100, totalCount: rows.length, pageCount: 1 },
    })
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({
      manufacturers: [{ id: 4, name: 'Двор-Профиль' }],
      colors: [{ id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' }],
    })
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
  })

  it('saves yard product and appearance without changing facade state', async () => {
    const wrapper = mountYard()
    await flushPromises()

    expect(wrapper.findAll('.filter-stub').map(item => item.text())).toEqual([
      'Материал',
      'Форма',
      'Тип покрытия',
    ])
    expect(wrapper.findAll('thead th').map(item => item.text())).toEqual([
      'Выбрать',
      'Материал',
      'Форма',
      'Тип покрытия',
    ])

    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await flushPromises()

    const payload = apiMocks.saveWicketData.mock.calls[apiMocks.saveWicketData.mock.calls.length - 1]?.[0]
    expect(payload).toMatchObject({
      idYard: 17,
      manufacturerYardId: 4,
      colorYardId: 9,
      materialYard: 'Бревно',
      formYard: 'Гладкая',
      typeOfCoatingYard: 'Глянец',
      materialSupplierYard: 'Двор-Профиль',
      colorYard: 'RAL 9003',
    })
    const calc = useCalculation()
    expect(calc.colorYardHex.value).toBe('#F4F4F4')
    expect(calc.colorYardImage.value).toBe('/colors/9003.webp')
    expect({
      manufacturerId: calc.manufacturerFacadeId.value,
      manufacturer: calc.materialSupplierFacade.value,
      colorId: calc.colorFacadeId.value,
      color: calc.colorFacade.value,
      hex: calc.colorFacadeHex.value,
      image: calc.colorFacadeImage.value,
    }).toEqual({
      manufacturerId: 30,
      manufacturer: 'Сохранённый фасад',
      colorId: 80,
      color: 'Сохранённый цвет фасада',
      hex: '#080808',
      image: '/colors/facade.webp',
    })
  })

  it('clears only yard appearance when its siding product changes', async () => {
    const wrapper = mountYard()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await flushPromises()

    await wrapper.findAll('tbody input[type="checkbox"]')[1]!.setValue(true)
    await flushPromises()

    const calc = useCalculation()
    expect(calc.manufacturerYardId.value).toBeNull()
    expect(calc.materialSupplierYard.value).toBe('')
    expect(calc.colorYardId.value).toBeNull()
    expect(calc.colorYard.value).toBe('')
    expect(calc.colorYardHex.value).toBe('')
    expect(calc.colorYardImage.value).toBe('')
    expect(calc.manufacturerFacadeId.value).toBe(30)
    expect(calc.colorFacadeId.value).toBe(80)
  })

  it('matches a restored string product ID to the numeric table row', async () => {
    const calc = useCalculation()
    calc.idYard.value = '17'
    calc.materialYard.value = 'Бревно'
    calc.formYard.value = 'Гладкая'
    calc.typeOfCoatingYard.value = 'Глянец'

    const wrapper = mountYard()
    await flushPromises()

    const renderedRows = wrapper.findAll('tbody tr')
    expect(renderedRows).toHaveLength(2)
    expect((renderedRows[0]!.get('input').element as HTMLInputElement).checked).toBe(true)
  })
})
