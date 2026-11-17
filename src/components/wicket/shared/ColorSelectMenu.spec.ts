import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ColorSelectMenu from './ColorSelectMenu.vue'

const SelectStub = defineComponent({
  props: ['modelValue', 'items', 'b24ui', 'content'],
  emits: ['update:modelValue'],
  template: `<div><div data-selected><slot name="leading" /></div><div v-for="item in items" :key="item.id" data-option><slot name="item-leading" :item="item" /><span>{{item.label}}</span></div><button @click="$emit('update:modelValue', 2)">Choose</button></div>`,
})
const items = [{ id: 1, label: 'Полное длинное название цвета с описанием', hex: '#12abEF' }, { id: 2, label: 'Без HEX' }, { id: 3, label: 'Недопустимый HEX', hex: 'url(example)' }]
const render = (modelValue: string | number | undefined = 1) => mount(ColorSelectMenu, { props: { modelValue, items }, attrs: { 'data-testid': 'existing-color' }, global: { stubs: { B24SelectMenu: SelectStub, SelectMenu: SelectStub } } })
describe('single dictionary color menu', () => {
  it('shows valid color squares in options and selection without shortening labels', () => {
    const wrapper = render()
    expect(wrapper.get('[data-selected] [data-color-swatch]').attributes('style')).toContain('background-color: #12abEF')
    expect(wrapper.findAll('[data-option] [data-color-swatch]')).toHaveLength(1)
    expect(wrapper.get('[data-option]').text()).toBe(items[0]!.label)
    expect(wrapper.attributes('data-testid')).toBe('existing-color')
  })
  it('does not reserve a selected swatch when HEX is missing and forwards selected IDs unchanged', async () => {
    const wrapper = render(2)
    expect(wrapper.find('[data-selected] [data-color-swatch]').exists()).toBe(false)
    expect(wrapper.getComponent(SelectStub).vm.$slots.leading).toBeUndefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  })
  it('reserves text spacing when the saved color HEX arrives asynchronously', async () => {
    const wrapper = render()
    await wrapper.setProps({ items: [] })
    expect(wrapper.getComponent(SelectStub).props('b24ui').base).toBeUndefined()
    await wrapper.setProps({ items })
    expect(wrapper.getComponent(SelectStub).props('b24ui').base).toBe('ps-10')
    const swatch = wrapper.get('[data-selected] [data-color-swatch]')
    expect(swatch.attributes('style')).toContain('border-radius: 50%')
    expect(swatch.attributes('style')).toContain('width: 14px')
    expect(swatch.attributes('style')).toContain('height: 14px')
  })
  it('gives the popup room for names while wrapping them within the viewport', () => {
    const ui = render().findComponent(SelectStub).props('b24ui')
    expect(ui.content).toContain('32rem')
    expect(ui.content).toContain('100vw')
    expect(ui.itemLabel).toContain('whitespace-normal')
    expect(ui.itemLabel).toContain('break-words')
  })
})
