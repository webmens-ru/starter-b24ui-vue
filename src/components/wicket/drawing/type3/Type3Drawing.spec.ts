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

  it('показывает переключатель сторон только для двухстороннего заполнения', () => {
    const store = useWicketFormStore()
    store.fillSide = 'Две стороны'

    const wrapper = mount(Type3Drawing)

    expect(wrapper.text()).toContain('Улица')
    expect(wrapper.text()).toContain('Двор')
  })
})
