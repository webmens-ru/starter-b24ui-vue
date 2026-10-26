import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import Painting from './Painting.vue'

const { categoryFixtures } = vi.hoisted(() => ({ categoryFixtures: [
  { id: 71, name: 'Базовая переименованная', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false, requiresPaintType: true, allowsAnyPrimer: false, quantityCalculationMode: 'consumption' as const, costCoefficient: 1 },
  { id: 83, name: 'Другая', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: false, requiresPaintType: true, allowsAnyPrimer: false, quantityCalculationMode: 'ceilKg' as const, costCoefficient: 1.1 },
  { id: 96, name: 'Произвольная', isFixedColor: false, requiresColorNote: true, isCustomerSupplied: false, requiresPaintType: true, allowsAnyPrimer: false, quantityCalculationMode: 'ceilKg' as const, costCoefficient: 1.1 },
  { id: 125, name: 'Материал клиента', isFixedColor: true, requiresColorNote: false, isCustomerSupplied: true, requiresPaintType: false, allowsAnyPrimer: true, quantityCalculationMode: 'consumption' as const, costCoefficient: 1 },
] }))

vi.mock('../../app/api/wicket', async (original) => ({
  ...(await original<typeof import('../../app/api/wicket')>()),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [
    { id: 1, name: 'Белая', paintCategoryId: 71, primers: [{ id: 10, name: 'Грунт А' }], hex: '#ffffff' },
    { id: 2, name: 'Индивидуальная эмаль', paintCategoryId: 96, primers: [{ id: 20, name: 'Грунт Б' }] },
  ], paintCategories: categoryFixtures }),
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
  it('does not infer an invalid stored paint supplier code from the selected category on load', async () => {
    setActivePinia(createPinia())
    vi.mocked(getColorShield).mockResolvedValueOnce({ colorShield: [
      { id: 1251, name: 'Материал', paintCategoryId: 125, primers: [], paintTypeId: null, paintTypeName: null, consumptionRate: null },
    ], paintCategories: categoryFixtures })
    const calc = useCalculation()
    calc.loadFromApi({ providesPaintCode: 'unknown', colorShieldId: 1251 })
    const wrapper = render()
    await flushPromises()
    expect(calc.providesPaint.value).toBe('')
    wrapper.unmount()
  })
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
    calc.providesPaint.value = 'customer'
    calc.colorShieldId.value = '1'
    calc.doesAssembly.value = 'customer'
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAll('legend').map(legend => legend.text())).toEqual(['Кто осуществляет окраску'])
    expect(wrapper.get('[data-paint-category="71"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('input[name="providesPrimer"][value="customer"]').exists()).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="paint-primer"]').setValue('10')
    await wrapper.get('input[name="doesPaintingFrame"][value="customer"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'customer', doesPaintingFrame: 'customer',
      doesAssembly: 'customer', colorShieldId: '1', primerId: 10,
    }))
    expect(wrapper.find('[data-testid="paint-primer"]').exists()).toBe(false)
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params)
      .toContainEqual({ paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: 'Выполняет заказчик' })
    const payload = calc.getFullSavePayload()
    calc.reset()
    calc.loadFromApi(payload)
    expect(calc.providesPaint.value).toBe('customer')
    expect(wrapper.text()).not.toContain('В старом заказе')
    expect(calc.doesPaintingFrame.value).toBe('customer')
    expect(calc.doesAssembly.value).toBe('customer')
    expect(calc.data.value.some(block => block.blockName === 'Вариант изготовления')).toBe(false)
    wrapper.unmount()
  })

  it('updates performer and removes stale price by codes despite renamed summary labels', async () => {
    const calc = useCalculation()
    calc.colorShieldId.value = '1'
    calc.priceRetail.value = 1200
    const renamedBlocks = [
      { blockCode: 'painting', blockName: 'Changed coating', params: [
        { paramCode: 'paintingPerformer', name: 'Changed performer', value: 'old' },
        { paramCode: 'paint', name: 'Changed material', value: 'keep' },
      ] },
      { blockCode: 'price', blockName: 'Changed commercial', params: [] },
      { blockCode: 'other', blockName: 'Цена', params: [] },
    ]
    vi.mocked(recalculate).mockRejectedValueOnce(new Error('unavailable'))
    const wrapper = render()
    await flushPromises()
    calc.data.value = renamedBlocks
    await wrapper.get('input[name="doesPaintingFrame"][value="customer"]').setValue()
    await flushPromises()
    const coating = calc.data.value.filter(block => block.blockCode === 'painting')
    expect(coating).toHaveLength(1)
    expect(coating[0]?.params.filter(param => param.paramCode === 'paintingPerformer')).toEqual([
      { paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: 'Выполняет заказчик' },
    ])
    expect(coating[0]?.params).toContainEqual({ paramCode: 'paint', name: 'Changed material', value: 'keep' })
    expect(calc.data.value.some(block => block.blockCode === 'price')).toBe(false)
    expect(calc.data.value.some(block => block.blockCode === 'other')).toBe(true)
    wrapper.unmount()
  })

  it('hides all material controls for customer painting and restores selections and validation on return', async () => {
    const calc = useCalculation()
    calc.colorShieldId.value = '2'
    calc.primerId.value = 20
    calc.providesPrimer.value = 'customer'
    const wrapper = render()
    await flushPromises()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    await wrapper.get('input[name="doesPaintingFrame"][value="customer"]').setValue()
    await flushPromises()
    expect(wrapper.findAll('legend').map(item => item.text())).toEqual(['Кто осуществляет окраску'])
    expect(wrapper.find('[aria-label="Категория краски"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="paint-color"]').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Укажите примечание')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      doesPaintingFrame: 'customer', colorShieldId: '2', primerId: 20,
      colorShieldNote: '', providesPrimer: 'customer',
    }))
    await wrapper.get('input[name="doesPaintingFrame"][value="manufacturer"]').setValue()
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('[data-testid="paint-primer"]').element.value).toBe('20')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    wrapper.unmount()
  })

  it.each(['empty', 'unavailable', 'failed', 'pending'])('saves customer painting with an %s catalog', async (catalog) => {
    const calc = useCalculation()
    if (catalog === 'unavailable') calc.colorShieldId.value = '999'
    if (catalog === 'empty') vi.mocked(getColorShield).mockResolvedValueOnce({ colorShield: [] })
    if (catalog === 'failed') vi.mocked(getColorShield).mockRejectedValueOnce(new Error('Каталог недоступен'))
    if (catalog === 'pending') vi.mocked(getColorShield).mockImplementationOnce(() => new Promise(() => {}))
    const wrapper = render()
    await flushPromises()
    await wrapper.get('input[name="doesPaintingFrame"][value="customer"]').setValue()
    await flushPromises()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(wrapper.text()).not.toContain('Каталог недоступен')
    expect(wrapper.text()).not.toContain('Выбранная краска недоступна')
    expect(wrapper.text()).not.toContain('Загрузка красок')
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ doesPaintingFrame: 'customer' }))
    wrapper.unmount()
  })

  it('restores saved customer painting without changing hidden selections or reporting a valid color unavailable', async () => {
    const calc = useCalculation()
    calc.doesPaintingFrame.value = 'customer'
    calc.colorShieldId.value = '2'
    calc.colorShieldNote.value = 'По образцу'
    calc.primerId.value = 20
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid="paint-color"]').exists()).toBe(false)
    expect(calc.primerId.value).toBe(20)
    await wrapper.get('input[name="doesPaintingFrame"][value="manufacturer"]').setValue()
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('По образцу')
    expect(wrapper.text()).not.toContain('Выбранная краска недоступна')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    wrapper.unmount()
  })

  it('requires a nonblank note for individual paint before saving or leaving', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-paint-category="96"]').trigger('click')
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

  it('allows an empty note for a renamed variable-color customer paint', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({
      paintCategories: [{ ...categoryFixtures[3]!, id: 407, name: 'Переименована', isFixedColor: false, requiresColorNote: false }],
      colorShield: [{ id: 31, name: 'Материал', paintCategoryId: 407, primers: [], paintTypeId: null, paintTypeName: null, consumptionRate: null }],
    })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.get('textarea').attributes('required')).toBeUndefined()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorShieldId: '31', colorShieldNote: '' }))
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
    await wrapper.get('[data-paint-category="96"]').trigger('click')
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
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params).toContainEqual({ paramCode: 'primer', name: 'Грунтовка', value: 'Грунт Б' })
    wrapper.unmount()
  })

  it('clears paint and primer for an empty Daval category and restores manufacturer for normal categories', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-testid="paint-primer"]').setValue('10')
    vi.mocked(saveWicketData).mockClear()
    await wrapper.get('[data-paint-category="125"]').trigger('click')
    await flushPromises()
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(useCalculation().colorShieldId.value).toBe('')
    expect(useCalculation().primerId.value).toBeNull()
    expect(wrapper.get('[data-testid="paint-color"]').text()).not.toContain('Белая')
    expect(wrapper.text()).toContain('В этой категории пока нет доступных красок')
    await wrapper.get('[data-paint-category="71"]').trigger('click')
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ providesPaint: 'manufacturer' }))
    expect(wrapper.get('[data-testid="paint-color"]').text()).not.toContain('Индивидуальная эмаль')
    wrapper.unmount()
  })

  it('saves independent primer supplier with customer paint and manufacturer painting through reload', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({ colorShield: [
      { id: 1, name: 'Белая', paintCategoryId: 71, primers: [], paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 100 },
      { id: 8, name: 'Давальческая эмаль', paintCategoryId: 125,
        primers: [{ id: 10, name: 'Грунт А' }, { id: 20, name: 'Грунт Б' }], paintTypeId: null, paintTypeName: null, consumptionRate: null },
    ], paintCategories: categoryFixtures })
    const calc = useCalculation()
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Поставщик грунтовки')
    await wrapper.get('[data-paint-category="125"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="paint-color"]').text()).not.toContain('Белая')
    expect(wrapper.get('[data-testid="paint-primer"]').text()).toContain('Грунт Б')
    await wrapper.get('[data-testid="paint-primer"]').setValue('20')
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'customer', providesPrimer: 'manufacturer',
      doesPaintingFrame: 'manufacturer', primerId: 20,
    }))
    await wrapper.get('input[name="providesPrimer"][value="customer"]').setValue()
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ providesPrimer: 'customer' }))
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params)
      .toContainEqual({ paramCode: 'primerProvider', name: 'Поставщик грунтовки', value: 'Предоставляет заказчик' })
    const payload = calc.getFullSavePayload()
    calc.reset()
    expect(calc.providesPrimer.value).toBe('manufacturer')
    calc.loadFromApi(payload)
    expect(calc.providesPrimer.value).toBe('customer')
    expect(calc.providesPaint.value).toBe('customer')
    expect(calc.primerId.value).toBe(20)
    calc.loadFromApi({ providesPrimer: null })
    expect(calc.providesPrimer.value).toBe('manufacturer')
    await wrapper.get('[data-testid="paint-primer"]').setValue('none')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Поставщик грунтовки')
    expect(calc.data.value.find(block => block.blockName === 'Окраска')?.params.some(param => param.name === 'Поставщик грунтовки')).toBe(false)
    wrapper.unmount()
  })

  it('shows an empty category without saving an unavailable paint', async () => {
    const wrapper = render()
    await flushPromises()
    await wrapper.get('[data-paint-category="83"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('В этой категории пока нет доступных красок')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    wrapper.unmount()
  })

  it('recognizes a configured customer supplied paint without an automatic save', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({
      colorShield: [{ id: 8, name: 'Краска заказчика',
        paintCategoryId: 34, isFixedColor: true, paintTypeId: 1, paintTypeName: 'Эмаль', consumptionRate: 100 }],
      paintCategories: [{ ...categoryFixtures[3]!, id: 34 }],
    })
    const calc = useCalculation()
    calc.colorShieldId.value = '8'
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[data-paint-category="34"]').attributes('aria-pressed')).toBe('true')
    expect(calc.providesPaint.value).toBe('customer')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      providesPaint: 'customer', colorShieldId: '8',
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

  it('keeps equally named arbitrary categories separate and uses independent properties', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({
      paintCategories: [
        { ...categoryFixtures[0]!, id: 407, name: 'Одинаковая', isCustomerSupplied: true, isFixedColor: false, requiresColorNote: true },
        { ...categoryFixtures[3]!, id: 908, name: 'Одинаковая', isCustomerSupplied: false, isFixedColor: true },
      ],
      colorShield: [
        { id: 31, name: 'Первый материал', paintCategoryId: 407, paintTypeId: null, paintTypeName: null, consumptionRate: null },
        { id: 32, name: 'Второй материал', paintCategoryId: 908, paintTypeId: null, paintTypeName: null, consumptionRate: null },
      ],
    })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[data-paint-category="908"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="paint-color"]').text()).toContain('Второй материал')
    expect(wrapper.get('[data-testid="paint-color"]').text()).not.toContain('Первый материал')
    await wrapper.get('[data-paint-category="407"]').trigger('click')
    expect(useCalculation().providesPaint.value).toBe('customer')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    await wrapper.get('textarea').setValue('По образцу')
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorShieldId: '31', providesPaint: 'customer' }))
    wrapper.unmount()
  })

  it('requires category metadata instead of guessing from old labels and supports retry', async () => {
    vi.mocked(getColorShield).mockResolvedValueOnce({ colorShield: [
      { id: 99, name: 'Материал', paintCategoryName: 'Стандартная', paintTypeId: null, paintTypeName: null, consumptionRate: null },
    ] })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('Не удалось загрузить свойства категорий краски')
    expect(wrapper.find('[data-paint-category]').exists()).toBe(false)
    expect(await wrapper.vm.validateBeforeLeave()).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.findAll('button').find(button => button.text() === 'Повторить загрузку')!.trigger('click')
    await flushPromises()
    expect(await wrapper.vm.validateBeforeLeave()).toBe(true)
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
      id: 1, name: 'Эмаль', paintCategoryId: 71, paintTypeId: 1, paintTypeName: 'Эмаль',
      consumptionRate: 100, primers: [],
    }], paintCategories: categoryFixtures })
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
