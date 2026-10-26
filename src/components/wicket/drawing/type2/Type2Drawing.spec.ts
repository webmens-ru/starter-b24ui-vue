import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { FillingDrawingProfile, FillingDrawingProfileProblem } from '../../../../app/api/fillingDrawingProfiles'
import { afterEach, describe, expect, it, vi } from 'vitest'

const calc = {
  widthProyema: ref('1000'),
  heightProyema: ref('2000'),
  clearanceProyema: ref('50'),
  hasStolby: ref<0 | 1 | null>(1),
  jumperPlacement: ref<'none' | 'above' | 'behind' | null>('none'),
  jumperPlacementProblem: ref(null),
  postsPresenceProblem: ref(null),
  postProfile: ref<{sizeA:number;sizeB:number}|null>({ sizeA: 50, sizeB: 50 }),
  postProfileProblem: ref(null),
  jumperProfile: ref<{sizeA:number;sizeB:number}|null>(null),
  jumperProfileProblem: ref(null),
  stolbName: ref('Труба 50×50×2'),
  openingOptionName: ref('Наружу / Левая'),
  openingOrientation: ref<{ opensOutward: boolean; hingeSide: 'left' | 'right' } | null>({ opensOutward: true, hingeSide: 'left' }),
  shieldType: ref('noNet'),
  heightLowerPart: ref('300'),
  heightTopPart: ref('300'),
  widthSidePart: ref('300'),
  grilleLocation: ref('hinge'),
  peremichkaPolozheniyeName: ref('Без перемычки'),
  peremichkaSortamentName: ref(''),
  materialFacadeGlob: ref('Профлист'),
  materialFacade: ref('С-8'),
  idFacade: ref<string | number>(725),
  idYard: ref<string | number>(819),
  fillingProfileFacade: ref<FillingDrawingProfile | null>({ kind: 'c8' }),
  fillingProfileFacadeProblem: ref<FillingDrawingProfileProblem | null>(null),
  fillingProfileYard: ref<FillingDrawingProfile | null>({ kind: 'c8' }),
  fillingProfileYardProblem: ref<FillingDrawingProfileProblem | null>(null),
  materialYardGlob: ref<string | null>(null),
  materialYard: ref(''),
  colorFacade: ref('RAL 7016'),
  colorFacadeHex: ref('#704214'),
  colorFacadeImage: ref(''),
  coatingFacadeHex: ref(''),
  coatingFacadeImage: ref(''),
  colorFacadeReverseHex: ref('#D7D5C6'),
  colorFacadeReverseImage: ref(''),
  colorYard: ref(''),
  colorYardHex: ref(''),
  colorYardImage: ref(''),
  coatingYardHex: ref(''),
  coatingYardImage: ref(''),
  reliefYardImage: ref(''),
  fillSide: ref(1),
  colorShieldHex: ref(''),
  sideGrilleNetImage: ref(''),
  lowerGrilleNetImage: ref(''),
  upperGrilleNetImage: ref(''),
  raspolozheniyePolotna: ref('vertical'),
}

vi.mock('../../../../composables/useCalculation', () => ({
  useCalculation: () => calc,
}))

import Type2Drawing from './Type2Drawing.vue'

