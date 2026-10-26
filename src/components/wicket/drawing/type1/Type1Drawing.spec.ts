import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { FillingDrawingProfile, FillingDrawingProfileProblem } from '../../../../app/api/fillingDrawingProfiles'
import { describe, expect, it, vi } from 'vitest'

const c = {
  widthProyema: ref('1000'),
  heightProyema: ref('2000'),
  clearanceProyema: ref('50'),
  hasStolby: ref<0 | 1 | null>(1),
  jumperPlacement: ref<'none' | 'above' | 'behind' | null>('none'),
  jumperPlacementProblem: ref(null),
  postsPresenceProblem: ref(null),
  postProfile: ref<{sizeA:number;sizeB:number}|null>({ sizeA: 60, sizeB: 60 }),
  postProfileProblem: ref(null),
  jumperProfile: ref<{sizeA:number;sizeB:number}|null>(null),
  jumperProfileProblem: ref(null),
  stolbName: ref('60/60/2'),
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
  raspolozheniyePolotna: ref('vertical'),
  colorShieldHex: ref(''),
  sideGrilleNetImage: ref(''),
  lowerGrilleNetImage: ref(''),
  upperGrilleNetImage: ref(''),
  fillSide: ref(1),
}

describe('numeric pipe rendering errors', () => {
  it('replaces SVG with an error for missing post dimensions and recovers on valid properties', async () => {
    const previous = c.postProfile.value
    c.postProfile.value = null
    const wrapper = mount(Type1Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      c.postProfile.value = { sizeA: 60, sizeB: 40 }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    } finally { wrapper.unmount(); c.postProfile.value = previous }
  })
})

vi.mock('../../../../composables/useCalculation', () => ({ useCalculation: () => c }))

import Type1Drawing from './Type1Drawing.vue'
vi.stubGlobal('fetch', async () => ({ ok: true, blob: async () => new Blob(['<svg viewBox="0 0 80 200"/>'], { type: 'image/svg+xml' }) }))

