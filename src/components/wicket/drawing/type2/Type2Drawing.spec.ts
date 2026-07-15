import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const calc = {
  widthProyema: ref('1000'),
  heightProyema: ref('2000'),
  clearanceProyema: ref('50'),
  hasStolby: ref(1),
  stolbName: ref('Труба 50×50×2'),
  openingOptionName: ref('Наружу / Левая'),
  shieldType: ref('Тип_1'),
  heightLowerPart: ref('300'),
  heightTopPart: ref('300'),
  widthSidePart: ref('300'),
  grilleLocation: ref('Возле петель'),
  peremichkaPolozheniyeName: ref('Без перемычки'),
  peremichkaSortamentName: ref(''),
  materialFacadeGlob: ref('Профлист'),
  materialFacade: ref('С-8'),
  colorFacade: ref('RAL 7016'),
  raspolozheniyePolotna: ref('Вертикально'),
}

vi.mock('../../../../composables/useCalculation', () => ({
  useCalculation: () => calc,
}))

import Type2Drawing from './Type2Drawing.vue'

describe('Type2Drawing', () => {
  it('рисует адаптивный SVG по текущим размерам формы', async () => {
    const wrapper = mount(Type2Drawing)
    const svg = wrapper.get('[data-testid="type2-drawing-svg"]')

    expect(svg.attributes('viewBox')).toBe('0 0 1000 2000')
    expect(svg.classes()).toContain('max-h-[650px]')
    expect(wrapper.find('pattern').exists()).toBe(false)

    calc.widthProyema.value = '1200'
    calc.heightProyema.value = '2100'
    await wrapper.vm.$nextTick()

    expect(svg.attributes('viewBox')).toBe('0 0 1200 2100')
  })

  it('скрывает и возвращает только заполнение', async () => {
    const wrapper = mount(Type2Drawing)
    const toggle = wrapper.get('[data-testid="type2-drawing-fill-toggle"]')

    expect(wrapper.find('[data-testid="type2-drawing-fill"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="type2-drawing-frame"]').exists()).toBe(true)

    await toggle.setValue(false)

    expect(wrapper.find('[data-testid="type2-drawing-fill"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="type2-drawing-frame"]').exists()).toBe(true)

    await toggle.setValue(true)

    expect(wrapper.find('[data-testid="type2-drawing-fill"]').exists()).toBe(true)
  })
})
