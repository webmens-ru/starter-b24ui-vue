import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import FillingAppearanceFields from './FillingAppearanceFields.vue'
import ColorSelectMenu from './ColorSelectMenu.vue'

const apiMocks = vi.hoisted(() => ({
  getFillingAppearanceOptions: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  getFillingAppearanceOptions: apiMocks.getFillingAppearanceOptions,
}))

const SelectMenuStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items', 'b24ui'],
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
    { id: 8, name: 'RAL 8017', label: 'RAL 8017 - Коричневый', hex: '#442F29', image: '/colors/8017.webp' },
    { id: 9, name: 'RAL 9003', hex: '#F4F4F4', image: '/colors/9003.webp' },
  ],
}

describe('FillingAppearanceFields', () => {
  it('reloads a siding palette by ID and ignores an older material response', async () => {
    const pending = new Map<number, (value: typeof sidingOptions) => void>()
    apiMocks.getFillingAppearanceOptions.mockImplementation((_model, _group, id) => new Promise(resolve => pending.set(id, resolve)))
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade', sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await wrapper.setProps({ sidingId: 11 })
    expect([...pending.keys()]).toEqual([7, 11])
    pending.get(11)!({ manufacturers: [], colors: [sidingOptions.colors[1]!] })
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    pending.get(7)!(sidingOptions)
    await flushPromises()
    expect(wrapper.get('[data-testid="appearance-color"]').text()).not.toContain('Коричневый')
    expect(useCalculation().colorFacadeId.value).toBe(9)
    wrapper.unmount()
  })

  it('reloads a profnastil palette by ID and ignores an older material response', async () => {
    const pending = new Map<number, (value: typeof sidingOptions) => void>()
    apiMocks.getFillingAppearanceOptions.mockImplementation((_model, _group, id) => new Promise(resolve => pending.set(id, resolve)))
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'profnastil', side: 'facade', profnastilId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await wrapper.setProps({ profnastilId: 11 })
    expect([...pending.keys()]).toEqual([7, 11])
    pending.get(11)!({ manufacturers: [], colors: [sidingOptions.colors[1]!] })
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    pending.get(7)!(sidingOptions)
    await flushPromises()
    expect(wrapper.get('[data-testid="appearance-color"]').text()).not.toContain('Коричневый')
    expect(useCalculation().colorFacadeId.value).toBe(9)
    wrapper.unmount()
  })

  it('reloads a fence palette by ID and ignores an older material response', async () => {
    const pending = new Map<number, (value: typeof sidingOptions) => void>()
    apiMocks.getFillingAppearanceOptions.mockImplementation((_model, _group, id) => new Promise(resolve => pending.set(id, resolve)))
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'fence', side: 'facade', fenceId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await wrapper.setProps({ fenceId: 11 })
    expect([...pending.keys()]).toEqual([7, 11])
    pending.get(11)!({ manufacturers: [], colors: [sidingOptions.colors[1]!] })
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    pending.get(7)!(sidingOptions)
    await flushPromises()
    expect(wrapper.get('[data-testid="appearance-color"]').text()).not.toContain('Коричневый')
    expect(useCalculation().colorFacadeId.value).toBe(9)
    wrapper.unmount()
  })

  it('refreshes another product without changing its historical color', async () => {
    const calc = useCalculation()
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade', sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({ manufacturers: [], colors: [] })
    calc.productRowId.value = 902
    await flushPromises()
    expect(calc.colorFacadeId.value).toBe(8)
    expect(wrapper.emitted('change')).toHaveLength(1)
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
    expect(wrapper.get('[data-testid="appearance-color"]').text()).not.toContain('RAL')
    wrapper.unmount()
  })

  it.each(['facade', 'yard'] as const)('preserves historical %s appearance on initial empty palette without autosave', async side => {
    const calc = useCalculation()
    const colorId = side === 'facade' ? calc.colorFacadeId : calc.colorYardId
    const colorName = side === 'facade' ? calc.colorFacade : calc.colorYard
    colorId.value = 81
    colorName.value = 'Исторический цвет'
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({ manufacturers: [], colors: [] })
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side, sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    expect(colorId.value).toBe(81)
    expect(colorName.value).toBe('Исторический цвет')
    expect(wrapper.emitted('change')).toBeUndefined()
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
    wrapper.unmount()
  })

  it('clears a color outside the palette after an explicit siding material change', async () => {
    const calc = useCalculation()
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade', sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({ manufacturers: [], colors: [sidingOptions.colors[1]!] })
    await wrapper.setProps({ sidingId: 11 })
    await flushPromises()
    expect(calc.colorFacadeId.value).toBeNull()
    expect(calc.colorFacade.value).toBe('')
    expect(wrapper.emitted('change')).toHaveLength(2)
    wrapper.unmount()
  })

  it('does not persist an empty palette after a failed request', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    apiMocks.getFillingAppearanceOptions.mockRejectedValue(new Error('offline'))
    const calc = useCalculation()
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'RAL 8017'
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade', sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    expect(calc.colorFacadeId.value).toBe(8)
    expect(wrapper.emitted('change')).toBeUndefined()
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
    wrapper.unmount()
    warn.mockRestore()
  })

  it('layers the shared color menu above surrounding content and preserves palette HEX values', async () => {
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade', sidingId: 7 },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    const color = wrapper.getComponent(ColorSelectMenu)
    expect(color.getComponent(SelectMenuStub).props('b24ui').content).toContain('z-[1100]')
    expect(color.props('items')).toContainEqual(expect.objectContaining({ id: 8, hex: '#442F29' }))
    wrapper.unmount()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.modelId.value = '1'
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue(sidingOptions)
  })

  it('requires a color and clears the error after facade color selection', async () => {
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: '1', materialGroup: 'siding', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="appearance-color-error"]').text()).toBe('Выберите цвет')

    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="appearance-color-error"]').exists()).toBe(false)
  })

  it('uses the same required-color contract for the yard side', async () => {
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: '1', materialGroup: 'profnastil', side: 'yard' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(true)
    expect(useCalculation().colorYardId.value).toBe(9)
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
      props: { modelId: '1', materialGroup: 'siding', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="appearance-color"]').text()).toContain('RAL 8017 - Коричневый')
    expect(wrapper.get('[data-testid="appearance-color"]').text()).toContain('RAL 9003')
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('3')
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith('1', 'siding')
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
      props: { modelId: 2, materialGroup: 'siding', side: 'yard' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('4')
    await wrapper.get('[data-testid="appearance-color"]').setValue('9')

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith(2, 'siding')
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

  it('does not emit a save when the select repeats the current empty values', async () => {
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('')
    await wrapper.get('[data-testid="appearance-color"]').setValue('')

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('clears invalid facade IDs after a material-group reload without choosing a fallback', async () => {
    apiMocks.getFillingAppearanceOptions.mockImplementation(async (_modelId, materialGroup) => (
      materialGroup === 'siding'
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
      props: { modelId: 1, materialGroup: 'siding', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()

    await wrapper.setProps({ materialGroup: 'profnastil' })
    await flushPromises()

    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenLastCalledWith(1, 'profnastil')
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
      props: { modelId: 1, materialGroup: 'siding', side: 'facade' },
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

  it('keeps the newer B options when an overlapping A request completes last', async () => {
    const profnastilOptions = {
      manufacturers: [{ id: 13, name: 'Профнастил-Профиль' }],
      colors: [{ id: 18, name: 'RAL 7016', hex: '#383E42', image: '/colors/profnastil.webp' }],
    }
    let resolveSiding!: (value: typeof sidingOptions) => void
    let resolveProfnastil!: (value: typeof profnastilOptions) => void
    apiMocks.getFillingAppearanceOptions.mockImplementation((_modelId, materialGroup) => (
      new Promise(resolve => {
        if (materialGroup === 'siding') {
          resolveSiding = resolve as (value: typeof sidingOptions) => void
        } else {
          resolveProfnastil = resolve as (value: typeof profnastilOptions) => void
        }
      })
    ))
    const calc = useCalculation()
    calc.manufacturerFacadeId.value = 13
    calc.materialSupplierFacade.value = 'Профнастил-Профиль'
    calc.colorFacadeId.value = 18
    calc.colorFacade.value = 'RAL 7016'
    calc.colorFacadeHex.value = '#383E42'
    calc.colorFacadeImage.value = '/colors/profnastil.webp'

    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: 1, materialGroup: 'siding', side: 'facade' },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await wrapper.setProps({ materialGroup: 'profnastil' })
    resolveProfnastil(profnastilOptions)
    await flushPromises()
    resolveSiding(sidingOptions)
    await flushPromises()

    expect(apiMocks.getFillingAppearanceOptions.mock.calls).toEqual([
      [1, 'siding'],
      [1, 'profnastil'],
    ])
    expect(wrapper.get('[data-testid="appearance-manufacturer"]').text()).toContain('Профнастил-Профиль')
    expect(wrapper.get('[data-testid="appearance-manufacturer"]').text()).not.toContain('Фасад-Профиль')
    expect(calc.manufacturerFacadeId.value).toBe(13)
    expect(calc.colorFacadeId.value).toBe(18)
    expect(calc.colorFacadeImage.value).toBe('/colors/profnastil.webp')
  })
  it('shows only color for fence without changing the catalog supplier', async () => {
    const calc = useCalculation()
    calc.materialSupplierFacade.value = 'Поставщик строки'
    const wrapper = mount(FillingAppearanceFields, {
      props: { modelId: '3', materialGroup: 'fence', side: 'facade', showManufacturer: false },
      global: { stubs: { B24SelectMenu: SelectMenuStub, SelectMenu: SelectMenuStub } },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="appearance-manufacturer"]').exists()).toBe(false)
    await wrapper.get('[data-testid="appearance-color"]').setValue('8')
    expect(calc.colorFacadeId.value).toBe(8)
    expect(calc.colorFacade.value).toBe('RAL 8017')
    expect(calc.materialSupplierFacade.value).toBe('Поставщик строки')
  })

})
