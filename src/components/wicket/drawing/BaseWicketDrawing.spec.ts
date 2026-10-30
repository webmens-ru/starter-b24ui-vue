import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../stores/wicket/wicketFormStore'
import BaseWicketDrawing from './BaseWicketDrawing.vue'

describe('base-only drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useWicketFormStore()
    store.widthProyema = '700'
    store.heightProyema = '1500'
    store.hasStolby = 0
    store.postProfile = null
    store.jumperPlacement = 'none'
    store.jumperProfile = null
    store.openingOrientation = { hingeSide: 'left', opensOutward: true }
  })
  it('draws the minimum opening without posts and mirrors it once', async () => {
    const wrapper = mount(BaseWicketDrawing, { props: { profileSize: 60 } })
    expect(wrapper.get('svg').attributes('viewBox')).toBe('-6 0 712 1500')
    expect(wrapper.find('[data-testid="base-wicket-posts"]').exists()).toBe(false)
    await wrapper.get('[data-testid="base-view-yard"]').setValue()
    expect(wrapper.get('svg > g').attributes('transform')).toBe('translate(700 0) scale(-1 1)')
    await wrapper.get('[data-testid="base-color-schematic"]').setValue()
    expect(wrapper.get('[data-testid="base-wicket-outer-frame"]').attributes('fill')).toBe('#d1d5db')
  })
  it('moves a rear jumper between the background and foreground views', async () => {
    const store = useWicketFormStore()
    store.jumperPlacement = 'behind'
    store.jumperProfile = { sizeA: 60, sizeB: 60 }
    const wrapper = mount(BaseWicketDrawing, { props: { profileSize: 60 } })
    expect(wrapper.get('[data-testid="base-jumper-background"]').attributes('stroke-dasharray')).toBe('12 8')
    await wrapper.get('[data-testid="base-view-yard"]').setValue()
    expect(wrapper.find('[data-testid="base-jumper-background"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="base-jumper-foreground"]').exists()).toBe(true)
  })
  it('reports missing selected post geometry instead of guessing', () => {
    useWicketFormStore().hasStolby = 1
    const wrapper = mount(BaseWicketDrawing, { props: { profileSize: 50 } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
  })
})
