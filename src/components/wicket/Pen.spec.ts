import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdditionalPens, saveWicketData } from '../../app/api/wicket'
import { useCalculation } from '../../composables/useCalculation'
import Pen from './Pen.vue'

vi.mock('../../app/api/wicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/api/wicket')>()
  return {
    ...actual,
    getAdditionalPens: vi.fn(),
    saveWicketData: vi.fn(async () => undefined),
    recalculate: vi.fn(),
  }
})

const SelectStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: '<div data-testid="color-select" />',
})

function mountPen() {
  return mount(Pen, {
    global: {
      stubs: { B24Button: true, B24SelectMenu: SelectStub, SelectMenu: SelectStub, ImageViewer: true },
    },
  })
}

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as {
    validateBeforeLeave: () => boolean | Promise<boolean>
  }).validateBeforeLeave()
}

function getNextButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) throw new Error('Кнопка «Далее» не найдена')
  return button
}

describe('Pen frame color capability', () => {
  it('does not promote an invalid stored supplier or installer code to manufacturer on mount', async () => {
    setActivePinia(createPinia())
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [] })
    const calc = useCalculation()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.loadFromApi({ isTherePen: 1, isTherePenName: 'Будет', penProvided: 'Предоставляет изготовитель', penProvidedCode: 'unknown',
      penInstalled: 'Устанавливает изготовитель', penInstalledCode: 'unknown' })
    const wrapper = mountPen()
    await flushPromises()
    expect(wrapper.findAll('input[name="penProvided"]')).toHaveLength(2)
    expect(wrapper.find('input[name="penProvided"]:checked').exists()).toBe(false)
    expect(wrapper.find('input[name="penInstalled"]:checked').exists()).toBe(false)
    expect(calc.penProvided.value).toBe('')
    expect(calc.penInstalled.value).toBe('')
    wrapper.unmount()
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.isTherePenName.value = 'Будет'
    calc.penProvided.value = 'manufacturer'
    calc.penInstalled.value = 'manufacturer'
  })

  it('offers frame color together with explicit colors and saves it as null', async () => {
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [{
      id: 7,
      marking: 'СК-7',
      canUseFrameColor: true,
      colors: [{ id: 3, name: 'Чёрный' }],
      imageUrls: [],
    }] })
    const calc = useCalculation()
    calc.additionalPenId.value = 7
    calc.penColorId.value = null

    const wrapper = mountPen()
    await flushPromises()

    const select = wrapper.getComponent(SelectStub)
    expect(select.props('items')).toEqual([
      { id: 'frame', label: 'Цвет каркаса' },
      { id: 3, label: 'Чёрный' },
    ])
    expect(calc.penColorId.value).toBeNull()
    expect(calc.additionalPenColor.value).toBe('Цвет каркаса')
    const saveCalls = vi.mocked(saveWicketData).mock.calls
    expect(saveCalls[saveCalls.length - 1]?.[0]).toMatchObject({ penColorId: null })
  })

  it('does not offer frame color when the pen forbids it', async () => {
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [{
      id: 8,
      marking: 'СК-8',
      canUseFrameColor: false,
      colors: [{ id: 4, name: 'Белый' }],
      imageUrls: [],
    }] })

    const wrapper = mountPen()
    await flushPromises()

    expect(wrapper.getComponent(SelectStub).props('items')).toEqual([{ id: 4, label: 'Белый' }])
    expect(useCalculation().penColorId.value).toBe(4)
  })

  it('blocks continuation when a manufacturer-provided pen has no color choices', async () => {
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [{
      id: 9,
      marking: 'СК-9',
      canUseFrameColor: false,
      colors: [],
      imageUrls: [],
    }] })

    const wrapper = mountPen()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    await getNextButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('Для выбранной ручки не настроен доступный цвет')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('accepts a pen with a configured color and saves before Next', async () => {
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [{
      id: 8,
      marking: 'СК-8',
      canUseFrameColor: false,
      colors: [{ id: 4, name: 'Белый' }],
      imageUrls: [],
    }] })
    const wrapper = mountPen()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('accepts the branch without a manufacturer-selected pen', async () => {
    useCalculation().isTherePenName.value = 'Не будет'
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [] })
    const wrapper = mountPen()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
  })

  it('allows only one Next attempt while saving and rejects an overlapping guard call', async () => {
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [{
      id: 8,
      marking: 'СК-8',
      canUseFrameColor: false,
      colors: [{ id: 4, name: 'Белый' }],
      imageUrls: [],
    }] })
    const wrapper = mountPen()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()
    let finishSave!: (response: { lockVersion: number }) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => {
      finishSave = resolve
    }))

    await getNextButton(wrapper).trigger('click')
    await getNextButton(wrapper).trigger('click')
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('next')).toBeUndefined()

    finishSave({ lockVersion: 1 })
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})