describe('Type2Drawing', () => {
  it('requires a configured profile only for a selected visible material and recovers on an explicit choice', async () => {
    const before = calc.fillingProfileFacade.value
    calc.fillingProfileFacade.value = null
    const wrapper = mount(Type2Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      calc.fillingProfileFacade.value = { kind: 'c20' }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="filling-c20"]').exists()).toBe(true)
    } finally { wrapper.unmount(); calc.fillingProfileFacade.value = before }
  })

  it('does not infer shape from renamed captions or require an unused yard profile', async () => {
    const name = calc.materialFacade.value, yardProfile = calc.fillingProfileYard.value
    calc.fillingProfileYard.value = null
    const wrapper = mount(Type2Drawing)
    try {
      const svg = wrapper.get('svg').html()
      calc.materialFacade.value = 'Сайдинг Бревно МП-20'
      await wrapper.vm.$nextTick()
      expect(wrapper.get('svg').html()).toBe(svg)
      calc.fillSide.value = 2
      await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    } finally {
      wrapper.unmount(); calc.materialFacade.value = name
      calc.fillingProfileYard.value = yardProfile; calc.fillSide.value = 1
    }
  })

  it('draws a frame without filling for no selected material and allows hiding an unconfigured filling', async () => {
    const id = calc.idFacade.value, profile = calc.fillingProfileFacade.value
    calc.idFacade.value = ''
    calc.fillingProfileFacade.value = null
    const wrapper = mount(Type2Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(false)
      const toggle = wrapper.findAll('input[type="checkbox"]').find(input => input.element.parentElement?.textContent?.includes('Показывать заполнение'))!
      await toggle.setValue(false)
      calc.idFacade.value = id
      await wrapper.vm.$nextTick()
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    } finally { wrapper.unmount(); calc.idFacade.value = id; calc.fillingProfileFacade.value = profile }
  })

  it('renders an error, not SVG, when a used pipe has no numeric profile', () => {
    const previous = calc.postProfile.value
    calc.postProfile.value = null
    try {
      const wrapper = mount(Type2Drawing)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      wrapper.unmount()
    } finally { calc.postProfile.value = previous }
  })
  it('shows an error instead of SVG when jumper properties are missing', () => {
    const previous = calc.jumperPlacement.value
    calc.jumperPlacement.value = null
    try {
      const wrapper = mount(Type2Drawing)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      wrapper.unmount()
    } finally { calc.jumperPlacement.value = previous }
  })

  it('shows an error instead of SVG when posts are unknown', () => {
    const previous = calc.hasStolby.value
    calc.hasStolby.value = null
    try {
      const wrapper = mount(Type2Drawing)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      wrapper.unmount()
    } finally { calc.hasStolby.value = previous }
  })
  it.each([
    { opensOutward: true, hingeSide: 'left' as const, x: '44' },
    { opensOutward: true, hingeSide: 'right' as const, x: '940' },
    { opensOutward: false, hingeSide: 'left' as const, x: '44' },
    { opensOutward: false, hingeSide: 'right' as const, x: '940' },
  ])('зеркалит один раз без перестановки физических петель: $opensOutward / $hingeSide', async ({ opensOutward, hingeSide, x }) => {
    calc.openingOrientation.value = { opensOutward, hingeSide }
    const wrapper = mount(Type2Drawing)
    try {
      const hinges = () => wrapper.get('[data-testid="type2-drawing-hinges"] rect')
      const behind = () => wrapper.html().indexOf('data-testid="type2-drawing-hinges"') < wrapper.html().indexOf('data-testid="type2-drawing-frame"')
      expect(hinges().attributes('x')).toBe(x)
      expect(behind()).toBe(!opensOutward)
      expect(wrapper.findAll('[transform*="scale(-1 1)"]')).toHaveLength(0)
      await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)
      expect(hinges().attributes('x')).toBe(x)
      expect(behind()).toBe(opensOutward)
      expect(wrapper.findAll('[transform="translate(1000 0) scale(-1 1)"]')).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })
  it('показывает ошибку без свойств, восстанавливает чертёж и не зависит от подписи', async () => {
    calc.openingOrientation.value = null
    const wrapper = mount(Type2Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
      await wrapper.vm.$nextTick()
      const svg = wrapper.get('svg').html()
      calc.openingOptionName.value = 'Внутрь / Правая'
      await wrapper.vm.$nextTick()
      expect(wrapper.get('svg').html()).toBe(svg)
      calc.openingOrientation.value = null
      await wrapper.vm.$nextTick()
      expect(wrapper.find('svg').exists()).toBe(false)
    } finally {
      wrapper.unmount()
      calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
    }
  })
  afterEach(() => {
    calc.widthProyema.value = '1000'
    calc.heightProyema.value = '2000'
    calc.stolbName.value = 'Труба 50×50×2'
    calc.postProfile.value = { sizeA: 50, sizeB: 50 }
    calc.openingOptionName.value = 'Наружу / Левая'
    calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
    calc.shieldType.value = 'noNet'
    calc.materialFacadeGlob.value = 'Профлист'
    calc.materialFacade.value = 'С-8'
    calc.fillingProfileFacade.value = { kind: 'c8' }
    calc.colorFacade.value = 'RAL 7016'
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = ''
    calc.coatingFacadeHex.value = ''
    calc.coatingFacadeImage.value = ''
    calc.colorFacadeReverseHex.value = '#D7D5C6'
    calc.colorFacadeReverseImage.value = ''
    calc.materialYardGlob.value = null
    calc.materialYard.value = ''
    calc.colorYard.value = ''
    calc.colorYardHex.value = ''
    calc.colorYardImage.value = ''
    calc.coatingYardHex.value = ''
    calc.coatingYardImage.value = ''
    calc.reliefYardImage.value = ''
    calc.fillSide.value = 1
    calc.colorShieldHex.value = ''
    calc.sideGrilleNetImage.value = ''
    calc.lowerGrilleNetImage.value = ''
    calc.upperGrilleNetImage.value = ''
    calc.peremichkaPolozheniyeName.value = 'Без перемычки'
    calc.jumperPlacement.value = 'none'
    calc.peremichkaSortamentName.value = ''
    calc.jumperProfile.value = null
  })
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
    calc.postProfile.value = { sizeA: 60, sizeB: 60 }
    const wrapper = mount(Type2Drawing)
    const posts = wrapper.get('[data-testid="type2-drawing-posts"]')

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['60', '60'])

    calc.stolbName.value = '80/80/3'
    calc.postProfile.value = { sizeA: 80, sizeB: 80 }
    await wrapper.vm.$nextTick()

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['80', '80'])

    calc.stolbName.value = '50/100/3'
    calc.postProfile.value = { sizeA: 100, sizeB: 50 }
    await wrapper.vm.$nextTick()

    expect(posts.findAll('rect').map(rect => rect.attributes('width'))).toEqual(['100', '100'])

    calc.stolbName.value = 'Труба 50×50×2'
    calc.postProfile.value = { sizeA: 50, sizeB: 50 }
  })

  it('вставляет картинку выбранной сетки только в боковую область подтипа 4', async () => {
    calc.shieldType.value = 'sideNet'
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

    calc.shieldType.value = 'noNet'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="type2-drawing-net"]').exists()).toBe(false)

    calc.sideGrilleNetImage.value = ''
  })

  it.each(['lowerNet', 'upperAndLowerNet'])('замощает нижнюю сетку слева направо для %s', (shieldType) => {
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

    calc.shieldType.value = 'noNet'
    calc.lowerGrilleNetImage.value = ''
  })

  it('замощает верхнюю сетку слева направо для подтипа 3', async () => {
    calc.shieldType.value = 'upperAndLowerNet'
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

    calc.shieldType.value = 'lowerNet'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="type2-drawing-upper-net"]').exists()).toBe(false)

    calc.shieldType.value = 'noNet'
    calc.upperGrilleNetImage.value = ''
  })

  it('рисует только верхнюю сетку upperNet при 600×1000', () => {
    calc.widthProyema.value = '600'
    calc.heightProyema.value = '1000'
    calc.shieldType.value = 'upperNet'
    calc.heightTopPart.value = '300'
    calc.upperGrilleNetImage.value = '/u.png'
    calc.lowerGrilleNetImage.value = '/l.png'
    const wrapper = mount(Type2Drawing)

    expect(wrapper.findAll('[data-testid="type2-drawing-upper-net-image"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="type2-drawing-upper-net-image"]').attributes('href')).toBe('/u.png')
    expect(wrapper.findAll('[data-testid="type2-drawing-upper-net-background"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="type2-drawing-upper-net"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="type2-drawing-net"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="type2-drawing-net-background"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="type2-drawing-net-image"]').exists()).toBe(false)
  })

  it.each(['lowerNet', 'sideNet'])('рисует фон сетки %s перед PNG с той же геометрией', (shieldType) => {
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

    calc.shieldType.value = 'noNet'
    calc.lowerGrilleNetImage.value = ''
    calc.sideGrilleNetImage.value = ''
  })

  it('рисует фон верхней сетки перед PNG с той же геометрией', () => {
    calc.shieldType.value = 'upperAndLowerNet'
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

    calc.shieldType.value = 'noNet'
    calc.lowerGrilleNetImage.value = ''
    calc.upperGrilleNetImage.value = ''
  })

  it('использует схематичный цвет для фонов сеток', async () => {
    calc.shieldType.value = 'upperAndLowerNet'
    calc.lowerGrilleNetImage.value = 'https://backend.test/uploads/lower-net.jpg'
    calc.upperGrilleNetImage.value = 'https://backend.test/uploads/upper-net.jpg'
    const wrapper = mount(Type2Drawing)

    await wrapper.get('input[value="schematic"]').setValue(true)

    expect(wrapper.get('[data-testid="type2-drawing-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(wrapper.get('[data-testid="type2-drawing-upper-net-background"]').attributes('fill')).toBe('#d1d5db')

    calc.shieldType.value = 'sideNet'
    calc.sideGrilleNetImage.value = 'https://backend.test/uploads/side-net.jpg'
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="type2-drawing-net-background"]').attributes('fill')).toBe('#d1d5db')

    calc.shieldType.value = 'noNet'
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
    calc.openingOrientation.value = { opensOutward: false, hingeSide: 'right' }
    await wrapper.vm.$nextTick()

    expect(wrapper.html().indexOf('data-testid="type2-drawing-hinges"'))
      .toBeLessThan(wrapper.html().indexOf('data-testid="type2-drawing-frame"'))

    calc.openingOptionName.value = 'Наружу / Левая'
    calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
  })

  it('зеркалит чертёж и меняет план петель при переключении на вид со двора', async () => {
    calc.openingOptionName.value = 'Внутрь / Левая'
    calc.openingOrientation.value = { opensOutward: false, hingeSide: 'right' }
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
    calc.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
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

  it('переносит перемычку за калиткой с улицы на фон, а со двора — на передний план', async () => {
    calc.peremichkaPolozheniyeName.value = 'За калиткой'
    calc.jumperPlacement.value = 'behind'
    calc.peremichkaSortamentName.value = '60/60/2'
    calc.jumperProfile.value = { sizeA: 60, sizeB: 50 }
    calc.fillSide.value = 2
    const wrapper = mount(Type2Drawing)
    const html = wrapper.html()
    const background = wrapper.get('[data-testid="type2-drawing-jumper-background"]')

    expect(background.attributes('stroke-dasharray')).toBe('12 8')
    expect(background.attributes('fill')).toBe('none')
    expect(html.indexOf('type2-drawing-jumper-background')).toBeLessThan(html.indexOf('type2-drawing-frame'))

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)
    const yardHtml = wrapper.html()
    const foreground = wrapper.get('[data-testid="type2-drawing-jumper-foreground"]')

    expect(foreground.attributes('stroke-dasharray')).toBeUndefined()
    expect(foreground.attributes('fill')).toBe('#66686c')
    expect(yardHtml.indexOf('type2-drawing-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type2-drawing-frame'))
    expect(yardHtml.indexOf('type2-drawing-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type2-drawing-fill'))

    await wrapper.get('[data-testid="type2-drawing-color-schematic"]').setValue(true)
    expect(wrapper.get('[data-testid="type2-drawing-jumper-foreground"]').attributes('fill')).toBe('#d1d5db')
  })

  it('всегда рисует перемычку над калиткой сплошной на переднем плане', async () => {
    calc.peremichkaPolozheniyeName.value = 'Над калиткой'
    calc.jumperPlacement.value = 'above'
    calc.peremichkaSortamentName.value = '60/60/2'
    calc.jumperProfile.value = { sizeA: 60, sizeB: 50 }
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="type2-drawing-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type2-drawing-jumper-background"]').exists()).toBe(false)

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)
    expect(wrapper.get('[data-testid="type2-drawing-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type2-drawing-jumper-background"]').exists()).toBe(false)
  })

  it('рисует покрытие второго типа через общий renderer заполнения', () => {
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = ''
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="filling-c8"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')
    expect(wrapper.find('[data-testid="filling-color-coating"]').exists()).toBe(false)
  })

  it('рисует сайдинг второго типа через общий renderer заполнения', () => {
    calc.materialFacadeGlob.value = 'Сайдинг'
    calc.materialFacade.value = 'Сайдинг «Бревно»'
    calc.fillingProfileFacade.value = { kind: 'logSiding' }
    calc.colorFacadeHex.value = '#704214'
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="type2-drawing-fill"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-log-siding"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#704214')

    calc.materialFacadeGlob.value = 'Профлист'
    calc.materialFacade.value = 'С-8'
    calc.fillingProfileFacade.value = { kind: 'c8' }
  })

  it('показывает независимые материалы и оформление фасада и двора', async () => {
    calc.fillSide.value = 2
    calc.materialFacadeGlob.value = 'Сайдинг'
    calc.materialFacade.value = 'Сайдинг «Бревно»'
    calc.fillingProfileFacade.value = { kind: 'logSiding' }
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = '/uploads/colors/facade.webp'
    calc.materialYardGlob.value = 'Профлист'
    calc.materialYard.value = 'Профнастил МП-10'
    calc.fillingProfileYard.value = { kind: 'mp10' }
    calc.colorYard.value = 'RAL 7016'
    calc.colorYardHex.value = '#383E42'
    calc.colorYardImage.value = '/uploads/colors/yard.webp'
    calc.coatingYardHex.value = '#ABCDEF'
    calc.coatingYardImage.value = '/uploads/coatings/yard.webp'
    calc.reliefYardImage.value = '/uploads/reliefs/yard.svg'
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('[data-testid="filling-log-siding"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="filling-texture"]')).toBeTruthy()
    expect(wrapper.findAll('pattern image').map(image => image.attributes('href')))
      .toContain('/uploads/colors/facade.webp')

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)

    expect(wrapper.get('[data-testid="filling-mp10"]')).toBeTruthy()
    const yardImages = wrapper.findAll('pattern image').map(image => image.attributes('href'))
    expect(yardImages).toContain('/uploads/colors/yard.webp')
    expect(yardImages).toContain('/uploads/coatings/yard.webp')
    expect(yardImages).toContain('/uploads/reliefs/yard.svg')
    expect(yardImages).not.toContain('/uploads/colors/facade.webp')

    calc.fillSide.value = 1
    calc.materialFacadeGlob.value = 'Профлист'
    calc.materialFacade.value = 'С-8'
    calc.fillingProfileFacade.value = { kind: 'c8' }
    calc.colorFacadeImage.value = ''
    calc.materialYardGlob.value = null
    calc.materialYard.value = ''
    calc.colorYard.value = ''
    calc.colorYardHex.value = ''
    calc.colorYardImage.value = ''
    calc.coatingYardHex.value = ''
    calc.coatingYardImage.value = ''
    calc.reliefYardImage.value = ''
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
    calc.fillSide.value = 1
    const wrapper = mount(Type2Drawing)

    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/front.webp')

    await wrapper.get('[data-testid="type2-drawing-view-yard"]').setValue(true)

    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/reverse.webp')

    calc.materialYardGlob.value = 'Профлист'
    calc.materialYard.value = 'С-8'
    calc.fillingProfileYard.value = { kind: 'c8' }
    calc.colorYardImage.value = '/uploads/colors/yard.webp'
    calc.fillSide.value = 2
    await wrapper.vm.$nextTick()
    expect(wrapper.get('pattern image').attributes('href')).toBe('/uploads/colors/yard.webp')

    calc.colorFacadeImage.value = ''
    calc.colorFacadeReverseImage.value = ''
    calc.materialYardGlob.value = null
    calc.materialYard.value = ''
    calc.colorYardImage.value = ''
    calc.fillSide.value = 1
  })
})