describe('Type1Drawing', () => {
  it('draws both sides when the API reports missing optional material profiles', async () => {
    const before = [c.fillingProfileFacade.value, c.fillingProfileYard.value] as const
    const problems = [c.fillingProfileFacadeProblem.value, c.fillingProfileYardProblem.value] as const
    const side = c.fillSide.value
    c.fillSide.value = 2
    c.fillingProfileFacade.value = null
    c.fillingProfileYard.value = null
    c.fillingProfileFacadeProblem.value = { code: 'missing', message: 'Для материала не настроен профиль отрисовки.' }
    c.fillingProfileYardProblem.value = { code: 'missing', message: 'Для материала не настроен профиль отрисовки.' }
    const wrapper = mount(Type1Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(true)
      await wrapper.get('[data-testid="type1-view-yard"]').setValue(true)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(true)
    } finally {
      wrapper.unmount()
      c.fillingProfileFacade.value = before[0]
      c.fillingProfileYard.value = before[1]
      c.fillingProfileFacadeProblem.value = problems[0]
      c.fillingProfileYardProblem.value = problems[1]
      c.fillSide.value = side
    }
  })

  it('draws base and frame without requiring a historical profile', async () => {
    const before = c.fillingProfileFacade.value
    c.fillingProfileFacade.value = null
    const wrapper = mount(Type1Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      c.fillingProfileFacade.value = { kind: 'c20' }
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(true)
    } finally { wrapper.unmount(); c.fillingProfileFacade.value = before }
  })

  it('does not infer shape from renamed captions or require an unused yard profile', async () => {
    const name = c.materialFacade.value, yardProfile = c.fillingProfileYard.value
    c.fillingProfileYard.value = null
    const wrapper = mount(Type1Drawing)
    try {
      const svg = wrapper.get('svg').html()
      c.materialFacade.value = 'Сайдинг Бревно МП-20'
      await wrapper.vm.$nextTick()
      expect(wrapper.get('svg').html()).toBe(svg)
      c.fillSide.value = 2
      await wrapper.get('[data-testid="type1-view-yard"]').setValue(true)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    } finally {
      wrapper.unmount(); c.materialFacade.value = name
      c.fillingProfileYard.value = yardProfile; c.fillSide.value = 1
    }
  })

  it('draws a frame without filling for no selected material and allows hiding an unconfigured filling', async () => {
    const id = c.idFacade.value, profile = c.fillingProfileFacade.value
    c.idFacade.value = ''
    c.fillingProfileFacade.value = null
    const wrapper = mount(Type1Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[data-testid="filling-drawing"]').exists()).toBe(false)
      const toggle = wrapper.findAll('input[type="checkbox"]').find(input => input.element.parentElement?.textContent?.includes('Показывать заполнение'))!
      await toggle.setValue(false)
      c.idFacade.value = id
      await wrapper.vm.$nextTick()
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    } finally { wrapper.unmount(); c.idFacade.value = id; c.fillingProfileFacade.value = profile }
  })

  it('shows an error instead of SVG when jumper properties are missing', () => {
    const previous = c.jumperPlacement.value
    c.jumperPlacement.value = null
    try {
      const wrapper = mount(Type1Drawing)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      wrapper.unmount()
    } finally { c.jumperPlacement.value = previous }
  })

  it('shows an error instead of SVG when posts are unknown', () => {
    const previous = c.hasStolby.value
    c.hasStolby.value = null
    try {
      const wrapper = mount(Type1Drawing)
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      wrapper.unmount()
    } finally { c.hasStolby.value = previous }
  })
  it.each([
    { opensOutward: true, hingeSide: 'left' as const, x: '54' },
    { opensOutward: true, hingeSide: 'right' as const, x: '930' },
    { opensOutward: false, hingeSide: 'left' as const, x: '54' },
    { opensOutward: false, hingeSide: 'right' as const, x: '930' },
  ])('зеркалит один раз без перестановки физических петель: $opensOutward / $hingeSide', async ({ opensOutward, hingeSide, x }) => {
    c.openingOrientation.value = { opensOutward, hingeSide }
    const wrapper = mount(Type1Drawing)
    try {
      const hinges = () => wrapper.get('[data-testid="type1-hinges"] rect')
      const behind = () => wrapper.html().indexOf('data-testid="type1-hinges"') < wrapper.html().indexOf('data-testid="type1-frame"')
      expect(hinges().attributes('x')).toBe(x)
      expect(behind()).toBe(!opensOutward)
      expect(wrapper.findAll('[transform*="scale(-1 1)"]')).toHaveLength(0)
      await wrapper.get('[data-testid="type1-view-yard"]').setValue(true)
      expect(hinges().attributes('x')).toBe(x)
      expect(behind()).toBe(opensOutward)
      expect(wrapper.findAll('[transform="translate(1000 0) scale(-1 1)"]')).toHaveLength(1)
    } finally {
      wrapper.unmount()
      c.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
    }
  })
  it('показывает ошибку без свойств, восстанавливает чертёж и не зависит от подписи', async () => {
    c.openingOrientation.value = null
    const wrapper = mount(Type1Drawing)
    try {
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.get('[role="alert"]').text()).not.toBe('')
      c.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
      await wrapper.vm.$nextTick()
      const svg = wrapper.get('svg').html()
      c.openingOptionName.value = 'Внутрь / Правая'
      await wrapper.vm.$nextTick()
      expect(wrapper.get('svg').html()).toBe(svg)
      c.openingOrientation.value = null
      await wrapper.vm.$nextTick()
      expect(wrapper.find('svg').exists()).toBe(false)
    } finally {
      wrapper.unmount()
      c.openingOrientation.value = { opensOutward: true, hingeSide: 'left' }
      c.openingOptionName.value = 'Наружу / Левая'
    }
  })
  it('рисует отдельный адаптивный SVG и заполнение улицы перед рамой', () => {
    const w = mount(Type1Drawing)
    expect(w.get('[data-testid="type1-drawing-svg"]').classes()).toContain('max-h-[650px]')
    expect(w.find('[data-testid="type1-frame"]').exists()).toBe(true)
    expect(w.html().indexOf('data-testid="type1-fill"')).toBeGreaterThan(w.html().indexOf('data-testid="type1-frame"'))
  })

  it('рисует одну вертикальную позицию 6 для горизонтального заполнения', () => {
    const previousHeight = c.heightProyema.value
    const previousOrientation = c.raspolozheniyePolotna.value

    try {
      c.heightProyema.value = '670'
      c.raspolozheniyePolotna.value = 'horizontal'
      const wrapper = mount(Type1Drawing)

      expect(wrapper.findAll('[data-testid="type1-lock-pipe"]')).toHaveLength(1)
      expect(wrapper.get('[data-testid="type1-lock-pipe"]').attributes()).toMatchObject({
        x: '477',
        y: '80',
        width: '40',
        height: '460',
      })
    } finally {
      c.heightProyema.value = previousHeight
      c.raspolozheniyePolotna.value = previousOrientation
    }
  })

  it.each(['lowerNet', 'sideNet'])('рисует фон нижней сетки %s перед PNG с той же геометрией', (subtype) => {
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
    c.shieldType.value = 'noNet'
    c.lowerGrilleNetImage.value = ''
    c.sideGrilleNetImage.value = ''
  })

  it('рисует фон верхней сетки подтипа 3 перед PNG с той же геометрией', () => {
    c.shieldType.value = 'upperAndLowerNet'
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
    c.shieldType.value = 'noNet'
    c.lowerGrilleNetImage.value = ''
    c.upperGrilleNetImage.value = ''
  })

  it('рисует только верхнюю сетку upperNet при 600×1000', () => {
    const previous = { width: c.widthProyema.value, height: c.heightProyema.value, subtype: c.shieldType.value, upper: c.upperGrilleNetImage.value, lower: c.lowerGrilleNetImage.value }
    try {
      c.widthProyema.value = '600'
      c.heightProyema.value = '1000'
      c.shieldType.value = 'upperNet'
      c.heightTopPart.value = '300'
      c.upperGrilleNetImage.value = '/u.png'
      c.lowerGrilleNetImage.value = '/l.png'
      const wrapper = mount(Type1Drawing)
      expect(wrapper.findAll('[data-testid="type1-drawing-upper-net-image"]')).toHaveLength(1)
      expect(wrapper.get('[data-testid="type1-drawing-upper-net-image"]').attributes('href')).toBe('/u.png')
      expect(wrapper.findAll('[data-testid="type1-upper-net-background"]')).toHaveLength(1)
      expect(wrapper.findAll('[data-testid="type1-upper-net"]')).toHaveLength(1)
      expect(wrapper.find('[data-testid="type1-net"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="type1-net-background"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="type1-drawing-net-image"]').exists()).toBe(false)
    } finally {
      c.widthProyema.value = previous.width
      c.heightProyema.value = previous.height
      c.shieldType.value = previous.subtype
      c.upperGrilleNetImage.value = previous.upper
      c.lowerGrilleNetImage.value = previous.lower
    }
  })

  it('использует схематичные цвета для сеток и заполнения', async () => {
    c.shieldType.value = 'upperAndLowerNet'
    c.lowerGrilleNetImage.value = '/uploads/nets/lower.webp'
    c.upperGrilleNetImage.value = '/uploads/nets/upper.webp'
    const w = mount(Type1Drawing)
    await w.get('input[value="schematic"]').setValue(true)
    expect(w.get('[data-testid="type1-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(w.get('[data-testid="type1-upper-net-background"]').attributes('fill')).toBe('#d1d5db')
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    c.shieldType.value = 'noNet'
    c.lowerGrilleNetImage.value = ''
    c.upperGrilleNetImage.value = ''
  })

  it('рисует внешний рельеф профнастила только из данных бэка', async () => {
    c.materialFacade.value = 'Профнастил С-20'
    c.fillingProfileFacade.value = { kind: 'c20' }
    c.reliefFacadeImage.value = '/uploads/dict/filling-relief/profnastil-c20.svg'
    const w = mount(Type1Drawing)
    expect(w.get('[data-testid="filling-drawing"]')).toBeTruthy()
    await flushPromises()
    expect(w.get('[data-testid="filling-relief-texture"]').attributes('fill')).toContain('relief-texture')
    expect(w.find('[data-testid="filling-profile-shadow"]').exists()).toBe(false)
    c.materialFacade.value = 'С-8'
    c.fillingProfileFacade.value = { kind: 'c8' }
    c.reliefFacadeImage.value = ''
  })

  it('без reliefImage не рисует слой рельефа', () => {
    c.materialFacade.value = 'С-8'
    c.fillingProfileFacade.value = { kind: 'c8' }
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
    c.fillSide.value = 2
    c.materialFacade.value = 'С-8'
    c.fillingProfileFacade.value = { kind: 'c8' }
    c.materialYard.value = 'Профнастил МП-10'
    c.fillingProfileYard.value = { kind: 'mp10' }
    const w = mount(Type1Drawing)
    await w.get('[data-testid="type1-view-yard"]').setValue(true)
    expect(w.get('[data-testid="filling-drawing"]')).toBeTruthy()
    expect(w.findAll('[data-testid="type1-fill"] rect').some(rect => rect.attributes('fill') === '#123456')).toBe(true)
    expect(w.html().indexOf('data-testid="type1-fill"')).toBeGreaterThan(w.html().indexOf('data-testid="type1-frame"'))
    c.fillSide.value = 1
    c.materialYard.value = 'С-8'
    c.fillingProfileYard.value = { kind: 'c8' }
  })

  it('переносит перемычку за калиткой с улицы на фон, а со двора — на передний план', async () => {
    const previousPlacement = c.peremichkaPolozheniyeName.value
    const previousJumperPlacement = c.jumperPlacement.value
    const previousProfile = c.peremichkaSortamentName.value
    const previousFillSide = c.fillSide.value
    c.peremichkaPolozheniyeName.value = 'За калиткой'
    c.jumperPlacement.value = 'behind'
    c.peremichkaSortamentName.value = '60/60/2'
    c.jumperProfile.value = { sizeA: 60, sizeB: 60 }
    c.fillSide.value = 2

    try {
      const wrapper = mount(Type1Drawing)
      const html = wrapper.html()
      const background = wrapper.get('[data-testid="type1-jumper-background"]')

      expect(background.attributes('stroke-dasharray')).toBe('12 8')
      expect(background.attributes('fill')).toBe('none')
      expect(html.indexOf('type1-jumper-background')).toBeLessThan(html.indexOf('type1-frame'))

      await wrapper.get('[data-testid="type1-view-yard"]').setValue(true)
      const yardHtml = wrapper.html()
      const foreground = wrapper.get('[data-testid="type1-jumper-foreground"]')

      expect(foreground.attributes('stroke-dasharray')).toBeUndefined()
      expect(foreground.attributes('fill')).toBe('#66686c')
      expect(yardHtml.indexOf('type1-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type1-frame'))
      expect(yardHtml.indexOf('type1-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type1-fill'))

      await wrapper.get('input[value="schematic"]').setValue(true)
      expect(wrapper.get('[data-testid="type1-jumper-foreground"]').attributes('fill')).toBe('#d1d5db')
    } finally {
      c.peremichkaPolozheniyeName.value = previousPlacement
      c.jumperPlacement.value = previousJumperPlacement
      c.peremichkaSortamentName.value = previousProfile
      c.jumperProfile.value = null
      c.fillSide.value = previousFillSide
    }
  })

  it('всегда рисует перемычку над калиткой сплошной на переднем плане', async () => {
    const previousPlacement = c.peremichkaPolozheniyeName.value
    const previousJumperPlacement = c.jumperPlacement.value
    const previousProfile = c.peremichkaSortamentName.value
    c.peremichkaPolozheniyeName.value = 'Над калиткой'
    c.jumperPlacement.value = 'above'
    c.peremichkaSortamentName.value = '60/60/2'
    c.jumperProfile.value = { sizeA: 60, sizeB: 60 }

    try {
      const wrapper = mount(Type1Drawing)
      expect(wrapper.get('[data-testid="type1-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
      expect(wrapper.find('[data-testid="type1-jumper-background"]').exists()).toBe(false)

      await wrapper.get('[data-testid="type1-view-yard"]').setValue(true)
      expect(wrapper.get('[data-testid="type1-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
      expect(wrapper.find('[data-testid="type1-jumper-background"]').exists()).toBe(false)
    } finally {
      c.peremichkaPolozheniyeName.value = previousPlacement
      c.jumperPlacement.value = previousJumperPlacement
      c.peremichkaSortamentName.value = previousProfile
      c.jumperProfile.value = null
    }
  })
})
