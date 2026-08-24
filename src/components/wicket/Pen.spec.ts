import { flushPromises, mount } from '@vue/test-utils'
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

describe('Pen frame color capability', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.isTherePenName.value = 'Будет'
    calc.penProvided.value = 'Предоставляет изготовитель'
    calc.penInstalled.value = 'Устанавливает изготовитель'
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
    const nextButton = wrapper.findAll('button').find(button => button.text() === 'Далее')
    await nextButton?.trigger('click')

    expect(wrapper.text()).toContain('Для выбранной ручки не настроен доступный цвет')
    expect(wrapper.emitted('next')).toBeUndefined()
  })
})
