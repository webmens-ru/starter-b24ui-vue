import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const priceDealer = ref<string | number>('')
const priceRetail = ref<string | number>('')
vi.mock('../composables/useCalculation', () => ({
  useCalculation: () => ({ priceDealer, priceRetail }),
}))
import PricePanel from './PricePanel.vue'

describe('PricePanel', () => {
  beforeEach(() => { priceDealer.value = ''; priceRetail.value = '' })

  it('shows dashes when prices are unavailable and updates with calculation results', async () => {
    const wrapper = mount(PricePanel)
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['—', '—'])
    priceDealer.value = 0
    priceRetail.value = '150'
    await nextTick()
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['0', '150'])
    priceDealer.value = ''
    priceRetail.value = ''
    await nextTick()
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['—', '—'])
    wrapper.unmount()
  })
})
