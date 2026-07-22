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
  coatingFacadeHex: ref(''),
  coatingFacadeImage: ref(''),
  colorFacadeReverseHex: ref('#D7D5C6'),
  colorFacadeReverseImage: ref(''),
  fillSide: ref('Одна сторона'),
  colorShieldHex: ref(''),
  sideGrilleNetImage: ref(''),
  lowerGrilleNetImage: ref(''),
  upperGrilleNetImage: ref(''),
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

  it.each(['Тип_2', 'Тип_3'])('замощает нижнюю сетку слева направо для %s', (shieldType) => {
    calc.shieldType.value = shieldType
    calc.heightLowerPart.value = '300'
    calc.lowerGrilleNetImage.value = 'https://backend.test/uploads/lower-net.jpg'
    const wrapper = mount(Type2Drawing)
    const net = wrapper.get('[data-testid="type2-drawing-net"]')
    const netImage = wrapper.get('[data-testid="type2-drawing-net-image"]')
    const pattern = netImage.element.parentElement

    expect(netImage.attributes('href')).toBe('https://backend.test/uploads/lower-net.jpg')
    expect(netImage.attributes('transform')).toBeUndefined()
    expect(netImage.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(pattern?.getAttribute('width')).toBe(netImage.attributes('width'))
    expect(pattern?.getAttribute('height')).toBe(net.attributes('height'))
    expect(net.attributes('fill')).toMatch(/^url\(#type2-lower-net-pattern-\d+\)$/)

    calc.shieldType.value = 'Тип_1'
    calc.lowerGrilleNetImage.value = ''
  })

  it('замощает верхнюю сетку слева направо только для подтипа 3', async () => {
    calc.shieldType.value = 'Тип_3'
    calc.heightTopPart.value = '300'
    calc.upperGrilleNetImage.value = 'https://backend.test/uploads/upper-net.jpg'
    const wrapper = mount(Type2Drawing)
    const net = wrapper.get('[data-testid="type2-drawing-upper-net"]')
    const netImage = wrapper.get('[data-testid="type2-drawing-upper-net-image"]')
    const pattern = netImage.element.parentElement

    expect(netImage.attributes('href')).toBe('https://backend.test/uploads/upper-net.jpg')
    expect(netImage.attributes('transform')).toBeUndefined()
    expect(pattern?.getAttribute('width')).toBe(netImage.attributes('width'))
    expect(pattern?.getAttribute('height')).toBe(net.attributes('height'))
    expect(net.attributes('fill')).toMatch(/^url\(#type2-upper-net-pattern-\d+\)$/)

    calc.shieldType.value = 'Тип_2'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="type2-drawing-upper-net"]').exists()).toBe(false)

    calc.shieldType.value = 'Тип_1'
    calc.upperGrilleNetImage.value = ''
  })

  it.each(['Тип_2', 'Тип_4'])('рисует фон сетки %s перед PNG с той же геометрией', (shieldType) => {
    calc.shieldType.value = shieldType
    calc.lowerGrilleNetImage.value = 'https://backend.test/uploads/lower-net.jpg'
    calc.sideGrilleNetImage.value = 'https://backend.test/uploads/side-net.jpg'
    const wrapper = mount(Type2Drawing)
    const background = wrapper.get('[data-testid="type2-drawing-net-background"]')
    const net = wrapper.get('[data-testid="type2-drawing-net"]')

    expect(wrapper.html().indexOf('data-testid="type2-drawing-net-background"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-net"'))
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(background.attributes('fill')).toBe('#66686c')

    calc.shieldType.value = 'Тип_1'
    calc.lowerGrilleNetImage.value = ''
    calc.sideGrilleNetImage.value = ''
  })

  it('рисует фон верхней сетки перед PNG с той же геометрией', () => {
    calc.shieldType.value = 'Тип_3'
    calc.lowerGrilleNetImage.value = 'https://backend.test/uploads/lower-net.jpg'
    calc.upperGrilleNetImage.value = 'https://backend.test/uploads/upper-net.jpg'
    const wrapper = mount(Type2Drawing)
    const background = wrapper.get('[data-testid="type2-drawing-upper-net-background"]')
    const net = wrapper.get('[data-testid="type2-drawing-upper-net"]')

    expect(wrapper.html().indexOf('data-testid="type2-drawing-upper-net-background"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-upper-net"'))
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(background.attributes('fill')).toBe('#66686c')

    calc.shieldType.value = 'Тип_1'
    calc.lowerGrilleNetImage.value = ''
    calc.upperGrilleNetImage.value = ''
  })

  it('использует схематичный цвет для фонов сеток', async () => {
    calc.shieldType.value = 'Тип_3'
    calc.lowerGrilleNetImage.value = 'https://backend.test/uploads/lower-net.jpg'
    calc.upperGrilleNetImage.value = 'https://backend.test/uploads/upper-net.jpg'
    const wrapper = mount(Type2Drawing)

    await wrapper.get('input[value="schematic"]').setValue(true)

    expect(wrapper.get('[data-testid="type2-drawing-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(wrapper.get('[data-testid="type2-drawing-upper-net-background"]').attributes('fill')).toBe('#d1d5db')

    calc.shieldType.value = 'Тип_4'
    calc.sideGrilleNetImage.value = 'https://backend.test/uploads/side-net.jpg'
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="type2-drawing-net-background"]').attributes('fill')).toBe('#d1d5db')

    calc.shieldType.value = 'Тип_1'
    calc.lowerGrilleNetImage.value = ''
    calc.upperGrilleNetImage.value = ''
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

  it('рисует покрытие второго типа через общий renderer заполнения', () => {
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = ''
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
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
    expect(fillGroup.get('[data-testid="filling-texture"]').attributes('fill')).toBe(`url(#${patternId})`)
    expect(fillGroup.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(fillGroup.find('[data-testid="filling-color-coating"]').exists()).toBe(false)

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
    expect(wrapper.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(wrapper.find('pattern').exists()).toBe(true)

    await wrapper.get('[data-testid="type2-drawing-color-schematic"]').setValue(true)

    expect(wrapper.get('[data-testid="type2-drawing-frame"]').attributes('fill')).toBe('#d1d5db')
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    expect(wrapper.find('pattern').exists()).toBe(false)

    calc.colorFacadeImage.value = ''
    calc.colorShieldHex.value = ''
  })

  it('со двора показывает обратную сторону одностороннего профлиста', async () => {
    calc.colorFacadeImage.value = '/uploads/colors/front.webp'
    calc.colorFacadeReverseHex.value = '#D7D5C6'
    calc.colorFacadeReverseImage.value = '/uploads/colors/reverse.webp'
    calc.fillSide.value = 'Одна сторона'
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/front.webp')

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)

    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/reverse.webp')

    calc.fillSide.value = 'Две стороны'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/front.webp')

    calc.colorFacadeImage.value = ''
    calc.colorFacadeReverseImage.value = ''
    calc.fillSide.value = 'Одна сторона'
  })
})
