import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const c: any = {
  widthProyema: ref('1000'),
  heightProyema: ref('2000'),
  clearanceProyema: ref('50'),
  hasStolby: ref(1),
  stolbName: ref('60/60/2'),
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
  colorFacadeHex: ref('#704214'),
  colorFacadeImage: ref(''),
  coatingFacadeHex: ref(''),
  coatingFacadeImage: ref(''),
  reliefFacadeImage: ref(''),
  colorFacadeReverseHex: ref('#D7D5C6'),
  colorFacadeReverseImage: ref(''),
  materialYardGlob: ref('Профлист'),
  materialYard: ref('С-8'),
  colorYardHex: ref('#123456'),
  colorYardImage: ref(''),
  coatingYardHex: ref(''),
  coatingYardImage: ref(''),
  reliefYardImage: ref(''),
  raspolozheniyePolotna: ref('Вертикально'),
  colorShieldHex: ref(''),
  sideGrilleNetImage: ref(''),
  lowerGrilleNetImage: ref(''),
  upperGrilleNetImage: ref(''),
  fillSide: ref('Одна сторона'),
}

vi.mock('../../../../composables/useCalculation', () => ({ useCalculation: () => c }))

import Type1Drawing from './Type1Drawing.vue'

describe('Type1Drawing', () => {
  it('рисует отдельный адаптивный SVG и заполнение улицы перед рамой', () => {
    const w = mount(Type1Drawing)
    expect(w.get('[data-testid="type1-drawing-svg"]').classes()).toContain('max-h-[650px]')
    expect(w.find('[data-testid="type1-frame"]').exists()).toBe(true)
    expect(w.html().indexOf('data-testid="type1-fill"')).toBeGreaterThan(w.html().indexOf('data-testid="type1-frame"'))
  })

  it('рисует две части позиции 6 и вертикальное усиление', () => {
    const previousWidth = c.widthProyema.value
    const previousOrientation = c.raspolozheniyePolotna.value

    try {
      c.widthProyema.value = '754'
      c.raspolozheniyePolotna.value = 'Горизонтально'
      const wrapper = mount(Type1Drawing)

      expect(wrapper.findAll('[data-testid="type1-lock-pipe"]')).toHaveLength(2)
      expect(wrapper.get('[data-testid="type1-filling-reinforcement"]').attributes()).toMatchObject({
        x: '354',
        y: '80',
        width: '40',
        height: '1790',
      })
    } finally {
      c.widthProyema.value = previousWidth
      c.raspolozheniyePolotna.value = previousOrientation
    }
  })

  it.each(['Тип_2', 'Тип_4'])('рисует фон нижней сетки %s перед PNG с той же геометрией', (subtype) => {
    c.shieldType.value = subtype
    c.lowerGrilleNetImage.value = '/uploads/nets/lower.webp'
    c.sideGrilleNetImage.value = '/uploads/nets/side.webp'
    const w = mount(Type1Drawing)
    const background = w.get('[data-testid="type1-net-background"]')
    const net = w.get('[data-testid="type1-net"]')
    expect(w.html().indexOf('data-testid="type1-net-background"')).toBeLessThan(w.html().indexOf('data-testid="type1-net"'))
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(background.attributes('fill')).toBe('#66686c')
    c.shieldType.value = 'Тип_1'
    c.lowerGrilleNetImage.value = ''
    c.sideGrilleNetImage.value = ''
  })

  it('рисует фон верхней сетки подтипа 3 перед PNG с той же геометрией', () => {
    c.shieldType.value = 'Тип_3'
    c.lowerGrilleNetImage.value = '/uploads/nets/lower.webp'
    c.upperGrilleNetImage.value = '/uploads/nets/upper.webp'
    const w = mount(Type1Drawing)
    const background = w.get('[data-testid="type1-upper-net-background"]')
    const net = w.get('[data-testid="type1-upper-net"]')
    expect(w.html().indexOf('data-testid="type1-upper-net-background"')).toBeLessThan(w.html().indexOf('data-testid="type1-upper-net"'))
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(background.attributes('fill')).toBe('#66686c')
    c.shieldType.value = 'Тип_1'
    c.lowerGrilleNetImage.value = ''
    c.upperGrilleNetImage.value = ''
  })

  it('использует схематичные цвета для сеток и заполнения', async () => {
    c.shieldType.value = 'Тип_3'
    c.lowerGrilleNetImage.value = '/uploads/nets/lower.webp'
    c.upperGrilleNetImage.value = '/uploads/nets/upper.webp'
    const w = mount(Type1Drawing)
    await w.get('input[value="schematic"]').setValue(true)
    expect(w.get('[data-testid="type1-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(w.get('[data-testid="type1-upper-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    c.shieldType.value = 'Тип_1'
    c.lowerGrilleNetImage.value = ''
    c.upperGrilleNetImage.value = ''
  })

  it('рисует внешний рельеф профнастила только из данных бэка', () => {
    c.materialFacade.value = 'Профнастил С-20'
    c.reliefFacadeImage.value = '/uploads/dict/filling-relief/profnastil-c20.svg'
    const w = mount(Type1Drawing)
    expect(w.get('[data-testid="filling-c20"]')).toBeTruthy()
    expect(w.get('[data-testid="filling-relief-texture"]').attributes('fill')).toContain('relief-texture')
    expect(w.find('[data-testid="filling-profile-shadow"]').exists()).toBe(false)
    c.materialFacade.value = 'С-8'
    c.reliefFacadeImage.value = ''
  })

  it('без reliefImage не рисует слой рельефа', () => {
    c.materialFacade.value = 'С-8'
    c.reliefFacadeImage.value = ''
    const w = mount(Type1Drawing)
    expect(w.find('[data-testid="filling-relief-texture"]').exists()).toBe(false)
    expect(w.find('[data-testid="filling-profile-shadow"]').exists()).toBe(false)
  })

  it('сохраняет текстуру и уникальные SVG ID между экземплярами', () => {
    c.colorFacadeImage.value = '/uploads/colors/wood.webp'
    const first = mount(Type1Drawing)
    const second = mount(Type1Drawing)
    expect(first.get('[data-testid="filling-texture"]').attributes('fill')).toContain('-street-texture')
    const firstIds = first.findAll('pattern').map(node => node.attributes('id')).filter(Boolean)
    const secondIds = second.findAll('pattern').map(node => node.attributes('id')).filter(Boolean)
    expect(firstIds.some(id => secondIds.includes(id))).toBe(false)
    c.colorFacadeImage.value = ''
  })

  it('со двора показывает обратный цвет одностороннего профлиста позади рамы', async () => {
    const w = mount(Type1Drawing)
    await w.get('[data-testid="type1-view-yard"]').setValue(true)
    expect(w.findAll('[data-testid="type1-fill"] rect').some(rect => rect.attributes('fill') === '#D7D5C6')).toBe(true)
    expect(w.html().indexOf('data-testid="type1-fill"')).toBeLessThan(w.html().indexOf('data-testid="type1-frame"'))
  })

  it('со двора показывает лицевую сторону yard-материала на переднем плане', async () => {
    c.fillSide.value = 'Две стороны'
    c.materialFacade.value = 'С-8'
    c.materialYard.value = 'Профнастил МП-10'
    const w = mount(Type1Drawing)
    await w.get('[data-testid="type1-view-yard"]').setValue(true)
    expect(w.get('[data-testid="filling-mp10"]')).toBeTruthy()
    expect(w.findAll('[data-testid="type1-fill"] rect').some(rect => rect.attributes('fill') === '#123456')).toBe(true)
    expect(w.html().indexOf('data-testid="type1-fill"')).toBeGreaterThan(w.html().indexOf('data-testid="type1-frame"'))
    c.fillSide.value = 'Одна сторона'
    c.materialYard.value = 'С-8'
  })
})
