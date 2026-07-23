import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import Type3Drawing from './Type3Drawing.vue'

describe('Type3Drawing', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('рисует точное число штакетин и выбранные столбы', () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8
    store.hasStolby = 1
    store.stolbName = '80x80x3'

    const wrapper = mount(Type3Drawing)

    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(8)
    expect(wrapper.find('[data-testid="type3-posts"]').exists()).toBe(true)
  })

  it('скрывает заполнение по переключателю', async () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8

    const wrapper = mount(Type3Drawing)
    await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)

    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  })

  it('всегда показывает стороны и скрывает одностороннее заполнение со двора', async () => {
    const store = useWicketFormStore()
    store.fillSide = 'Одна сторона'
    store.numberOfSticks = 8

    const wrapper = mount(Type3Drawing)
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()

    expect(wrapper.text()).toContain('С улицы')
    expect(wrapper.text()).toContain('Со двора')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  })

  it('переключает реальные цвета на схематичные', async () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8
    store.colorFacadeHex = '#123456'

    const wrapper = mount(Type3Drawing)
    expect(wrapper.get('[data-testid="type3-pickets"]').attributes('fill')).toBe('#123456')

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()

    expect(wrapper.get('[data-testid="type3-pickets"]').attributes('fill')).toBe('#bfdbfe')
  })
})
