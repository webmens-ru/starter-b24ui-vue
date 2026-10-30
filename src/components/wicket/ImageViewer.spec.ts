import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ImageViewer from './ImageViewer.vue'

describe('explicit image enlargement', () => {
  it('opens the current image without selecting the surrounding card', async () => {
    const select = vi.fn()
    const wrapper = mount(ImageViewer, { props: { images: ['/one.jpg', '/two.jpg'], title: 'Ручка', enlarge: true }, attrs: { onClick: select }, global: { stubs: { Modal: { props: ['open', 'b24ui'], template: '<div v-if="open" role="dialog" :class="b24ui?.content" :data-overlay-class="b24ui?.overlay"><slot name="body" /></div>' } } } })
    await wrapper.get('[aria-label="Следующее"]').trigger('click')
    expect(select).not.toHaveBeenCalled()
    await wrapper.get('.viewer-enlarge').trigger('click')
    expect(select).not.toHaveBeenCalled()
    expect(wrapper.get('[role="dialog"] img').attributes('src')).toBe('/two.jpg')
    expect(wrapper.get('[role="dialog"] img').attributes('alt')).toBe('Ручка')
    expect(wrapper.get('[role="dialog"]').classes()).toContain('z-[2001]')
    expect(wrapper.get('[role="dialog"]').attributes('data-overlay-class')).toBe('z-[2000]')
  })
  it('leaves enlargement disabled for existing consumers', () => {
    const wrapper = mount(ImageViewer, { props: { images: ['/one.jpg'] } })
    expect(wrapper.find('.viewer-enlarge').exists()).toBe(false)
  })
})
