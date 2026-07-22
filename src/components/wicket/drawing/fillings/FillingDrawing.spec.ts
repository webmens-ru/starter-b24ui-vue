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
      coatingColor: '',
      coatingImage: '',
      reliefImage: '',
      appearanceMode: 'coating',
      idPrefix: 'fill-a',
      ...props,
    })]),
  }))
}

describe('FillingDrawing', () => {
  it('renders the C8 profile with clipped texture and no built-in relief', () => {
    const wrapper = mountDrawing()

    expect(wrapper.get('[data-testid="filling-drawing"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
    expect(wrapper.find('[data-testid="filling-profile-shadow"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filling-relief-texture"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="filling-texture"]').attributes('fill')).toContain('fill-a-texture')
    expect(wrapper.get('[data-testid="filling-c8"]').attributes('clip-path')).toContain('fill-a-clip')
  })

  it('draws material HEX as the base when coating is empty', () => {
    const wrapper = mountDrawing({ color: '#704214', image: '' })

    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  })

  it('draws coating HEX over material color before external relief', () => {
    const wrapper = mountDrawing({
      color: '#704214',
      image: '',
      coatingColor: '#ffffff',
      reliefImage: '/uploads/dict/filling-relief/profnastil-c8.svg',
    })

    expect(wrapper.get('[data-testid="filling-color-coating"]').attributes()).toMatchObject({ fill: '#ffffff', opacity: '0.1' })
    expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="filling-relief-texture"'))
  })

  it('draws external relief image over coating layers and keeps it clipped', () => {
    const wrapper = mountDrawing({
      color: '#704214',
      image: '',
      coatingColor: '#ffffff',
      reliefImage: '/uploads/dict/profnastil-profile-type/2/relief.svg',
    })

    const relief = wrapper.get('[data-testid="filling-relief-texture"]')
    expect(relief.attributes('fill')).toContain('fill-a-relief-texture')
    expect(wrapper.html().indexOf('data-testid="filling-color-coating"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="filling-relief-texture"'))
    expect(wrapper.get('[data-testid="filling-c8"]').attributes('clip-path')).toContain('fill-a-clip')
  })

  it('uses the full C8 light-and-dark relief cycle as the external relief tile width', () => {
    const wrapper = mountDrawing({
      reliefImage: '/uploads/dict/filling-relief/profnastil-c8.svg',
    })

    const reliefPattern = wrapper.get('#fill-a-relief-texture')
    expect(reliefPattern.attributes('width')).toBe('115')
    expect(reliefPattern.get('image').attributes('width')).toBe('115')
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

    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  })

  it('draws log siding without relief when backend did not provide relief image', () => {
    const wrapper = mountDrawing({
      materialGroup: 'Сайдинг',
      materialName: 'Сайдинг «Бревно»',
      area: { ...area, width: 200 },
    })

    expect(wrapper.get('[data-testid="filling-log-siding"]')).toBeTruthy()
    expect(wrapper.find('[data-testid="filling-log-wave"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filling-relief-texture"]').exists()).toBe(false)
  })

  it('keeps texture and clip IDs distinct between instances', () => {
    const Wrapper = defineComponent({
      setup: () => () => h('svg', [
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/a.webp', coatingColor: '', coatingImage: '', reliefImage: '', appearanceMode: 'coating', idPrefix: 'a' }),
        h(FillingDrawing, { area, materialGroup: 'Сайдинг', materialName: 'Сайдинг «Бревно»', direction: 'vertical', color: '#704214', image: '/b.webp', coatingColor: '', coatingImage: '', reliefImage: '', appearanceMode: 'coating', idPrefix: 'b' }),
      ]),
    })
    const wrapper = mount(Wrapper)
    const textureIds = wrapper.findAll('pattern').map((pattern) => pattern.attributes('id'))
    const clipIds = wrapper.findAll('clipPath').map((clip) => clip.attributes('id'))

    expect(textureIds).toEqual(['a-texture', 'b-texture'])
    expect(clipIds).toEqual(['a-clip', 'b-clip'])
  })

  it('renders nothing for an unsupported material', () => {
    const wrapper = mountDrawing({ materialName: 'НС-35' })

    expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(false)
  })
})
