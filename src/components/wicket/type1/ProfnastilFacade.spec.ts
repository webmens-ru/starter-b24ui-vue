import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import ProfnastilFacade from './ProfnastilFacade.vue'
import form from './ProfnastilFacade.vue?raw'

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
  props: ['modelValue', 'items', 'disabled'],
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
  it('layers the color menu above surrounding content', () => {
    expect(form).toContain(`:b24ui="{ content: 'z-50' }"`)
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
      table: [{ id: 7, material: 'С-8', thickness: '0.5', typeOfCoating: 'Полиэстер' }],
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

    expect(wrapper.get('[data-testid="appearance-save-error"]').exists()).toBe(true)
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
