import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import IsTherelock from './IsTherelock.vue'

vi.mock('../../app/api/wicket', async importOriginal => ({
  ...(await importOriginal<typeof import('../../app/api/wicket')>()),
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  recalculate: vi.fn().mockResolvedValue({ priceRetail: 1000, priceDealer: 900 }),
}))

function mountPresence() {
  return mount(IsTherelock, { global: { stubs: { B24Button: {
    props: ['label'], emits: ['click'], template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  } } } })
}

describe('root lock numeric presence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const calc = useCalculation()
    calc.reset()
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.modelId.value = '1'
    calc.lockSetId.value = 819
    calc.isThereLock.value = 1
  })

  it('uses canonical presence rather than a contradictory caption', async () => {
    const calc = useCalculation()
    calc.isThereLockName.value = 'Нет'
    const wrapper = mountPresence()
    await flushPromises()
    expect(wrapper.findAll('input[name="providesLock"]')).toHaveLength(2)
    expect(wrapper.get('input[name="lock-presence"][value="1"]').element).toHaveProperty('checked', true)
    expect(saveWicketData).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not guess an invalid presence or leave before an explicit choice', async () => {
    const calc = useCalculation()
    calc.loadFromApi({ lockSetId: 'bad' })
    calc.isThereLockName.value = 'Есть'
    const wrapper = mountPresence()
    await flushPromises()
    expect(wrapper.findAll('input[name="providesLock"]')).toHaveLength(0)
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.findAll('button').find(button => button.text() === 'Далее')!.trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
    expect(recalculate).not.toHaveBeenCalled()
    await wrapper.get('input[name="lock-presence"][value="0"]').setValue()
    await flushPromises()
    expect(calc.isThereLock.value).toBe(0)
    expect(calc.lockSetId.value).toBe(null)
    expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ lockSetId: null }))
    wrapper.unmount()
  })

  it('restores numeric presence and root fields on rejection even with a renamed caption', async () => {
    const calc = useCalculation()
    calc.isThereLockName.value = 'Переименовано'
    calc.providesLock.value = 'customer'
    calc.lockInstaller.value = 'manufacturer'
    calc.priceRetail.value = 1000
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('rejected'))
    const wrapper = mountPresence()
    await flushPromises()
    await wrapper.get('input[name="lock-presence"][value="0"]').setValue()
    await flushPromises()
    expect(calc.isThereLock.value).toBe(1)
    expect(calc.lockSetId.value).toBe(819)
    expect(calc.providesLock.value).toBe('customer')
    expect(calc.lockInstaller.value).toBe('manufacturer')
    expect(wrapper.get('input[name="lock-presence"][value="1"]').element).toHaveProperty('checked', true)
    expect(recalculate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
