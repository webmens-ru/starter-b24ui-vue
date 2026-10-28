import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdditionalPens, saveWicketData, recalculate } from '../../app/api/wicket'
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
      stubs: { B24Button: defineComponent({ props: ['label'], template: '<button>{{ label }}</button>' }), B24SelectMenu: SelectStub, SelectMenu: SelectStub, ImageViewer: true },
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

describe('independent additional pens', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(saveWicketData).mockResolvedValue(undefined as never)
    const calc = useCalculation()
    calc.reset()
    calc.modelId.value = '1'
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.penProvided.value = 'manufacturer'
    calc.penInstalled.value = 'manufacturer'
    vi.mocked(getAdditionalPens).mockResolvedValue({ items: [
      { id: 7, marking: 'Renamed', canUseFrameColor: true, colors: [{ id: 3, name: 'Any caption' }] },
      { id: 8, marking: 'Other', canUseFrameColor: false, colors: [{ id: 4, name: 'Цвет каркаса' }] },
    ] })
  })
  it('does not select a first model or save on mount', async () => {
    const wrapper = mountPen()
    await flushPromises()
    expect(wrapper.text()).toContain('Ручка с улицы')
    expect(wrapper.text()).toContain('Ручка со двора')
    expect(wrapper.findAll('input[value="7"]:checked')).toHaveLength(0)
    expect(saveWicketData).not.toHaveBeenCalled()
  })
  it('saves two independent welded models with fixed manufacturer roles', async () => {
    const wrapper = mountPen()
    await flushPromises()
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    await wrapper.get('input[name="yard-pen"][value="8"]').setValue()
    await flushPromises()
    const selects = wrapper.findAllComponents(SelectStub)
    expect(selects[1]!.props('items')).toEqual([{ id: 4, label: 'Цвет каркаса' }])
    selects[1]!.vm.$emit('update:modelValue', 4)
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({
      additionalPenSidesConfigured: 1, additionalPenStreetId: 7, additionalPenStreetColorId: null,
      additionalPenYardId: 8, additionalPenYardColorId: 4, additionalPenId: null, penColorId: null,
      isTherePen: 1, penProvided: 'manufacturer', penInstalled: 'manufacturer',
    }))
  })
  it('preserves legacy choice without assigning a side and requires explicit resolution', async () => {
    const calc = useCalculation()
    calc.additionalPenId.value = 7
    calc.penColorId.value = 3
    const wrapper = mountPen()
    await flushPromises()
    expect(wrapper.text()).toContain('Renamed')
    expect(wrapper.text()).toContain('Any caption')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.additionalPenId.value).toBe(7)
    await wrapper.get('input[name="street-pen"][value="none"]').setValue()
    await wrapper.get('input[name="yard-pen"][value="none"]').setValue()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ isTherePen: 0, additionalPenId: null }))
  })
  it('blocks unknown IDs and unavailable colours', async () => {
    const calc = useCalculation()
    calc.loadFromApi({ additionalPenSidesConfigured: 1, additionalPenStreetId: 999, additionalPenYardId: null })
    const wrapper = mountPen()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    await wrapper.get('input[name="street-pen"][value="8"]').setValue()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
  })
  it('blocks Next on save failure and retries without losing either side', async () => {
    const wrapper = mountPen()
    await flushPromises()
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    await flushPromises()
    vi.mocked(saveWicketData).mockRejectedValue(new Error('offline'))
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(wrapper.text()).toContain('Не удалось сохранить')
    vi.mocked(saveWicketData).mockResolvedValue(undefined as never)
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(useCalculation().additionalPenStreetId.value).toBe(7)
  })
  it('restores both numeric FK selections and captions without saving', async () => {
    const calc = useCalculation()
    calc.loadFromApi({ additionalPenSidesConfigured: 1, additionalPenStreetId: 7, additionalPenStreetColorId: null, additionalPenYardId: 8, additionalPenYardColorId: 4, penProvidedCode: 'manufacturer', penInstalledCode: 'customer' })
    const wrapper = mountPen()
    await flushPromises()
    expect(wrapper.get('input[name="street-pen"][value="7"]').element).toHaveProperty('checked', true)
    expect(wrapper.get('input[name="yard-pen"][value="8"]').element).toHaveProperty('checked', true)
    expect(wrapper.findAllComponents(SelectStub)[0]!.props('modelValue')).toBe('frame')
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await validateBeforeLeave(wrapper)).toBe(true)
  })
  it('requests welded pens and fixes roles without exposing participant controls', async () => {
    const calc = useCalculation()
    calc.loadFromApi({ additionalPenSidesConfigured: 1, additionalPenStreetId: 7, penProvidedCode: 'customer', penInstalledCode: 'unknown' })
    const wrapper = mountPen()
    await flushPromises()
    expect(getAdditionalPens).toHaveBeenCalledWith('1', 'welding')
    expect(wrapper.find('input[name="penProvided"]').exists()).toBe(false)
    expect(wrapper.find('input[name="penInstalled"]').exists()).toBe(false)
    expect(saveWicketData).not.toHaveBeenCalled()
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ penProvided: 'manufacturer', penInstalled: 'manufacturer' }))
  })
  it('waits for the latest edit before emitting Next', async () => {
    const wrapper = mountPen()
    await flushPromises()
    let finish!: (value: never) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    let finishLatest!: (value: never) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(resolve => { finishLatest = resolve }))
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    finish(undefined as never)
    await flushPromises()
    expect(wrapper.emitted('next')).toBeUndefined()
    finishLatest(undefined as never)
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ additionalPenStreetId: 7 }))
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
  it('restores legacy store and summary on rejection while keeping the UI ready to retry', async () => {
    const calc = useCalculation()
    calc.additionalPenId.value = 7
    calc.penColorId.value = 3
    calc.additionalPenMarking.value = 'Previous'
    calc.updateOrCreateBlock('additionalPen', [{ paramCode: 'penModel', name: 'Модель', value: 'Previous' }], 'Дополнительная ручка')
    const previous = JSON.parse(JSON.stringify(calc.data.value.find(block => block.blockCode === 'additionalPen')))
    vi.mocked(saveWicketData).mockRejectedValue(new Error('offline'))
    const wrapper = mountPen()
    await flushPromises()
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    await flushPromises()
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.additionalPenId.value).toBe(7)
    expect(calc.penColorId.value).toBe(3)
    expect(calc.additionalPenSidesConfigured.value).toBe(0)
    expect(calc.additionalPenStreetId.value).toBe(null)
    expect(calc.data.value.find(block => block.blockCode === 'additionalPen')).toEqual(previous)
    expect(wrapper.get('input[name="street-pen"][value="7"]').element).toHaveProperty('checked', true)
    vi.mocked(saveWicketData).mockResolvedValue(undefined as never)
    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(calc.additionalPenId.value).toBe(null)
    expect(calc.additionalPenStreetId.value).toBe(7)
  })
  it('keeps successfully persisted fields when recalculation fails', async () => {
    const calc = useCalculation()
    calc.additionalPenId.value = 7
    calc.priceRetail.value = 1000
    vi.mocked(recalculate).mockRejectedValue(new Error('recalculation failed'))
    const wrapper = mountPen()
    await flushPromises()
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    await flushPromises()
    expect(calc.additionalPenSidesConfigured.value).toBe(1)
    expect(calc.additionalPenId.value).toBe(null)
    expect(calc.additionalPenStreetId.value).toBe(7)
    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(calc.additionalPenStreetId.value).toBe(7)
  })
  it('queues changes while saving and sends the latest complete selection', async () => {
    const wrapper = mountPen()
    await flushPromises()
    let resolve!: (value: never) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    await wrapper.get('input[name="street-pen"][value="7"]').setValue()
    await flushPromises()
    await wrapper.get('input[name="yard-pen"][value="7"]').setValue()
    resolve(undefined as never)
    await flushPromises()
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ additionalPenStreetId: 7, additionalPenYardId: 7 }))
  })
})
