import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveWicketData } from '../../app/api/wicket'
import { useCalculation } from '../../composables/useCalculation'
import StolbVariantOtkritiya from './StolbVariantOtkritiya.vue'

vi.mock('../../app/api/wicket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../app/api/wicket')>()),
  getAssortmentStolb: vi.fn().mockResolvedValue({ assortmentPipe: [] }),
  getPolozhenieJumper: vi.fn().mockResolvedValue({ availablePolozheniyeJumper: [] }),
  getAssortmentJumper: vi.fn().mockResolvedValue({ assortmentJumper: [] }),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn(),
}))

async function validateBeforeLeave(wrapper: VueWrapper): Promise<boolean> {
  return await (wrapper.vm as unknown as {
    validateBeforeLeave: () => boolean | Promise<boolean>
  }).validateBeforeLeave()
}

function mountComponent() {
  return mount(StolbVariantOtkritiya, {
    global: { stubs: { B24Button: true, B24Modal: true, B24SelectMenu: true } },
  })
}

function getNextButton(wrapper: VueWrapper) {
  const button = wrapper.findAll('button').find(candidate => candidate.text() === 'Далее')
  if (!button) throw new Error('Кнопка «Далее» не найдена')
  return button
}

describe('StolbVariantOtkritiya navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    vi.mocked(saveWicketData).mockClear()
  })

  it('rejects a missing opening option and keeps the existing modal message', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    expect(await validateBeforeLeave(wrapper)).toBe(false)
    await flushPromises()
    expect(document.body.textContent).toContain('Выберите вариант открытия')
    expect(saveWicketData).not.toHaveBeenCalled()
    await getNextButton(wrapper).trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
  })

  it('awaits saving a selected opening option and allows Next once', async () => {
    useCalculation().openingOptionId.value = 1
    const wrapper = mountComponent()
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()
    let finishSave!: (response: { lockVersion: number }) => void
    vi.mocked(saveWicketData).mockImplementationOnce(() => new Promise<{ lockVersion: number }>(resolve => {
      finishSave = resolve
    }))

    const validation = validateBeforeLeave(wrapper)
    let finished = false
    void validation.then(() => { finished = true })
    await flushPromises()
    expect(finished).toBe(false)
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    finishSave({ lockVersion: 1 })
    expect(await validation).toBe(true)
    await getNextButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})
