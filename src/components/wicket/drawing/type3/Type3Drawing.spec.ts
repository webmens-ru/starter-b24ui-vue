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

  it('передаёт выбранный профиль перемычки в геометрию', () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'Над калиткой'
    store.peremichkaSortamentName = '80/80/3'

    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes()).toMatchObject({
      y: '0',
      height: '80',
    })
  })

  it('переносит перемычку за калиткой с улицы на фон, а со двора — на передний план', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'За калиткой'
    store.peremichkaSortamentName = '60/60/2'
    store.fillSide = 'Две стороны'
    const wrapper = mount(Type3Drawing)
    const html = wrapper.html()
    const background = wrapper.get('[data-testid="type3-jumper-background"]')

    expect(background.attributes('stroke-dasharray')).toBe('12 8')
    expect(html.indexOf('type3-jumper-background')).toBeLessThan(html.indexOf('type3-frame'))

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    const yardHtml = wrapper.html()
    const foreground = wrapper.get('[data-testid="type3-jumper-foreground"]')

    expect(foreground.attributes('stroke-dasharray')).toBeUndefined()
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-frame'))
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-pickets'))
  })

  it('всегда рисует перемычку над калиткой сплошной на переднем плане', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'Над калиткой'
    store.peremichkaSortamentName = '60/60/2'
    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)
  })
})
