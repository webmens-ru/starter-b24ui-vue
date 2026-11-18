import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Fields from './T2ProfnastilFields.vue'

const SelectStub = defineComponent({
  props: ['modelValue', 'items', 'b24ui', 'content', 'disabled'],
  emits: ['update:modelValue'],
  template: `<div><div data-selected><slot name="leading" /></div><div v-for="item in items" :key="item.id" data-option><slot name="item-leading" :item="item" />{{item.label}}</div><button data-change @click="$emit('update:modelValue', 2)">Choose</button></div>`,
})
const render = (colorId: number = 1) => mount(Fields, {
  props: { showMaterialSelectors: false, profile: null, profileSelectItems: [], selectedMaterialId: undefined, coating: null, coatingSelectItems: [], dictionaryColorId: colorId, colorSelectItems: [{id:1,label:'Полное длинное название цвета',hex:'#123456'}, {id:2,label:'Без HEX'}], loading: false, loadError: '', submitted: false, colorValid: true },
  global: { stubs: { B24SelectMenu: SelectStub, SelectMenu: SelectStub } },
})
describe('profnastil palette menu presentation', () => {
  it('wraps full labels in a wide viewport-capped popup and shows valid HEX swatches', () => {
    const wrapper = render()
    const input = wrapper.getComponent(SelectStub)
    expect(input.props('b24ui').content).toContain('32rem')
    expect(input.props('b24ui').content).toContain('100vw')
    expect(input.props('b24ui').itemLabel).toContain('whitespace-normal')
    expect(wrapper.findAll('[data-option] [data-color-swatch]')).toHaveLength(1)
    expect(wrapper.get('[data-selected] [data-color-swatch]').attributes('style')).toContain('#123456')
    expect(wrapper.get('[data-option]').text()).toBe('Полное длинное название цвета')
  })
  it('omits empty selected swatch space and emits the selected palette ID', async () => {
    const wrapper = render(2)
    expect(wrapper.getComponent(SelectStub).vm.$slots.leading).toBeUndefined()
    expect(wrapper.getComponent(SelectStub).props('disabled')).toBe(false)
    wrapper.getComponent(SelectStub).vm.$emit('update:modelValue', 2)
    expect(wrapper.emitted('dictionary-color-change')).toEqual([[2]])
    expect(wrapper.emitted('custom-color-create')).toBeUndefined()
  })
})
