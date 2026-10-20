import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProfnastilRow } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import ProfnastilYard from './ProfnastilYard.vue'

const apiMocks = vi.hoisted(() => ({
  getProfnastilTable: vi.fn(),
  getFillingAppearanceOptions: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  getProfnastilTable: apiMocks.getProfnastilTable,
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

const rows: ProfnastilRow[] = [
  { id: 17, name: 'Профлист C8, 0,5 мм, Полиэстер', material: 'Профлист C8', thickness: '0.5', typeOfCoating: 'Полиэстер' },
  { id: 21, name: 'Профлист C10, 0,6 мм, Пурал', material: 'Профлист C10', thickness: '0.6', typeOfCoating: 'Пурал' },
]

function mountYard() {
  return mount(ProfnastilYard, {
    global: {
      stubs: {
        B24Modal: true,
        Modal: true,
        B24Button: ButtonStub,
        Button: ButtonStub,
        B24SelectMenu: SelectMenuStub,
        SelectMenu: SelectMenuStub,
        FilterDropdown: FilterDropdownStub,
      },
    },
  })
}

describe('ProfnastilYard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 70
    calc.modelId.value = '1'
    calc.materialYardGlob.value = 'Профлист'
    apiMocks.getProfnastilTable.mockReset()
    apiMocks.getProfnastilTable.mockResolvedValue({
      table: rows,
      pagination: { page: 1, pageSize: 100, totalCount: rows.length, pageCount: 1 },
    })
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({
      manufacturers: [{ id: 4, name: 'Двор-Профиль' }],
      colors: [
        { id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' },
        { id: 10, name: 'RAL 7016', hex: '#383E42', image: '/colors/7016.webp' },
      ],
    })
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
    apiMocks.recalculate.mockResolvedValue({ priceDealer: '900.00', priceRetail: '1200.00' })
  })

  it('saves shared manufacturer and color before the profnastil table', async () => {
    const wrapper = mountYard()
    await flushPromises()

    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    const appearance = wrapper.get('.appearance-fields').element
    expect(appearance.compareDocumentPosition(wrapper.get('table').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await flushPromises()

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith('1', 'Профлист')
    const payload = apiMocks.saveWicketData.mock.lastCall?.[0]
    expect(payload).toMatchObject({
      idYard: 17,
      manufacturerYardId: 4,
      materialSupplierYard: 'Двор-Профиль',
      colorYardId: 9,
      colorYard: 'RAL 9003',
      colorYardHex: '#F4F4F4',
      colorYardImage: '/colors/9003.webp',
    })
    expect(useCalculation().data.value.find(block => block.blockName === 'Заполнение (двор)')?.params)
      .toContainEqual({ name: 'Производитель материала', value: 'Двор-Профиль' })
  })

  it('clears manufacturer and every color field before saving another product', async () => {
    const wrapper = mountYard()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await flushPromises()
    apiMocks.saveWicketData.mockClear()

    await wrapper.findAll('tbody input[type="checkbox"]')[1]!.setValue(true)
    await flushPromises()

    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.saveWicketData.mock.lastCall?.[0]).toMatchObject({
      idYard: 21,
      manufacturerYardId: null,
      materialSupplierYard: '',
      colorYardId: null,
      colorYard: '',
      colorYardHex: '',
      colorYardImage: '',
    })
  })

  it('does not recalculate the price when saving an appearance change fails', async () => {
    const calc = useCalculation()
    calc.updatePriceBlock('900.00', '1200.00')
    const wrapper = mountYard()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    apiMocks.recalculate.mockClear()
    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('network unavailable'))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await flushPromises()

    expect(apiMocks.recalculate).not.toHaveBeenCalled()
    expect(calc.priceRetail.value).toBe('1200.00')
    expect(calc.manufacturerYardId.value).toBeNull()
    expect(calc.materialSupplierYard.value).toBe('')
    expect(calc.data.value.find(block => block.blockName === 'Заполнение (двор)')?.params)
      .toContainEqual({ name: 'Производитель материала', value: '' })
    expect(wrapper.get('[data-testid="appearance-save-error"]').text()).toContain('Не удалось сохранить')
    warning.mockRestore()
  })

  it('rolls back a failed appearance save and retries the selected values after pagination', async () => {
    apiMocks.getProfnastilTable.mockImplementation(async (_modelId, _filters, page) => ({
      table: page === 2 ? [rows[1]] : [rows[0]],
      pagination: { page, pageSize: 1, totalCount: 2, pageCount: 2 },
    }))
    const wrapper = mountYard()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await flushPromises()
    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('network unavailable'))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await wrapper.get('[data-testid="appearance-color"]').setValue('10')
    await flushPromises()

    const calc = useCalculation()
    expect(calc.colorYardId.value).toBeNull()
    expect(calc.colorYard.value).toBe('')
    expect(calc.colorYardHex.value).toBe('')
    expect(calc.colorYardImage.value).toBe('')
    expect(calc.data.value.find(block => block.blockName === 'Заполнение (двор)')?.params)
      .not.toContainEqual({ name: 'Цвет', value: 'RAL 7016' })
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
    await wrapper.findAll('button').find(button => button.text() === '›')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('страница 2 из 2')
    const error = wrapper.get('[data-testid="appearance-save-error"]')
    expect(error.text()).toContain('Не удалось сохранить')
    expect(wrapper.get('table').element.compareDocumentPosition(error.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await wrapper.get('[data-testid="appearance-save-retry"]').trigger('click')
    await flushPromises()

    expect(apiMocks.saveWicketData.mock.lastCall?.[0]).toMatchObject({
      idYard: 17,
      manufacturerYardId: 4,
      colorYardId: 10,
      colorYard: 'RAL 7016',
    })
    expect(calc.colorYardId.value).toBe(10)
    expect(calc.colorYard.value).toBe('RAL 7016')
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(false)
    warning.mockRestore()
  })

  it('blocks Continue while an appearance save is pending', async () => {
    const wrapper = mountYard()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    let resolveSave!: (value: { lockVersion: number }) => void
    apiMocks.saveWicketData.mockImplementationOnce(() => new Promise(resolve => {
      resolveSave = resolve
    }))

    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    await wrapper.vm.$nextTick()
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(true)
    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()

    resolveSave({ lockVersion: 2 })
    await flushPromises()
    expect((wrapper.get('[data-label="Далее"]').element as HTMLButtonElement).disabled).toBe(false)
    await wrapper.get('[data-label="Далее"]').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})
