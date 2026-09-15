import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import FillingAppearanceFields from './FillingAppearanceFields.vue'

const apiMocks = vi.hoisted(() => ({
  getFillingAppearanceOptions: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  getFillingAppearanceOptions: apiMocks.getFillingAppearanceOptions,
}))

const SelectMenuStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `
    <select
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">Не выбран</option>
      <option v-for="item in items" :key="item.id" :value="item.id">
        {{ item.label }}
      </option>
    </select>
  `,
})

const sidingOptions = {
  manufacturers: [
    { id: 3, name: 'Фасад-Профиль' },
    { id: 4, name: 'Двор-Профиль' },
  ],
  colors: [
    { id: 8, name: 'RAL 8017', hex: '#442F29', image: '/colors/8017.webp' },
    { id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' },
  ],
}

describe('FillingAppearanceFields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.modelId.value = '1'
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue(sidingOptions)
  })

  it('updates facade appearance without changing yard appearance', async () => {
    const calc = useCalculation()
    calc.manufacturerYardId.value = 40
    calc.materialSupplierYard.value = 'Сохранённый двор'
    calc.colorYardId.value = 90
    calc.colorYard.value = 'Сохранённый цвет двора'
    calc.colorYardHex.value = '#090909'
    calc.colorYardImage.value = '/colors/yard.webp'

    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: '1', materialGroup: 'Сайдинг', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('3')
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith('1', 'Сайдинг')
    expect(calc.manufacturerFacadeId.value).toBe(3)
    expect(calc.materialSupplierFacade.value).toBe('Фасад-Профиль')
    expect(calc.colorFacadeId.value).toBe(8)
    expect(calc.colorFacade.value).toBe('RAL 8017')
    expect(calc.colorFacadeHex.value).toBe('#442F29')
    expect(calc.colorFacadeImage.value).toBe('/colors/8017.webp')
    expect({
      manufacturerId: calc.manufacturerYardId.value,
      manufacturer: calc.materialSupplierYard.value,
      colorId: calc.colorYardId.value,
      color: calc.colorYard.value,
      hex: calc.colorYardHex.value,
      image: calc.colorYardImage.value,
    }).toEqual({
      manufacturerId: 40,
      manufacturer: 'Сохранённый двор',
      colorId: 90,
      color: 'Сохранённый цвет двора',
      hex: '#090909',
      image: '/colors/yard.webp',
    })
    expect(wrapper.emitted('change')).toHaveLength(2)
  })

  it('updates yard appearance without changing facade appearance', async () => {
    const calc = useCalculation()
    calc.manufacturerFacadeId.value = 30
    calc.materialSupplierFacade.value = 'Сохранённый фасад'
    calc.colorFacadeId.value = 80
    calc.colorFacade.value = 'Сохранённый цвет фасада'
    calc.colorFacadeHex.value = '#080808'
    calc.colorFacadeImage.value = '/colors/facade.webp'

    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 2, materialGroup: 'Сайдинг', side: 'yard' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith(2, 'Сайдинг')
    expect(calc.manufacturerYardId.value).toBe(4)
    expect(calc.materialSupplierYard.value).toBe('Двор-Профиль')
    expect(calc.colorYardId.value).toBe(9)
    expect(calc.colorYard.value).toBe('RAL 9003')
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

  it('clears invalid facade IDs after a material-group reload without choosing a fallback', async () => {
    apiMocks.getFillingAppearanceOptions.mockImplementation(async (_modelId, materialGroup) => (
      materialGroup === 'Сайдинг'
        ? sidingOptions
        : {
            manufacturers: [{ id: 13, name: 'Профнастил-Профиль' }],
            colors: [{ id: 18, name: 'RAL 7016', hex: '#383E42', image: null }],
          }
    ))
    const calc = useCalculation()
    calc.manufacturerFacadeId.value = 3
    calc.materialSupplierFacade.value = 'Фасад-Профиль'
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'RAL 8017'
    calc.colorFacadeHex.value = '#442F29'
    calc.colorFacadeImage.value = '/colors/8017.webp'
    calc.manufacturerYardId.value = 4
    calc.colorYardId.value = 9

    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'Сайдинг', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.setProps({ materialGroup: 'Профлист' })
    await flushPromises()

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenLastCalledWith(1, 'Профлист')
    expect(calc.manufacturerFacadeId.value).toBeNull()
    expect(calc.materialSupplierFacade.value).toBe('')
    expect(calc.colorFacadeId.value).toBeNull()
    expect(calc.colorFacade.value).toBe('')
    expect(calc.colorFacadeHex.value).toBe('')
    expect(calc.colorFacadeImage.value).toBe('')
    expect(calc.manufacturerYardId.value).toBe(4)
    expect(calc.colorYardId.value).toBe(9)
  })

  it('does not apply a pending response after the selector is unmounted', async () => {
    let resolveOptions!: (value: typeof sidingOptions) => void
    apiMocks.getFillingAppearanceOptions.mockImplementationOnce(() => (
      new Promise<typeof sidingOptions>(resolve => {
        resolveOptions = resolve
      })
    ))
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'Сайдинг', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    const calc = useCalculation()

    wrapper.unmount()
    calc.manufacturerFacadeId.value = 13
    calc.materialSupplierFacade.value = 'Новый производитель профнастила'
    calc.colorFacadeId.value = 18
    calc.colorFacade.value = 'RAL 7016'
    calc.colorFacadeHex.value = '#383E42'
    calc.colorFacadeImage.value = '/colors/profnastil.webp'
    resolveOptions(sidingOptions)
    await flushPromises()

    expect({
      manufacturerId: calc.manufacturerFacadeId.value,
      manufacturer: calc.materialSupplierFacade.value,
      colorId: calc.colorFacadeId.value,
      color: calc.colorFacade.value,
      hex: calc.colorFacadeHex.value,
      image: calc.colorFacadeImage.value,
    }).toEqual({
      manufacturerId: 13,
      manufacturer: 'Новый производитель профнастила',
      colorId: 18,
      color: 'RAL 7016',
      hex: '#383E42',
      image: '/colors/profnastil.webp',
    })
  })
})
