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
const { saveWicketData, recalculate, getColorShield } = await import('../../app/api/wicket')

const selectStub = {
  props: ['modelValue', 'items', 'disabled'],
  emits: ['update:modelValue'],
  template: `<select :value="modelValue ?? ''" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)">
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

  it('shows providers first and saves both choices with legacy assembly and painting details', async () => {
    const calc = useCalculation()
    calc.providesPaint.value = 'Предоставляет заказчик'
    calc.doesAssembly.value = 'Выполняет заказчик'
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAll('legend').map(legend => legend.text())).toEqual(['Окраска каркаса'])
    expect(wrapper.get('[data-paint-category="Давальческая"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('input[value="Предоставляет заказчик"]').exists()).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.get('input[value="Выполняет заказчик"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'Предоставляет заказчик', doesPaintingFrame: 'Выполняет заказчик',
      doesAssembly: 'Выполняет заказчик', colorShieldId: '1', primerId: null,
    }))
    await wrapper.get('[data-testid="paint-primer"]').setValue('10')
    await flushPromises()
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params.slice(0, 2)).toEqual([
      { name: 'Краска', value: 'Предоставляет заказчик' },
      { name: 'Окраска каркаса', value: 'Выполняет заказчик' },
    ])
    const payload = calc.getFullSavePayload()
    calc.reset()
    calc.loadFromApi(payload)
    expect(calc.providesPaint.value).toBe('Предоставляет заказчик')
    expect(calc.doesPaintingFrame.value).toBe('Выполняет заказчик')
    expect(calc.doesAssembly.value).toBe('Выполняет заказчик')
    expect(calc.data.value.some(block => block.blockName === 'Вариант изготовления')).toBe(false)
    wrapper.unmount()
  })

  it('requires a nonblank note for individual paint before saving or leaving', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-paint-category="Индивидуальная"]').trigger('click')
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
    await wrapper.get('[data-paint-category="Индивидуальная"]').trigger('click')
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

  it('keeps the underlying color and primer for customer supplied paint and restores manufacturer for normal categories', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-testid="paint-primer"]').setValue('10')
    await wrapper.get('[data-paint-category="Давальческая"]').trigger('click')
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'Предоставляет заказчик', colorShieldId: '1', primerId: 10,
    }))
    expect(wrapper.get('[data-testid="paint-color"]').text()).toContain('Индивидуальная эмаль')
    await wrapper.get('[data-paint-category="Стандартная"]').trigger('click')
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ providesPaint: 'Предоставляет изготовитель' }))
    expect(wrapper.get('[data-testid="paint-color"]').text()).not.toContain('Индивидуальная эмаль')
    wrapper.unmount()
  })

  it('shows an empty category without saving an unavailable paint', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-paint-category="Не стандартная"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('В этой категории пока нет доступных красок')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    wrapper.unmount()
  })

  it('recognizes a configured customer supplied paint without an automatic save', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({
      colorShield: [{ id: 8, name: 'Краска заказчика', paintCategoryName: 'Давальческая',
        paintCategoryId: 34, isFixedColor: true, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 100 }],
      paintCategories: [{ id: 34, name: 'Давальческая', isFixedColor: false }],
    })
    const calc = useCalculation()
    calc.colorShieldId.value = '8'
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[data-paint-category="Давальческая"]').attributes('aria-pressed')).toBe('true')
    expect(calc.providesPaint.value).toBe('Предоставляет заказчик')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'Предоставляет заказчик', colorShieldId: '8',
    }))
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

  it('explains calculation failure separately from a successful painting save and allows leaving', async () => {
    const calc = useCalculation()
    calc.priceRetail.value = '1000'
    const wrapper = render()
    await flushPromises()
    vi.mocked(recalculate).mockRejectedValueOnce({ response: { status: 422, data: {
      error: 'Не удалось рассчитать цену',
      problems: [{ message: 'Заклёпка 5×3,2 мм: позиция не найдена.' }],
    } } })
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(wrapper.text()).toContain('Окраска сохранена')
    expect(wrapper.text()).toContain('Заклёпка 5×3,2 мм: позиция не найдена.')
    expect(wrapper.text()).not.toContain('Request failed')
    wrapper.unmount()
  })

  it('disables the primer dropdown when no compatible primers exist', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({ colorShield: [{
      id: 1, name: 'Эмаль', isFixedColor: true, paintTypeId: 1, paintTypeName: 'Эмаль',
      consumptionRate: 100, primers: [],
    }] })
    const wrapper = render()
    await flushPromises()
    const select = wrapper.get<HTMLSelectElement>('[data-testid="paint-primer"]')
    expect(select.element.disabled).toBe(true)
    expect(select.element.value).toBe('none')
    expect(wrapper.text()).toContain('Без грунтовки')
    wrapper.unmount()
  })

  it('shows server validation details when the painting itself could not be saved', async () => {
    const wrapper = render()
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValueOnce({ response: { status: 422, data: {
      errors: { primerId: ['Выберите совместимую грунтовку.'] },
    } } })
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    expect(wrapper.text()).toContain('Выберите совместимую грунтовку.')
    wrapper.unmount()
  })
})
