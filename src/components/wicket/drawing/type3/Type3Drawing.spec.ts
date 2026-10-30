import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import Type3Drawing from './Type3Drawing.vue'

describe('Type3Drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useWicketFormStore().hasStolby = 0
    useWicketFormStore().jumperPlacement = 'none'
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    { opensOutward: true, hingeSide: 'left' as const },
    { opensOutward: true, hingeSide: 'right' as const },
    { opensOutward: false, hingeSide: 'left' as const },
    { opensOutward: false, hingeSide: 'right' as const },
  ])('shows hinges with the correct layer and mirrored yard view: $opensOutward/$hingeSide', async orientation => {
    const store = useWicketFormStore()
    store.widthProyema = '900'
    store.heightProyema = '2000'
    store.fillSide = 0
    store.openingOrientation = orientation
    const wrapper = mount(Type3Drawing)
    for (const yard of [false, true]) {
      if (yard) await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
      const hinges = wrapper.get('[data-testid="type3-hinges"]')
      expect(hinges.findAll('rect')).toHaveLength(4)
      const x = hinges.get('rect').attributes('x')
      expect(x).toBe(orientation.hingeSide === 'left' ? '-6' : '884')
      const behind = wrapper.html().indexOf('data-testid="type3-hinges"') < wrapper.html().indexOf('data-testid="type3-frame"')
      expect(behind).toBe(!orientation.opensOutward !== yard)
      expect(wrapper.get('[data-testid="type3-drawing-view"]').attributes('transform')).toBe(yard ? 'translate(900 0) scale(-1 1)' : undefined)
    }
    wrapper.unmount()
  })

  it('shows only frame on both views for explicit zero with stale pickets and invalid orientation', async () => {
    const store = useWicketFormStore()
    store.widthProyema = '700'
    store.heightProyema = '1500'
    store.fillSide = 0
    store.colorFacadeImage = '/stale-fill.png'
    store.numberOfSticks = 8
    store.raspolozheniyePolotna = ''
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="type3-detail-5"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="type3-detail-6"]').attributes('height')).toBe('40')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    expect(wrapper.find('image[href="/stale-fill.png"]').exists()).toBe(false)
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    expect(wrapper.findAll('[data-testid="type3-detail-5"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="type3-detail-6"]').attributes('height')).toBe('40')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    wrapper.unmount()
  })

  it('renders an error, not SVG, when a used jumper has no numeric profile', () => {
    useWicketFormStore().jumperPlacement = 'behind'
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
    wrapper.unmount()
  })

  it.each(['jumperPlacement', 'hasStolby'] as const)('shows an error instead of SVG when %s is unknown', field => {
    useWicketFormStore()[field] = null
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
    wrapper.unmount()
  })

  it('рисует точное число штакетин и выбранные столбы', () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8
    store.hasStolby = 1
    store.postProfile = { sizeA: 80, sizeB: 80 }
    store.stolbName = '80x80x3'

    const wrapper = mount(Type3Drawing)

    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(8)
    expect(wrapper.find('[data-testid="type3-posts"]').exists()).toBe(true)
  })

  it('uses the selected frame paint for posts on both sides and in schematic mode', async () => {
    const store = useWicketFormStore()
    store.widthProyema = '900'
    store.heightProyema = '2000'
    store.hasStolby = 1
    store.postProfile = { sizeA: 50, sizeB: 50 }
    store.fillSide = 0
    store.colorShieldHex = '#315c2b'
    const wrapper = mount(Type3Drawing)
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#315c2b')
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#315c2b')
    store.colorShieldHex = '#123456'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#123456')
    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#d1d5db')
    wrapper.unmount()
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
    store.fillSide = 1
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
    store.jumperPlacement = 'above'
    store.peremichkaSortamentName = '80/80/3'
    store.jumperProfile = { sizeA: 80, sizeB: 50 }

    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes()).toMatchObject({
      y: '0',
      height: '80',
    })
  })

  it('переносит перемычку за калиткой с улицы на фон, а со двора — на передний план', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'За калиткой'
    store.jumperPlacement = 'behind'
    store.peremichkaSortamentName = '60/60/2'
    store.jumperProfile = { sizeA: 60, sizeB: 50 }
    store.fillSide = 2
    const wrapper = mount(Type3Drawing)
    const html = wrapper.html()
    const background = wrapper.get('[data-testid="type3-jumper-background"]')

    expect(background.attributes('stroke-dasharray')).toBe('12 8')
    expect(background.attributes('fill')).toBe('none')
    expect(html.indexOf('type3-jumper-background')).toBeLessThan(html.indexOf('type3-frame'))

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    const yardHtml = wrapper.html()
    const foreground = wrapper.get('[data-testid="type3-jumper-foreground"]')

    expect(foreground.attributes('stroke-dasharray')).toBeUndefined()
    expect(foreground.attributes('fill')).toBe('#66686c')
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-frame'))
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-pickets'))

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue(true)
    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('fill')).toBe('#d1d5db')
  })

  it('всегда рисует перемычку над калиткой сплошной на переднем плане', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'Над калиткой'
    store.jumperPlacement = 'above'
    store.peremichkaSortamentName = '60/60/2'
    store.jumperProfile = { sizeA: 60, sizeB: 50 }
    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)
  })

  it.each(['upperAndLowerNet', 'upperNet'] as const)('рисует верхнюю сетку %s за рамой и сохраняет её при скрытии штакетин', async (shieldType) => {
    const store = useWicketFormStore()
    store.widthProyema = '600'
    store.heightProyema = '1000'
    store.shieldType = shieldType
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/upper.png'
    store.numberOfSticks = 4

    const wrapper = mount(Type3Drawing)
    const image = wrapper.get('[data-testid="type3-upper-net-image"]')
    const background = wrapper.get('[data-testid="type3-upper-net-background"]')
    const net = wrapper.get('[data-testid="type3-upper-net"]')
    const pattern = image.element.parentElement
    const html = wrapper.html()

    expect(image.attributes('href')).toBe('/upper.png')
    expect(image.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(pattern?.getAttribute('width')).toBe(image.attributes('width'))
    expect(pattern?.getAttribute('height')).toBe(net.attributes('height'))
    expect(net.attributes('fill')).toMatch(/^url\(#type3-upper-net-pattern-\d+\)$/)
    expect(background.attributes('fill')).toBe('#66686c')
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(html.indexOf('data-testid="type3-upper-net-background"')).toBeLessThan(html.indexOf('data-testid="type3-upper-net"'))
    expect(html.indexOf('data-testid="type3-upper-net"')).toBeLessThan(html.indexOf('data-testid="type3-frame"'))
    expect(wrapper.find('[data-testid="type3-lower-rail"]').exists()).toBe(shieldType === 'upperAndLowerNet')

    await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="type3-upper-net"]').exists()).toBe(true)

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
    expect(wrapper.get('[data-testid="type3-upper-net-background"]').attributes('fill')).toBe('#d1d5db')
  })

  it('uses a different upper net pattern ID for each drawing instance', () => {
    const store = useWicketFormStore()
    store.shieldType = 'upperNet'
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/upper.png'

    const first = mount(Type3Drawing).get('[data-testid="type3-upper-net"]').attributes('fill')
    const second = mount(Type3Drawing).get('[data-testid="type3-upper-net"]').attributes('fill')

    expect(first).not.toBe(second)
  })

  it('sizes upper net tiles from the loaded image ratio and ignores a stale image load', async () => {
    class NetImage {
      static pending: NetImage[] = []
      naturalWidth = 600
      naturalHeight = 200
      onload: (() => void) | null = null
      src = ''

      constructor() {
        NetImage.pending.push(this)
      }
    }
    vi.stubGlobal('Image', NetImage)
    const store = useWicketFormStore()
    store.shieldType = 'upperNet'
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/old.png'
    const wrapper = mount(Type3Drawing)
    const pattern = wrapper.get('[data-testid="type3-upper-net-image"]').element.parentElement

    expect(pattern?.getAttribute('width')).toBe('300')
    store.upperGrilleNetImage = '/new.png'
    await wrapper.vm.$nextTick()
    expect(NetImage.pending).toHaveLength(2)

    NetImage.pending[0]?.onload?.()
    await wrapper.vm.$nextTick()
    expect(pattern?.getAttribute('width')).toBe('300')

    NetImage.pending[1]?.onload?.()
    await wrapper.vm.$nextTick()
    expect(pattern?.getAttribute('width')).toBe('900')
    expect(wrapper.get('[data-testid="type3-upper-net-image"]').attributes('width')).toBe('900')
  })
})
