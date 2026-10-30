import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageViewer from './ImageViewer.vue'

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('explicit image enlargement', () => {
  it('opens the current image in a modal dialog without selecting the card and closes it', async () => {
    const select = vi.fn()
    const wrapper = mount(ImageViewer, { attachTo: document.body, props: { images: ['/one.jpg', '/two.jpg'], title: 'Ручка', enlarge: true }, attrs: { onClick: select } })
    const dialog = document.querySelector('dialog')!
    const open = vi.spyOn(dialog, 'showModal')
    const close = vi.spyOn(dialog, 'close')
    await wrapper.get('[aria-label="Следующее"]').trigger('click')
    await wrapper.get('.viewer-enlarge').trigger('click')
    expect(select).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledOnce()
    expect(dialog.querySelector('img')!.getAttribute('src')).toBe('/two.jpg')
    expect(dialog.querySelector('img')!.getAttribute('alt')).toBe('Ручка')
    ;(dialog.querySelector('[aria-label="Закрыть просмотр"]') as HTMLButtonElement).click()
    expect(close).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
  it('leaves enlargement disabled for existing consumers', () => {
    const wrapper = mount(ImageViewer, { props: { images: ['/one.jpg'] } })
    expect(wrapper.find('.viewer-enlarge').exists()).toBe(false)
    expect(document.querySelector('dialog')).toBeNull()
    wrapper.unmount()
  })
})
