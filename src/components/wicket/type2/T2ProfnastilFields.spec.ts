import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Fields from './T2ProfnastilFields.vue'

const InputStub = defineComponent({
  props: ['modelValue', 'items', 'b24ui', 'content', 'createItem'],
  emits: ['update:modelValue', 'create'],
  template: `<div><div data-selected><slot name="leading" /></div><div v-for="item in items" :key="item.id" data-option><slot name="item-leading" :item="item" />{{item.label}}</div><button data-change @click="$emit('update:modelValue', 2)">Choose</button><button data-create @click="$emit('create', 'Literal text')">Create</button></div>`,
})
const render = (comboboxValue: number | string = 1) => mount(Fields, {
  props: { showMaterialSelectors: false, profile: null, profileSelectItems: [], selectedMaterialId: undefined, coating: null, coatingSelectItems: [], colorMode: 'combobox', dictionaryColorId: undefined, colorSelectItems: [], comboboxValue, printechSelectItems: [{id:1,label:'Полное длинное название цвета',hex:'#123456'}, {id:2,label:'Без HEX'}], loading: false, loadError: '', submitted: false, colorValid: true },
  global: { stubs: { B24InputMenu: InputStub, InputMenu: InputStub } },
})
describe('profnastil color texture menu presentation', () => {
  it('wraps full labels in a wide viewport-capped popup and shows valid HEX squares', () => {
    const wrapper = render()
    const input = wrapper.getComponent(InputStub)
    expect(input.props('b24ui').content).toContain('32rem')
    expect(input.props('b24ui').content).toContain('100vw')
    expect(input.props('b24ui').itemLabel).toContain('whitespace-normal')
    expect(input.props('content').avoidCollisions).toBe(true)
    expect(wrapper.findAll('[data-option] [data-color-swatch]')).toHaveLength(1)
    expect(wrapper.get('[data-selected] [data-color-swatch]').attributes('style')).toContain('#123456')
    expect(wrapper.get('[data-option]').text()).toBe('Полное длинное название цвета')
  })
  it('omits empty selected swatch space and retains value and creation event contracts', async () => {
    const wrapper = render(2)
    expect(wrapper.getComponent(InputStub).vm.$slots.leading).toBeUndefined()
    expect(wrapper.getComponent(InputStub).props('createItem')).toBe(false)
    wrapper.getComponent(InputStub).vm.$emit('update:modelValue', 2)
    wrapper.getComponent(InputStub).vm.$emit('create', 'Literal text')
    expect(wrapper.emitted('printech-color-change')).toEqual([[2]])
    expect(wrapper.emitted('custom-color-create')).toEqual([['Literal text']])
  })
})
