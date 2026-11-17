import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import ProfnastilFacade from './ProfnastilFacade.vue'
import form from './ProfnastilFacade.vue?raw'
import ColorSelectMenu from '../shared/ColorSelectMenu.vue'

const apiMocks = vi.hoisted(() => ({
  getProfnastilTable: vi.fn(),
  getProfnastilColors: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  ...apiMocks,
}))

const SelectMenuStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items', 'disabled', 'b24ui'],
  emits: ['update:modelValue'],
  template: `
    <select :value="modelValue ?? ''" :disabled="disabled" @change="$emit('update:modelValue', Number($event.target.value))">
      <option value="">Не выбран</option>
      <option v-for="item in items" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
  `,
})

function mountFacade() {
  return mount(ProfnastilFacade, {
    global: {
      stubs: {
        B24Button: true,
        B24Modal: true,
        B24SelectMenu: SelectMenuStub,
        SelectMenu: SelectMenuStub,
        FilterDropdown: true,
      },
    },
  })
}

describe('ProfnastilFacade color contract', () => {
  it('ignores a late material catalog response after the product row context changes', async () => {
    let resolve!: (value: unknown) => void
    apiMocks.getProfnastilTable.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const wrapper = mountFacade()
    const calc = useCalculation()
    calc.productRowId.value = 99
    calc.fillingProfileFacade.value = { kind: 'mp20' }
    await flushPromises()
    resolve({ table: [{ id: 997, name: 'Просроченный каталог', material: 'Просроченный каталог', form: 'Форма', thickness: '0.45', typeOfCoating: 'Покрытие', drawingProfile: { kind: 'c8' }, drawingProfileProblem: null }],
      pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Просроченный каталог')
    expect(calc.fillingProfileFacade.value).toEqual({ kind: 'mp20' })
    wrapper.unmount()
  })

  it('inherits manufacturer by profile type ID and keeps it when choosing a color', async () => {
    apiMocks.getProfnastilTable.mockResolvedValue({
      table: [{ id: 7, manufacturerId: 4, manufacturerName: 'Производитель типа', drawingProfile: { kind: 'c8' }, drawingProfileProblem: null, name: 'Материал', material: 'Тип', thickness: '0.5', typeOfCoating: 'Покрытие' }],
      pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 },
    })
    const wrapper = mountFacade()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(useCalculation().manufacturerFacadeId.value).toBe(4)
    expect(useCalculation().materialSupplierFacade.value).toBe('Производитель типа')
    expect(apiMocks.saveWicketData.mock.lastCall?.[0]).toMatchObject({ manufacturerFacadeId: 4, materialSupplierFacade: 'Производитель типа' })
    expect(useCalculation().data.value.find(block => block.blockCode === 'fillingFacade')?.params)
      .toContainEqual({ paramCode: 'materialManufacturer', name: 'Производитель материала', value: 'Производитель типа' })
    wrapper.unmount()
  })

  it('loads colors for the selected material and rejects arbitrary IDs', async () => {
    const wrapper = mountFacade()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(apiMocks.getProfnastilColors).toHaveBeenLastCalledWith('1', 7)
    apiMocks.saveWicketData.mockClear()
    wrapper.findComponent(SelectMenuStub).vm.$emit('update:modelValue', 999)
    await flushPromises()
    expect(apiMocks.saveWicketData).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('ignores a material palette from the previous product row', async () => {
    let resolve!: (value: { colors: { id: number; name: string; hex: null; image: null }[] }) => void
    apiMocks.getProfnastilColors.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const calc = useCalculation()
    calc.idFacade.value = 7
    calc.colorFacadeId.value = 8
    calc.colorFacade.value = 'Исторический цвет'
    const wrapper = mountFacade()
    await flushPromises()
    expect(apiMocks.saveWicketData).not.toHaveBeenCalled()
    calc.productRowId.value = 99
    await flushPromises()
    resolve({ colors: [{ id: 999, name: 'Просроченный цвет', hex: null, image: null }] })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Просроченный цвет')
    expect(calc.colorFacade.value).toBe('Исторический цвет')
    wrapper.unmount()
  })

  it('layers the shared color menu above surrounding content', async () => {
    const wrapper = mountFacade()
    await flushPromises()
    expect(wrapper.getComponent(ColorSelectMenu).getComponent(SelectMenuStub).props('b24ui').content).toContain('z-[1100]')
    wrapper.unmount()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 70
    calc.modelId.value = '1'
    calc.materialFacadeGlob.value = 'Профнастил'
    apiMocks.getProfnastilTable.mockReset()
    apiMocks.getProfnastilTable.mockResolvedValue({
      table: [{ id: 7, drawingProfile: { kind: 'c8' }, drawingProfileProblem: null, name: 'Профлист С-8, 0,5 мм, Полиэстер', material: 'С-8', thickness: '0.5', typeOfCoating: 'Полиэстер' }],
      pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 },
    })
    apiMocks.getProfnastilColors.mockReset()
    apiMocks.getProfnastilColors.mockResolvedValue({
      colors: [{ id: 8, name: 'RAL 8017', hex: '#442F29', image: '/colors/8017.webp' }],
    })
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
  })

  it('uses the shared required filling color rule', () => {
    expect(form).toContain("import { hasRequiredFillingColor } from '../shared/fillingColorValidation'")
    expect(form).toContain('hasRequiredFillingColor(selectedColorId.value, calc.colorFacade.value)')
    expect(form).not.toContain('colors.value.length > 0 && selectedColorId.value === null')
  })

  it('blocks every navigation path while color saving is pending or failed', () => {
    expect(form).toContain("createFillingAppearanceSaveCoordinator(calc, 'facade')")
    expect(form).toContain('appearanceSaving.value || appearanceSaveFailed.value')
    expect(form).toContain('defineExpose({ validateBeforeLeave })')
    expect(form).toContain('data-testid="appearance-save-retry"')
  })

  it('keeps the newly persisted color in calculation state after a successful save', async () => {
    const wrapper = mountFacade()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('select').setValue('8')
    await flushPromises()

    const calc = useCalculation()
    expect(calc.colorFacadeId.value).toBe(8)
    expect(calc.fillingProfileFacade.value).toEqual({ kind: 'c8' })
    expect(calc.fillingProfileFacadeProblem.value).toBeNull()
    expect(calc.colorFacade.value).toBe('RAL 8017')
    expect(apiMocks.saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorFacadeId: 8 }))
  })

  it('retries the color chosen by the user after a rejected save', async () => {
    const wrapper = mountFacade()
    await flushPromises()
    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('network unavailable'))
    await wrapper.get('select').setValue('8')
    await flushPromises()

    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(true)
    apiMocks.saveWicketData.mockResolvedValueOnce({ lockVersion: 2 })
    await wrapper.get('[data-testid="appearance-save-retry"]').trigger('click')
    await flushPromises()

    const calc = useCalculation()
    expect(calc.colorFacadeId.value).toBe(8)
    expect(calc.colorFacade.value).toBe('RAL 8017')
    expect(apiMocks.saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorFacadeId: 8 }))
    expect(wrapper.find('[data-testid="appearance-save-error"]').exists()).toBe(false)
  })
})
