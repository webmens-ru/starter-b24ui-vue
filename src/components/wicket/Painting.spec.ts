import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import Painting from './Painting.vue'

vi.mock('../../app/api/wicket', async (original) => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [
    { id: 1, name: 'Белая', paintCategoryName: 'Стандартная', isFixedColor: true, primers: [{ id: 10, name: 'Грунт А' }], hex: '#ffffff' },
    { id: 2, name: 'Индивидуальная эмаль', paintCategoryName: 'Индивидуальная', isFixedColor: false, primers: [{ id: 20, name: 'Грунт Б' }] },
  ] }),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 2 }),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 0, priceRetail: 0 }),
}))
const { saveWicketData } = await import('../../app/api/wicket')

const selectStub = {
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `<select :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value)">
    <template v-for="(item, i) in items" :key="i"><option v-if="!item.type" :value="item.id">{{ item.label }}</option></template>
  </select>`,
}
function render() {
  return mount(Painting, { global: { stubs: {
    B24SelectMenu: selectStub,
    SelectMenu: selectStub,
    B24Button: { props: ['label'], template: '<button>{{ label }}</button>' },
    Button: { props: ['label'], template: '<button>{{ label }}</button>' },
  } } })
}

describe('Окраска', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    vi.clearAllMocks()
  })

  it('requires a nonblank note for individual paint before saving or leaving', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-testid="paint-color"]').setValue('2')
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    expect(wrapper.text()).toContain('Укажите примечание к цвету краски')
    await wrapper.get('textarea').setValue('   ')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.get('textarea').setValue('  По образцу заказчика  ')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      colorShieldId: '2', colorShieldNote: 'По образцу заказчика', primerId: null,
    }))
    wrapper.unmount()
  })

  it('offers compatible primers, permits no primer and clears an incompatible selection on paint change', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[data-testid="paint-primer"]').text()).toContain('Грунт А')
    expect(wrapper.get('[data-testid="paint-primer"]').text()).not.toContain('Грунт Б')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    await wrapper.get('[data-testid="paint-primer"]').setValue('10')
    await flushPromises()
    expect(useCalculation().primerId.value).toBe(10)
    await wrapper.get('[data-testid="paint-color"]').setValue('2')
    expect(useCalculation().primerId.value).toBeNull()
    expect(wrapper.get('[data-testid="paint-primer"]').text()).toContain('Грунт Б')
    wrapper.unmount()
  })

  it('restores note and primer and keeps painting fields through a full save and reload', async () => {
    const calc = useCalculation()
    calc.loadFromApi({ colorShieldId: 2, colorShieldNote: 'Матовый по образцу', primerId: '20', primerName: 'Грунт Б' })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('Матовый по образцу')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="paint-primer"]').element.value).toBe('20')
    expect(calc.getFullSavePayload()).toMatchObject({ colorShieldNote: 'Матовый по образцу', primerId: 20 })
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params).toContainEqual({ name: 'Грунтовка', value: 'Грунт Б' })
    wrapper.unmount()
  })

  it('does not advance when saving fails', async () => {
    const wrapper = render()
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('Ошибка сохранения'))
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    expect(wrapper.text()).toContain('Ошибка сохранения')
    expect(wrapper.emitted('next')).toBeUndefined()
    wrapper.unmount()
  })
})
