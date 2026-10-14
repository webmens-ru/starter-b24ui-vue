import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RazmeryProyema from './RazmeryProyema.vue'
import { saveWicketData } from '../../app/api/wicket'
import { useCalculation } from '../../composables/useCalculation'

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

function mountComponent() {
  return mount(RazmeryProyema)
}

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as {
    validateBeforeLeave: () => boolean | Promise<boolean>
  }).validateBeforeLeave()
}

function getNextButton(wrapper: ReturnType<typeof mountComponent>) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) {
    throw new Error('Кнопка «Далее» не найдена')
  }
  return button
}

async function fillValidOpening(wrapper: ReturnType<typeof mountComponent>) {
  await wrapper.get('#width').setValue('1000')
  await wrapper.get('#height').setValue('2000')
  await wrapper.get('#clearance').setValue('50')
}

describe('RazmeryProyema', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    vi.clearAllMocks()
  })

  it.each([
    ['width', '1201', 'От 700 до 1200 мм'],
    ['height', '2501', 'От 1000 до 2500 мм'],
  ])('блокирует переход при превышении максимума поля %s', async (field, value, message) => {
    const wrapper = mountComponent()
    await flushPromises()
    await fillValidOpening(wrapper)
    await wrapper.get(`#${field}`).setValue(value)
    await getNextButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('next')).toBeUndefined()
    expect(wrapper.text()).toContain(message)
  })

  it('принимает максимальные ширину 1200 мм и высоту 2500 мм', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.get('#width').attributes('placeholder')).toBe('Введите ширину (700–1200)')
    expect(wrapper.get('#height').attributes('placeholder')).toBe('Введите высоту (1000–2500)')
    await wrapper.get('#width').setValue('1200')
    await wrapper.get('#height').setValue('2500')
    await wrapper.get('#clearance').setValue('50')
    await getNextButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('rejects an out-of-range opening through the exposed guard', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await fillValidOpening(wrapper)
    await wrapper.get('#width').setValue('699')
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    expect(wrapper.text()).toContain('От 700 до 1200 мм')
    expect(saveWicketData).not.toHaveBeenCalled()
  })

  it('accepts 700x1000 with valid clearance and saves before leaving', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.get('#width').setValue('700')
    await wrapper.get('#height').setValue('1000')
    await wrapper.get('#clearance').setValue('10')
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(true)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
  })

  it('allows only one Next attempt while saving and rejects an overlapping guard call', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.get('#width').setValue('700')
    await wrapper.get('#height').setValue('1000')
    await wrapper.get('#clearance').setValue('10')
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
