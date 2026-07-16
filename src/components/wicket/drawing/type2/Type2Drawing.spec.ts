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
  colorFacadeHex: ref('#704214'),
  colorFacadeImage: ref(''),
  colorShieldHex: ref(''),
  sideGrilleNetImage: ref(''),
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

  it('обновляет ширину столбов при смене профиля', async () => {
    calc.stolbName.value = '60/60/2'
    const wrapper = mount(Type2Drawing)
    const posts = wrapper.get('[data-testid="type2-drawing-posts"]')

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['60', '60'])

    calc.stolbName.value = '80/80/3'
    await wrapper.vm.$nextTick()

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['80', '80'])

    calc.stolbName.value = '50/100/3'
    await wrapper.vm.$nextTick()

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['100', '100'])

    calc.stolbName.value = 'Труба 50×50×2'
  })

  it('вставляет картинку выбранной сетки только в боковую область подтипа 4', async () => {
    calc.shieldType.value = 'Тип_4'
    calc.widthSidePart.value = '300'
    calc.sideGrilleNetImage.value = 'https://backend.test/uploads/net.jpg'
    const wrapper = mount(Type2Drawing)
    const net = wrapper.get('[data-testid="type2-drawing-net"]')
    const netImage = wrapper.get('[data-testid="type2-drawing-net-image"]')
    const netPattern = netImage.element.parentElement

    expect(netImage.attributes('href')).toBe('https://backend.test/uploads/net.jpg')
    expect(Number(net.attributes('width'))).toBeGreaterThan(0)
    expect(Number(net.attributes('height'))).toBeGreaterThan(0)
    expect(netImage.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(netImage.attributes('transform')).toContain('rotate(90)')
    expect(netPattern?.getAttribute('patternUnits')).toBe('userSpaceOnUse')
    expect(Number(netPattern?.getAttribute('height'))).toBeGreaterThan(0)
    expect(net.attributes('fill')).toMatch(/^url\(#type2-net-pattern-\d+\)$/)

    calc.shieldType.value = 'Тип_1'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="type2-drawing-net"]').exists()).toBe(false)

    calc.sideGrilleNetImage.value = ''
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

  it('переносит петли за раму при открывании внутрь', async () => {
    const wrapper = mount(Type2Drawing)

    expect(wrapper.html().indexOf('data-testid="type2-drawing-hinges"'))
      .toBeGreaterThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    calc.openingOptionName.value = 'Внутрь / Левая'
    await wrapper.vm.$nextTick()

    expect(wrapper.html().indexOf('data-testid="type2-drawing-hinges"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    calc.openingOptionName.value = 'Наружу / Левая'
  })

  it('зеркалит чертёж и меняет план петель при переключении на вид со двора', async () => {
    calc.openingOptionName.value = 'Внутрь / Левая'
    const wrapper = mount(Type2Drawing)
    const drawingView = wrapper.get('[data-testid="type2-drawing-view"]')

    expect(drawingView.attributes('transform')).toBeUndefined()
    expect(wrapper.html().indexOf('data-testid="type2-drawing-hinges"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)

    expect(drawingView.attributes('transform')).toBe(`translate(${calc.widthProyema.value} 0) scale(-1 1)`)
    expect(wrapper.html().indexOf('data-testid="type2-drawing-hinges"'))
      .toBeGreaterThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    calc.openingOptionName.value = 'Наружу / Левая'
  })

  it('переносит профлист и притворную полосу за каркас при виде со двора', async () => {
    const wrapper = mount(Type2Drawing)

    expect(wrapper.html().indexOf('data-testid="type2-drawing-fill"'))
      .toBeGreaterThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))
    expect(wrapper.html().indexOf('data-testid="type2-drawing-strip"'))
      .toBeGreaterThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)

    expect(wrapper.html().indexOf('data-testid="type2-drawing-fill"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))
    expect(wrapper.html().indexOf('data-testid="type2-drawing-strip"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))
  })

  it('накладывает плиточную текстуру только на область заполнения', async () => {
    calc.colorFacadeImage.value = '/uploads/colors/wood.webp'
    const wrapper = mount(Type2Drawing)
    const fillGroup = wrapper.get('[data-testid="type2-drawing-fill"]')
    const pattern = wrapper.get('pattern')
    const patternId = pattern.attributes('id')

    expect(wrapper.findAll('pattern')).toHaveLength(1)
    expect(pattern.attributes('patternUnits')).toBe('userSpaceOnUse')
    expect(pattern.get('image').attributes('href')).toBe('/uploads/colors/wood.webp')
    expect(pattern.get('image').attributes('preserveAspectRatio')).toBe('xMidYMid slice')
    expect(fillGroup.findAll(`rect[fill="url(#${patternId})"]`)).toHaveLength(1)
    expect(fillGroup.findAll('rect')[0]?.attributes('fill')).toBe('#704214')
    expect(wrapper.findAll(`rect[fill="url(#${patternId})"]`)).toHaveLength(1)

    await wrapper.get('[data-testid="type2-drawing-fill-toggle"]').setValue(false)
    expect(wrapper.find('[data-testid="type2-drawing-fill"]').exists()).toBe(false)

    calc.colorFacadeImage.value = ''
  })

  it('создаёт уникальный pattern id для каждого экземпляра', () => {
    calc.colorFacadeImage.value = '/uploads/colors/wood.webp'
    const first = mount(Type2Drawing)
    const second = mount(Type2Drawing)

    expect(first.get('pattern').attributes('id')).not.toBe(second.get('pattern').attributes('id'))

    calc.colorFacadeImage.value = ''
  })

  it('переключает реалистичную палитру на контрастную схематичную', async () => {
    calc.colorFacadeImage.value = '/uploads/colors/wood.webp'
    calc.colorShieldHex.value = '#332211'
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="type2-drawing-frame"]').attributes('fill')).toBe('#332211')
    expect(wrapper.get('[data-testid="type2-drawing-fill"] rect').attributes('fill')).toBe('#704214')
    expect(wrapper.find('pattern').exists()).toBe(true)

    await wrapper.get('[data-testid="type2-drawing-color-schematic"]').setValue(true)

    expect(wrapper.get('[data-testid="type2-drawing-frame"]').attributes('fill')).toBe('#d1d5db')
    expect(wrapper.get('[data-testid="type2-drawing-fill"] rect').attributes('fill')).toBe('#bfdbfe')
    expect(wrapper.find('pattern').exists()).toBe(false)

    calc.colorFacadeImage.value = ''
    calc.colorShieldHex.value = ''
  })
})
