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
      idPrefix: 'fill-a',
      ...props,
    })]),
  }))
}

describe('FillingDrawing', () => {
  it('renders the C8 profile with clipped surface, texture and shadows', () => {
    const wrapper = mountDrawing()

    expect(wrapper.get('[data-testid="filling-drawing"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
    expect(wrapper.findAll('[data-testid="filling-profile-shadow"]')[0].attributes('width')).toBe('5')
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')
    expect(wrapper.get('[data-testid="filling-texture"]').attributes('fill')).toContain('fill-a-texture')
    expect(wrapper.get('[data-testid="filling-c8"]').attributes('clip-path')).toContain('fill-a-clip')
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
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/a.webp', idPrefix: 'a' }),
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/b.webp', idPrefix: 'b' }),
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
