import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const calc = {
  modelId: ref('2'),
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
  colorFacadeHex: ref(''),
  colorFacadeImage: ref(''),
  raspolozheniyePolotna: ref('Вертикально'),
}

vi.mock('../composables/useCalculation', () => ({
  useCalculation: () => calc,
}))

import DrawingPanel from './DrawingPanel.vue'

describe('DrawingPanel accordion', () => {
  it('по умолчанию раскрыт', () => {
    const wrapper = mount(DrawingPanel)
    const toggle = wrapper.get('[data-testid="drawing-panel-toggle"]')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="drawing-panel-content"]').exists()).toBe(true)
  })

  it('сворачивается и повторно раскрывается по клику на заголовок', async () => {
    const wrapper = mount(DrawingPanel)
    const toggle = wrapper.get('[data-testid="drawing-panel-toggle"]')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="drawing-panel-content"]').exists()).toBe(false)

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-testid="drawing-panel-content"]').exists()).toBe(true)
  })

  it('показывает чертёж только для типа 2', async () => {
    const wrapper = mount(DrawingPanel)

    expect(wrapper.find('[data-testid="type2-drawing-svg"]').exists()).toBe(true)

    calc.modelId.value = '1'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="type2-drawing-svg"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawing-panel-content"]').exists()).toBe(true)
  })
})
