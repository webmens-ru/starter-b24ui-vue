import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RazmeryProyema from './RazmeryProyema.vue'

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

function mountComponent() {
  return mount(RazmeryProyema)
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
    vi.clearAllMocks()
  })

  it.each([
    ['width', '1201', 'От 600 до 1200 мм'],
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
    expect(wrapper.get('#width').attributes('placeholder')).toBe('Введите ширину (600–1200)')
    expect(wrapper.get('#height').attributes('placeholder')).toBe('Введите высоту (1000–2500)')
    await wrapper.get('#width').setValue('1200')
    await wrapper.get('#height').setValue('2500')
    await wrapper.get('#clearance').setValue('50')
    await getNextButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})
