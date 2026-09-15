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

const ButtonStub = defineComponent({
  name: 'B24Button',
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button :data-label="label" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
})

const rows: SidingRow[] = [
  { id: 17, material: 'Бревно', form: 'Гладкая', typeOfCoating: 'Глянец' },
  { id: 21, material: 'Доска', form: 'Накатка', typeOfCoating: 'Матовый' },
]

function mountYard() {
  return mount(SidingYard, {
    global: {
      stubs: {
        B24Button: ButtonStub,
        Button: ButtonStub,
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
      colors: [
        { id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' },
        { id: 10, name: 'RAL 7016', hex: '#383E42', image: '/colors/7016.webp' },
        { id: 11, name: 'RAL 7024', hex: '#45494E', image: '/colors/7024.webp' },
      ],
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

    const calc = useCalculation()
    calc.updatePriceBlock('900.00', '1200.00')
    apiMocks.recalculate.mockResolvedValue({ priceDealer: '975.00', priceRetail: '1300.00' })
    apiMocks.saveWicketData.mockClear()
    apiMocks.recalculate.mockClear()

    await wrapper.findAll('tbody input[type="checkbox"]')[1]!.setValue(true)
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).toHaveBeenCalledTimes(1)
    expect(calc.manufacturerYardId.value).toBeNull()
    expect(calc.materialSupplierYard.value).toBe('')
    expect(calc.colorYardId.value).toBeNull()
    expect(calc.colorYard.value).toBe('')
    expect(calc.colorYardHex.value).toBe('')
    expect(calc.colorYardImage.value).toBe('')
    expect(calc.manufacturerFacadeId.value).toBe(30)
    expect(calc.colorFacadeId.value).toBe(80)
  })

  it('recalculates once after a successful yard appearance save and refreshes the stored price', async () => {
    const calc = useCalculation()
    calc.idYard.value = 17
    calc.materialYard.value = 'Бревно'
    calc.formYard.value = 'Гладкая'
    calc.typeOfCoatingYard.value = 'Глянец'
    calc.updatePriceBlock('900.00', '1200.00')
    apiMocks.recalculate.mockResolvedValue({ priceDealer: '1200.00', priceRetail: '1600.00' })

    const wrapper = mountYard()
    await flushPromises()
    apiMocks.saveWicketData.mockClear()
    apiMocks.recalculate.mockClear()

    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).toHaveBeenCalledTimes(1)
    expect(apiMocks.saveWicketData.mock.invocationCallOrder[0])
      .toBeLessThan(apiMocks.recalculate.mock.invocationCallOrder[0]!)
    expect(calc.priceDealer.value).toBe('1200.00')
    expect(calc.priceRetail.value).toBe('1600.00')
    expect(calc.data.value.find(block => block.blockName === 'Цена')?.params).toEqual([
      { name: 'Дилерская цена', value: '1200.00' },
      { name: 'Рек. розн. цена', value: '1600.00' },
    ])
  })

  it('rolls back yard appearance and blocks navigation after a network save rejection', async () => {
    const calc = useCalculation()
    calc.idYard.value = 17
    calc.materialYard.value = 'Бревно'
    calc.formYard.value = 'Гладкая'
    calc.typeOfCoatingYard.value = 'Глянец'
    calc.manufacturerYardId.value = 4
    calc.materialSupplierYard.value = 'Двор-Профиль'
    calc.colorYardId.value = 9
    calc.colorYard.value = 'RAL 9003'
    calc.colorYardHex.value = '#F4F4F4'
    calc.colorYardImage.value = '/colors/9003.webp'
    calc.updatePriceBlock('900.00', '1200.00')

    const wrapper = mountYard()
    await flushPromises()
    apiMocks.saveWicketData.mockClear()
    apiMocks.recalculate.mockClear()
    let rejectSave!: (reason: unknown) => void
    apiMocks.saveWicketData.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectSave = reject
    }))

    await wrapper.get('[data-testid="appearance-color"]').setValue('10')
    await wrapper.vm.$nextTick()

    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)
    rejectSave(new Error('network unavailable'))
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
    expect(calc.priceRetail.value).toBe('1200.00')
    expect({
      manufacturerId: calc.manufacturerYardId.value,
      manufacturer: calc.materialSupplierYard.value,
      colorId: calc.colorYardId.value,
      color: calc.colorYard.value,
      colorHex: calc.colorYardHex.value,
      colorImage: calc.colorYardImage.value,
    }).toEqual({
      manufacturerId: 4,
      manufacturer: 'Двор-Профиль',
      colorId: 9,
      color: 'RAL 9003',
      colorHex: '#F4F4F4',
      colorImage: '/colors/9003.webp',
    })
    expect(wrapper.get('[data-testid="appearance-save-error"]').text()).toContain('Не удалось сохранить')
    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('keeps the newest yard appearance while an earlier overlapping save rejects', async () => {
    const calc = useCalculation()
    calc.idYard.value = 17
    calc.materialYard.value = 'Бревно'
    calc.formYard.value = 'Гладкая'
    calc.typeOfCoatingYard.value = 'Глянец'
    calc.manufacturerYardId.value = 4
    calc.materialSupplierYard.value = 'Двор-Профиль'
    calc.colorYardId.value = 9
    calc.colorYard.value = 'RAL 9003'
    calc.colorYardHex.value = '#F4F4F4'
    calc.colorYardImage.value = '/colors/9003.webp'

    const wrapper = mountYard()
    await flushPromises()
    apiMocks.saveWicketData.mockClear()
    let rejectFirst!: (reason: unknown) => void
    let resolveSecond!: (value: { lockVersion: number }) => void
    apiMocks.saveWicketData
      .mockImplementationOnce(() => new Promise((_resolve, reject) => {
        rejectFirst = reject
      }))
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveSecond = resolve
      }))

    const color = wrapper.get('[data-testid="appearance-color"]')
    await color.setValue('10')
    await wrapper.vm.$nextTick()
    await color.setValue('11')
    await wrapper.vm.$nextTick()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(2)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)

    rejectFirst(new Error('first save rejected'))
    await flushPromises()

    expect(calc.colorYardId.value).toBe(11)
    expect(calc.colorYard.value).toBe('RAL 7024')
    expect(calc.colorYardImage.value).toBe('/colors/7024.webp')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)

    resolveSecond({ lockVersion: 3 })
    await flushPromises()

    expect(calc.colorYardId.value).toBe(11)
    expect(calc.colorYard.value).toBe('RAL 7024')
    expect(calc.colorYardImage.value).toBe('/colors/7024.webp')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(false)
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
