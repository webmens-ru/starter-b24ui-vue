import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MaterialFillingDrawing from './MaterialFillingDrawing.vue'

describe('material appearance without a drawing profile', () => {
  it('rotates a 1 by working-width strip inside a transverse repeat for either material direction', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, blob: async () => new Blob(['<svg width="1" height="295" viewBox="0 0 1 295"/>'], { type: 'image/svg+xml' }) }))
    const wrapper = mount(MaterialFillingDrawing, { props: {
      area: { x: 10, y: 20, width: 700, height: 1500 }, direction: 'vertical', color: '#123456', image: '',
      coatingColor: '', coatingImage: '', reliefImage: '/uploads/strip.svg', appearanceMode: 'coating', idPrefix: 'strip',
    } })
    await flushPromises()
    const pattern = () => wrapper.get('[data-testid="relief-pattern"]')
    expect(pattern().attributes()).toMatchObject({ width: '295', height: '1500' })
    expect(pattern().get('image').attributes()).toMatchObject({ width: '1500', height: '295', transform: 'translate(0 1500) rotate(-90)' })
    await wrapper.setProps({ direction: 'horizontal' })
    expect(pattern().attributes()).toMatchObject({ width: '295', height: '700', patterntransform: 'translate(710 20) rotate(90)' })
    expect(pattern().get('image').attributes()).toMatchObject({ width: '700', height: '295', transform: 'translate(0 700) rotate(-90)' })
    wrapper.unmount()
    vi.unstubAllGlobals()
  })
  it('renders base immediately while optional relief metadata loads', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', () => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(MaterialFillingDrawing, { props: {
      area: { x: 10, y: 20, width: 700, height: 1500 }, direction: 'vertical', color: '#123456', image: '',
      coatingColor: '', coatingImage: '', reliefImage: '/uploads/relief.svg', appearanceMode: 'coating', idPrefix: 'material',
    } })
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#123456')
    expect(wrapper.find('[data-testid="filling-relief-texture"]').exists()).toBe(false)
    finish({ ok: true, blob: async () => new Blob(['<svg viewBox="0 0 80 200"/>'], { type: 'image/svg+xml' }) } as Response)
    await flushPromises()
    expect(wrapper.get('[data-testid="relief-pattern"]').attributes()).toMatchObject({ width: '80', height: '1500' })
    await wrapper.setProps({ direction: 'horizontal' })
    expect(wrapper.get('[data-testid="relief-pattern"]').attributes()).toMatchObject({ width: '80', height: '700' })
    await wrapper.setProps({ reliefImage: '' })
    expect(wrapper.find('[data-testid="filling-relief-texture"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#123456')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })
})
