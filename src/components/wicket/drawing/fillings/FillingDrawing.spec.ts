import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import FillingDrawing from './FillingDrawing.vue'

const area = { x: 10, y: 20, width: 140, height: 300 }

function mountDrawing(props: Partial<InstanceType<typeof FillingDrawing>['$props']> = {}) {
  return mount(defineComponent({
    setup: () => () => h('svg', [h(FillingDrawing, {
      area,
      materialGroup: 'Профлист',
      materialName: 'С-8',
      direction: 'vertical',
      color: '#704214',
      image: '/uploads/colors/wood.webp',
      appearanceMode: 'coating',
      idPrefix: 'fill-a',
      ...props,
    })]),
  }))
}

describe('FillingDrawing', () => {
  it('renders the C8 profile with clipped texture and shadows', () => {
    const wrapper = mountDrawing()

    expect(wrapper.get('[data-testid="filling-drawing"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
    expect(wrapper.findAll('[data-testid="filling-profile-shadow"]')[0].attributes('width')).toBe('5')
    expect(wrapper.get('[data-testid="filling-texture"]').attributes('fill')).toContain('fill-a-texture')
    expect(wrapper.get('[data-testid="filling-c8"]').attributes('clip-path')).toContain('fill-a-clip')
  })

  it('draws a neutral base and a 10% HEX coating before profile relief', () => {
    const wrapper = mountDrawing({ color: '#704214', image: '' })

    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#f6f6f6')
    expect(wrapper.get('[data-testid="filling-color-coating"]').attributes()).toMatchObject({
      fill: '#704214',
      opacity: '0.1',
    })
    expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="filling-profile-shadow"'))
  })

  it('draws an opaque texture without a base or HEX layer', () => {
    const wrapper = mountDrawing({ color: '#704214', image: '/wood.webp' })

    expect(wrapper.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="filling-texture"]').attributes('opacity')).toBeUndefined()
  })

  it('draws no appearance layers without HEX or texture', () => {
    const wrapper = mountDrawing({ color: '', image: '' })

    expect(wrapper.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filling-texture"]').exists()).toBe(false)
  })

  it('draws schematic color directly in solid mode', () => {
    const wrapper = mountDrawing({ color: '#bfdbfe', image: '', appearanceMode: 'solid' })

    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  })

  it('draws siding coating before its relief', () => {
    const wrapper = mountDrawing({
      materialGroup: 'Сайдинг',
      materialName: 'Сайдинг «Бревно»',
      color: '#704214',
      image: '',
    })

    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#f6f6f6')
    expect(wrapper.get('[data-testid="filling-color-coating"]').attributes('opacity')).toBe('0.1')
    expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="filling-log-waves"'))
  })

  it.each([
    { name: 'С-8', firstShadow: 5, shadowStep: 57.5 },
    { name: 'С-20', firstShadow: 17.5, shadowStep: 52.5 },
    { name: 'МП-10', firstShadow: 15, shadowStep: 50 },
    { name: 'МП-20', firstShadow: 17.5, shadowStep: 52.5 },
  ])('preserves $name vertical profile dimensions', ({ name, firstShadow, shadowStep }) => {
    const wrapper = mountDrawing({ materialName: name })
    const shadows = wrapper.findAll('[data-testid="filling-profile-shadow"]')

    expect(Number(shadows[0].attributes('width'))).toBe(firstShadow)
    expect(Number(shadows[1].attributes('x')) - Number(shadows[0].attributes('x'))).toBe(shadowStep)
  })

  it.each([
    { name: 'С-8', firstShadow: 5, shadowStep: 57.5 },
    { name: 'С-20', firstShadow: 17.5, shadowStep: 52.5 },
    { name: 'МП-10', firstShadow: 15, shadowStep: 50 },
    { name: 'МП-20', firstShadow: 17.5, shadowStep: 52.5 },
  ])('uses $name profile dimensions along the horizontal axis', ({ name, firstShadow, shadowStep }) => {
    const wrapper = mountDrawing({ materialName: name, direction: 'horizontal' })
    const shadows = wrapper.findAll('[data-testid="filling-profile-shadow"]')

    expect(Number(shadows[0].attributes('height'))).toBe(firstShadow)
    expect(Number(shadows[1].attributes('y')) - Number(shadows[0].attributes('y'))).toBe(shadowStep)
  })

  it('clips natural-size log siding waves instead of squeezing the last wave', () => {
    const wrapper = mountDrawing({
      materialGroup: 'Сайдинг',
      materialName: 'Сайдинг «Бревно»',
      area: { ...area, width: 200 },
    })
    const waves = wrapper.findAll('[data-testid="filling-log-wave"]')
    const wavesGroup = wrapper.get('[data-testid="filling-log-waves"]')

    expect(waves.every((wave) => wave.attributes('width') === '175')).toBe(true)
    expect(Number(waves[1].attributes('x')) - Number(waves[0].attributes('x'))).toBe(175)
    expect(wavesGroup.attributes('clip-path')).toContain('fill-a-clip')
  })

  it('keeps texture, gradient and clip IDs distinct between instances', () => {
    const Wrapper = defineComponent({
      setup: () => () => h('svg', [
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/a.webp', appearanceMode: 'coating', idPrefix: 'a' }),
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/b.webp', appearanceMode: 'coating', idPrefix: 'b' }),
      ]),
    })
    const wrapper = mount(Wrapper)
    const textureIds = wrapper.findAll('pattern').map((pattern) => pattern.attributes('id'))
    const gradientIds = wrapper.findAll('linearGradient').map((gradient) => gradient.attributes('id'))
    const clipIds = wrapper.findAll('clipPath').map((clip) => clip.attributes('id'))

    expect(textureIds).toEqual(['a-texture', 'b-texture'])
    expect(gradientIds).toEqual(['a-log-gradient', 'b-log-gradient'])
    expect(clipIds).toEqual(['a-clip', 'b-clip'])
  })

  it('renders nothing for an unsupported material', () => {
    const wrapper = mountDrawing({ materialName: 'НС-35' })

    expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(false)
  })
})
