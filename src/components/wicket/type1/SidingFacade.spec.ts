import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SidingRow } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import SidingFacade from './SidingFacade.vue'

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
  {
    id: 7,
    material: 'Бревно',
    form: 'Гладкая',
    typeOfCoating: 'Глянец',
    coatingHex: '#AABBCC',
    coatingImage: '/coatings/gloss.webp',
    reliefImage: '/reliefs/log.webp',
  },
  {
    id: 11,
    material: 'Корабельная доска',
    form: 'Трапеция',
    typeOfCoating: 'Матовый',
  },
]

function mountFacade() {
  return mount(SidingFacade, {
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

describe('SidingFacade', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 70
    calc.modelId.value = '1'
    calc.materialFacadeGlob.value = 'Сайдинг'
    apiMocks.getSidingTable.mockReset()
    apiMocks.getSidingTable.mockResolvedValue({
      table: rows,
      pagination: { page: 1, pageSize: 100, totalCount: rows.length, pageCount: 1 },
    })
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({
      manufacturers: [
        { id: 3, name: 'Фасад-Профиль' },
        { id: 4, name: 'Новый фасад-профиль' },
      ],
      colors: [
        { id: 8, name: 'RAL 8017', hex: '#442F29', image: '/colors/8017.webp' },
        { id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' },
        { id: 10, name: 'RAL 7024', hex: '#45494E', image: '/colors/7024.webp' },
      ],
    })
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
  })

  it('combines a product-only siding row with optional facade appearance in the save payload', async () => {
    const wrapper = mountFacade()
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
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('3')
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
    await flushPromises()

    const payload = apiMocks.saveWicketData.mock.calls[apiMocks.saveWicketData.mock.calls.length - 1]?.[0]
    expect(payload).toMatchObject({
      idFacade: 7,
      manufacturerFacadeId: 3,
      colorFacadeId: 8,
      materialFacade: 'Бревно',
      formFacade: 'Гладкая',
      typeOfCoatingFacade: 'Глянец',
      materialSupplierFacade: 'Фасад-Профиль',
      colorFacade: 'RAL 8017',
    })
    const calc = useCalculation()
    expect(calc.colorFacadeHex.value).toBe('#442F29')
    expect(calc.colorFacadeImage.value).toBe('/colors/8017.webp')
  })

  it('clears stale facade appearance when the product changes and still allows product-only continuation', async () => {
    const wrapper = mountFacade()
    await flushPromises()

    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('3')
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
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
    expect(calc.manufacturerFacadeId.value).toBeNull()
    expect(calc.materialSupplierFacade.value).toBe('')
    expect(calc.colorFacadeId.value).toBeNull()
    expect(calc.colorFacade.value).toBe('')
    expect(calc.colorFacadeHex.value).toBe('')
    expect(calc.colorFacadeImage.value).toBe('')
    const payload = apiMocks.saveWicketData.mock.calls[apiMocks.saveWicketData.mock.calls.length - 1]?.[0]
    expect(payload).toMatchObject({
      idFacade: 11,
      manufacturerFacadeId: null,
      colorFacadeId: null,
      materialFacade: 'Корабельная доска',
      formFacade: 'Трапеция',
      typeOfCoatingFacade: 'Матовый',
    })

    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('recalculates once after a successful facade appearance save and refreshes the stored price', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 7
    calc.materialFacade.value = 'Бревно'
    calc.formFacade.value = 'Гладкая'
    calc.typeOfCoatingFacade.value = 'Глянец'
    calc.updatePriceBlock('900.00', '1200.00')
    apiMocks.recalculate.mockResolvedValue({ priceDealer: '1125.00', priceRetail: '1500.00' })

    const wrapper = mountFacade()
    await flushPromises()
    apiMocks.saveWicketData.mockClear()
    apiMocks.recalculate.mockClear()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('3')
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).toHaveBeenCalledTimes(1)
    expect(apiMocks.saveWicketData.mock.invocationCallOrder[0])
      .toBeLessThan(apiMocks.recalculate.mock.invocationCallOrder[0]!)
    expect(calc.priceDealer.value).toBe('1125.00')
    expect(calc.priceRetail.value).toBe('1500.00')
    expect(calc.data.value.find(block => block.blockName === 'Цена')?.params).toEqual([
      { name: 'Дилерская цена', value: '1125.00' },
      { name: 'Рек. розн. цена', value: '1500.00' },
    ])
  })

  it('rolls back facade appearance and blocks navigation until a rejected 422 save is retried', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 7
    calc.materialFacade.value = 'Бревно'
    calc.formFacade.value = 'Гладкая'
    calc.typeOfCoatingFacade.value = 'Глянец'
    calc.manufacturerFacadeId.value = 3
    calc.materialSupplierFacade.value = 'Фасад-Профиль'
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'RAL 8017'
    calc.colorFacadeHex.value = '#442F29'
    calc.colorFacadeImage.value = '/colors/8017.webp'
    calc.updatePriceBlock('900.00', '1200.00')

    const wrapper = mountFacade()
    await flushPromises()
    apiMocks.saveWicketData.mockClear()
    apiMocks.recalculate.mockClear()
    let rejectSave!: (reason: unknown) => void
    apiMocks.saveWicketData.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectSave = reject
    }))

    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await wrapper.vm.$nextTick()

    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)
    rejectSave({ response: { status: 422 } })
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
    expect(calc.priceRetail.value).toBe('1200.00')
    expect({
      manufacturerId: calc.manufacturerFacadeId.value,
      manufacturer: calc.materialSupplierFacade.value,
      colorId: calc.colorFacadeId.value,
      color: calc.colorFacade.value,
      colorHex: calc.colorFacadeHex.value,
      colorImage: calc.colorFacadeImage.value,
    }).toEqual({
      manufacturerId: 3,
      manufacturer: 'Фасад-Профиль',
      colorId: 8,
      color: 'RAL 8017',
      colorHex: '#442F29',
      colorImage: '/colors/8017.webp',
    })
    expect(wrapper.get('[data-testid="appearance-save-error"]').text()).toContain('Не удалось сохранить')
    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()

    apiMocks.saveWicketData.mockResolvedValueOnce({ lockVersion: 2 })
    apiMocks.recalculate.mockResolvedValueOnce({ priceDealer: '950.00', priceRetail: '1250.00' })
    await wrapper.get('[data-testid="appearance-save-retry"]').trigger('click')
    await flushPromises()

    expect(calc.colorFacadeId.value).toBe(9)
    expect(calc.colorFacade.value).toBe('RAL 9003')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the newest facade appearance while an earlier overlapping save rejects', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 7
    calc.materialFacade.value = 'Бревно'
    calc.formFacade.value = 'Гладкая'
    calc.typeOfCoatingFacade.value = 'Глянец'
    calc.manufacturerFacadeId.value = 3
    calc.materialSupplierFacade.value = 'Фасад-Профиль'
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'RAL 8017'
    calc.colorFacadeHex.value = '#442F29'
    calc.colorFacadeImage.value = '/colors/8017.webp'

    const wrapper = mountFacade()
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
    await color.setValue('9')
    await wrapper.vm.$nextTick()
    await color.setValue('10')
    await wrapper.vm.$nextTick()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(2)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)

    rejectFirst(new Error('first save rejected'))
    await flushPromises()

    expect(calc.colorFacadeId.value).toBe(10)
    expect(calc.colorFacade.value).toBe('RAL 7024')
    expect(calc.colorFacadeImage.value).toBe('/colors/7024.webp')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)

    resolveSecond({ lockVersion: 3 })
    await flushPromises()

    expect(calc.colorFacadeId.value).toBe(10)
    expect(calc.colorFacade.value).toBe('RAL 7024')
    expect(calc.colorFacadeImage.value).toBe('/colors/7024.webp')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('restores a saved product row independently from its appearance', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 41
    calc.materialFacade.value = 'Сохранённое бревно'
    calc.formFacade.value = 'Сохранённая форма'
    calc.typeOfCoatingFacade.value = 'Сохранённое покрытие'
    calc.manufacturerFacadeId.value = 3
    calc.materialSupplierFacade.value = 'Фасад-Профиль'
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'RAL 8017'
    apiMocks.getSidingTable.mockResolvedValue({
      table: [],
      pagination: { page: 1, pageSize: 100, totalCount: 0, pageCount: 1 },
    })

    const wrapper = mountFacade()
    await flushPromises()

    expect(wrapper.get('tbody').text()).toContain('Сохранённое бревно')
    expect(wrapper.get('tbody').text()).toContain('Сохранённая форма')
    expect(wrapper.get('tbody').text()).not.toContain('Фасад-Профиль')
    expect(wrapper.get('tbody').text()).not.toContain('RAL 8017')
    expect(calc.manufacturerFacadeId.value).toBe(3)
    expect(calc.colorFacadeId.value).toBe(8)
  })

  it('matches a restored string product ID to the numeric table row', async () => {
    const calc = useCalculation()
    calc.idFacade.value = '7'
    calc.materialFacade.value = 'Бревно'
    calc.formFacade.value = 'Гладкая'
    calc.typeOfCoatingFacade.value = 'Глянец'

    const wrapper = mountFacade()
    await flushPromises()

    const renderedRows = wrapper.findAll('tbody tr')
    expect(renderedRows).toHaveLength(2)
    expect((renderedRows[0]!.get('input').element as HTMLInputElement).checked).toBe(true)
  })
})
