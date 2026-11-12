import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import Type3Drawing from './Type3Drawing.vue'

describe('Type3Drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useWicketFormStore().hasStolby = 0
    useWicketFormStore().jumperPlacement = 'none'
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    { opensOutward: true, hingeSide: 'left' as const },
    { opensOutward: true, hingeSide: 'right' as const },
    { opensOutward: false, hingeSide: 'left' as const },
    { opensOutward: false, hingeSide: 'right' as const },
  ])('shows hinges with the correct layer and mirrored yard view: $opensOutward/$hingeSide', async orientation => {
    const store = useWicketFormStore()
    store.widthProyema = '900'
    store.heightProyema = '2000'
    store.fillSide = 0
    store.openingOrientation = orientation
    const wrapper = mount(Type3Drawing)
    for (const yard of [false, true]) {
      if (yard) await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
      const strip = wrapper.get('[data-testid="type3-strip"]')
      expect(strip.findAll('rect')).toHaveLength(orientation.opensOutward ? 3 : 1)
      const stripBehind = wrapper.html().indexOf('data-testid="type3-strip"') < wrapper.html().indexOf('data-testid="type3-frame"')
      expect(stripBehind).toBe(yard)
      const hinges = wrapper.get('[data-testid="type3-hinges"]')
      expect(hinges.findAll('rect')).toHaveLength(4)
      const x = hinges.get('rect').attributes('x')
      expect(x).toBe(orientation.hingeSide === 'left' ? '-6' : '890')
      const behind = wrapper.html().indexOf('data-testid="type3-hinges"') < wrapper.html().indexOf('data-testid="type3-frame"')
      expect(behind).toBe(!orientation.opensOutward !== yard)
      store.hasStolby = 1
      store.postProfile = { sizeA: 80, sizeB: 80 }
      await wrapper.vm.$nextTick()
      const behindPosts = wrapper.html().indexOf('data-testid="type3-hinges"') < wrapper.html().indexOf('data-testid="type3-posts"')
      expect(behindPosts).toBe(!orientation.opensOutward !== yard)
      store.hasStolby = 0
      store.postProfile = null
      await wrapper.vm.$nextTick()
      expect(wrapper.get('[data-testid="type3-drawing-view"]').attributes('transform')).toBe(yard ? 'translate(900 0) scale(-1 1)' : undefined)
    }
    wrapper.unmount()
  })

  it.each(['facade', 'yard'])('hides only the invalid layer when the %s single butt cut has no side', async side => {
    const store = useWicketFormStore()
    store.widthProyema = '900'; store.heightProyema = '2000'; store.shieldType = 'noNet'
    store.fillSide = 2; store.idFacade = 1; store.idYard = 2
    store.raspolozheniyePolotna = 'vertical'; store.thicknessFacade = store.thicknessYard = '100'
    store.layingFacadeCode = store.layingYardCode = 'butt'; store.gapName = store.gapYardMm = 0
    store.numberOfSticks = store.numberOfSticksYard = 6
    if (side === 'facade') {
      store.facadeButtTrimCode = 'single'; store.facadeButtTrimSide = null
      store.facadeButtTrim = { mode: 'single', widthMm: 45, quantity: 7, requiresSide: true }
    } else {
      store.yardButtTrimCode = 'single'; store.yardButtTrimSide = null
      store.yardButtTrim = { mode: 'single', widthMm: 45, quantity: 7, requiresSide: true }
    }
    const wrapper = mount(Type3Drawing)
    for (const yard of [false, true]) {
      if (yard) await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
      const invalidNear = (side === 'yard') === yard
      expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(invalidNear ? 0 : 6)
      expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(invalidNear ? 6 : 0)
      expect(wrapper.find('[data-testid="type3-outer-frame"]').exists()).toBe(true)
    }
    wrapper.unmount()
  })

  it('shows only frame on both views for explicit zero with stale pickets and invalid orientation', async () => {
    const store = useWicketFormStore()
    store.widthProyema = '700'
    store.heightProyema = '1500'
    store.fillSide = 0
    store.colorFacadeImage = '/stale-fill.png'
    store.numberOfSticks = 8
    store.raspolozheniyePolotna = ''
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="type3-detail-5"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="type3-detail-6"]').attributes('height')).toBe('40')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    expect(wrapper.find('image[href="/stale-fill.png"]').exists()).toBe(false)
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    expect(wrapper.findAll('[data-testid="type3-detail-5"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="type3-detail-6"]').attributes('height')).toBe('40')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    wrapper.unmount()
  })

  it('renders an error, not SVG, when a used jumper has no numeric profile', () => {
    useWicketFormStore().jumperPlacement = 'behind'
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
    wrapper.unmount()
  })

  it.each(['jumperPlacement', 'hasStolby'] as const)('shows an error instead of SVG when %s is unknown', field => {
    useWicketFormStore()[field] = null
    const wrapper = mount(Type3Drawing)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
    wrapper.unmount()
  })

  it('рисует точное число штакетин и выбранные столбы', () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8
    store.hasStolby = 1
    store.postProfile = { sizeA: 80, sizeB: 80 }
    store.stolbName = '80x80x3'

    const wrapper = mount(Type3Drawing)

    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(8)
    expect(wrapper.find('[data-testid="type3-posts"]').exists()).toBe(true)
  })

  it('uses the selected frame paint for posts on both sides and in schematic mode', async () => {
    const store = useWicketFormStore()
    store.widthProyema = '900'
    store.heightProyema = '2000'
    store.hasStolby = 1
    store.postProfile = { sizeA: 50, sizeB: 50 }
    store.fillSide = 0
    store.colorShieldHex = '#315c2b'
    const wrapper = mount(Type3Drawing)
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#315c2b')
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#315c2b')
    store.colorShieldHex = '#123456'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#123456')
    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
    expect(wrapper.get('[data-testid="type3-posts"]').attributes('fill')).toBe('#d1d5db')
    wrapper.unmount()
  })

  it('скрывает заполнение по переключателю', async () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8

    const wrapper = mount(Type3Drawing)
    await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)

    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  })

  it('всегда показывает стороны и скрывает одностороннее заполнение со двора', async () => {
    const store = useWicketFormStore()
    store.fillSide = 1
    store.numberOfSticks = 8

    const wrapper = mount(Type3Drawing)
    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()

    expect(wrapper.text()).toContain('С улицы')
    expect(wrapper.text()).toContain('Со двора')
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  })

  it('переключает реальные цвета на схематичные', async () => {
    const store = useWicketFormStore()
    store.numberOfSticks = 8
    store.colorFacadeHex = '#123456'

    const wrapper = mount(Type3Drawing)
    expect(wrapper.get('[data-testid="type3-pickets"]').attributes('fill')).toBe('#123456')

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()

    expect(wrapper.get('[data-testid="type3-pickets"]').attributes('fill')).toBe('#bfdbfe')
  })

  it('передаёт выбранный профиль перемычки в геометрию', () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'Над калиткой'
    store.jumperPlacement = 'above'
    store.peremichkaSortamentName = '80/80/3'
    store.jumperProfile = { sizeA: 80, sizeB: 50 }

    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes()).toMatchObject({
      y: '0',
      height: '80',
    })
  })

  it('переносит перемычку за калиткой с улицы на фон, а со двора — на передний план', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'За калиткой'
    store.jumperPlacement = 'behind'
    store.peremichkaSortamentName = '60/60/2'
    store.jumperProfile = { sizeA: 60, sizeB: 50 }
    store.fillSide = 2
    const wrapper = mount(Type3Drawing)
    const html = wrapper.html()
    const background = wrapper.get('[data-testid="type3-jumper-background"]')

    expect(background.attributes('stroke-dasharray')).toBe('12 8')
    expect(background.attributes('fill')).toBe('none')
    expect(html.indexOf('type3-jumper-background')).toBeLessThan(html.indexOf('type3-frame'))

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    const yardHtml = wrapper.html()
    const foreground = wrapper.get('[data-testid="type3-jumper-foreground"]')

    expect(foreground.attributes('stroke-dasharray')).toBeUndefined()
    expect(foreground.attributes('fill')).toBe('#66686c')
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-frame'))
    expect(yardHtml.indexOf('type3-jumper-foreground')).toBeGreaterThan(yardHtml.indexOf('type3-pickets'))

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue(true)
    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('fill')).toBe('#d1d5db')
  })

  it('всегда рисует перемычку над калиткой сплошной на переднем плане', async () => {
    const store = useWicketFormStore()
    store.peremichkaPolozheniyeName = 'Над калиткой'
    store.jumperPlacement = 'above'
    store.peremichkaSortamentName = '60/60/2'
    store.jumperProfile = { sizeA: 60, sizeB: 50 }
    const wrapper = mount(Type3Drawing)

    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)

    await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue(true)
    expect(wrapper.get('[data-testid="type3-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
    expect(wrapper.find('[data-testid="type3-jumper-background"]').exists()).toBe(false)
  })

  it.each(['upperAndLowerNet', 'upperNet'] as const)('рисует верхнюю сетку %s за рамой и сохраняет её при скрытии штакетин', async (shieldType) => {
    const store = useWicketFormStore()
    store.widthProyema = '600'
    store.heightProyema = '1000'
    store.shieldType = shieldType
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/upper.png'
    store.numberOfSticks = 4

    const wrapper = mount(Type3Drawing)
    const image = wrapper.get('[data-testid="type3-upper-net-image"]')
    const background = wrapper.get('[data-testid="type3-upper-net-background"]')
    const net = wrapper.get('[data-testid="type3-upper-net"]')
    const pattern = image.element.parentElement
    const html = wrapper.html()

    expect(image.attributes('href')).toBe('/upper.png')
    expect(image.attributes('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(pattern?.getAttribute('width')).toBe(image.attributes('width'))
    expect(pattern?.getAttribute('height')).toBe(net.attributes('height'))
    expect(net.attributes('fill')).toMatch(/^url\(#type3-upper-net-pattern-\d+\)$/)
    expect(background.attributes('fill')).toBe('#66686c')
    expect(background.attributes('x')).toBe(net.attributes('x'))
    expect(background.attributes('y')).toBe(net.attributes('y'))
    expect(background.attributes('width')).toBe(net.attributes('width'))
    expect(background.attributes('height')).toBe(net.attributes('height'))
    expect(html.indexOf('data-testid="type3-upper-net-background"')).toBeLessThan(html.indexOf('data-testid="type3-upper-net"'))
    expect(html.indexOf('data-testid="type3-upper-net"')).toBeLessThan(html.indexOf('data-testid="type3-frame"'))
    expect(wrapper.find('[data-testid="type3-lower-rail"]').exists()).toBe(shieldType === 'upperAndLowerNet')

    await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)
    expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="type3-upper-net"]').exists()).toBe(true)

    await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
    expect(wrapper.get('[data-testid="type3-upper-net-background"]').attributes('fill')).toBe('#d1d5db')
  })

  it('uses a different upper net pattern ID for each drawing instance', () => {
    const store = useWicketFormStore()
    store.shieldType = 'upperNet'
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/upper.png'

    const first = mount(Type3Drawing).get('[data-testid="type3-upper-net"]').attributes('fill')
    const second = mount(Type3Drawing).get('[data-testid="type3-upper-net"]').attributes('fill')

    expect(first).not.toBe(second)
  })

  it('sizes upper net tiles from the loaded image ratio and ignores a stale image load', async () => {
    class NetImage {
      static pending: NetImage[] = []
      naturalWidth = 600
      naturalHeight = 200
      onload: (() => void) | null = null
      src = ''

      constructor() {
        NetImage.pending.push(this)
      }
    }
    vi.stubGlobal('Image', NetImage)
    const store = useWicketFormStore()
    store.shieldType = 'upperNet'
    store.heightTopPart = '300'
    store.upperGrilleNetImage = '/old.png'
    const wrapper = mount(Type3Drawing)
    const pattern = wrapper.get('[data-testid="type3-upper-net-image"]').element.parentElement

    expect(pattern?.getAttribute('width')).toBe('300')
    store.upperGrilleNetImage = '/new.png'
    await wrapper.vm.$nextTick()
    expect(NetImage.pending).toHaveLength(2)

    NetImage.pending[0]?.onload?.()
    await wrapper.vm.$nextTick()
    expect(pattern?.getAttribute('width')).toBe('300')

    NetImage.pending[1]?.onload?.()
    await wrapper.vm.$nextTick()
    expect(pattern?.getAttribute('width')).toBe('900')
    expect(wrapper.get('[data-testid="type3-upper-net-image"]').attributes('width')).toBe('900')
  })
})

it.each(['vertical', 'horizontal'] as const)('renders the offset %s yard with fewer pickets when switching views', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.fillSide = 2
  store.raspolozheniyePolotna = direction
  store.layingFacadeCode = store.layingYardCode = 'gap'
  store.gapName = store.gapYardMm = 28
  store.thicknessFacade = store.thicknessYard = '100'
  store.numberOfSticks = direction === 'vertical' ? 6 : 12
  store.numberOfSticksYard = store.numberOfSticks // stale count from an earlier save
  const wrapper = mount(Type3Drawing)
  const axis = direction === 'vertical' ? 'x' : 'y'
  const facade = wrapper.findAll('[data-testid="type3-picket"]').map(picket => Number(picket.attributes(axis)))
  await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
  const yard = wrapper.findAll('[data-testid="type3-picket"]').map(picket => Number(picket.attributes(axis)))
  expect(yard).toHaveLength(facade.length - 1)
  yard.forEach((start, index) => expect(start).toBeCloseTo((facade[index]! + facade[index + 1]!) / 2))
  wrapper.unmount()
})

it.each(['vertical', 'horizontal'] as const)('shows the opposite %s filling through gaps behind frame and near pickets', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.fillSide = 2
  store.raspolozheniyePolotna = direction
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.thicknessFacade = store.thicknessYard = '100'; store.numberOfSticks = direction === 'vertical' ? 6 : 12
  store.numberOfSticksYard = store.numberOfSticks - 1
  store.colorFacadeHex = '#123456'; store.colorYardHex = '#654321'
  store.colorFacadeImage = '/street.png'; store.colorYardImage = '/yard.png'
  const wrapper = mount(Type3Drawing)
  const axis = direction === 'vertical' ? 'x' : 'y'
  const size = direction === 'vertical' ? 'width' : 'height'
  for (const side of ['street', 'yard'] as const) {
    if (side === 'yard') await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    const near = wrapper.findAll('[data-testid="type3-picket"]')
    const far = wrapper.findAll('[data-testid="type3-opposite-picket"]')
    expect(near).toHaveLength(side === 'street' ? store.numberOfSticks : store.numberOfSticks - 1)
    expect(far).toHaveLength(side === 'street' ? store.numberOfSticks - 1 : store.numberOfSticks)
    const gapCenter = (Number(near[0]!.attributes(axis)) + Number(near[0]!.attributes(size)) + Number(near[1]!.attributes(axis))) / 2
    expect(far.some(picket => Number(picket.attributes(axis)) < gapCenter && Number(picket.attributes(axis)) + Number(picket.attributes(size)) > gapCenter)).toBe(true)
    const html = wrapper.html()
    expect(html.indexOf('data-testid="type3-opposite-pickets"')).toBeLessThan(html.indexOf('data-testid="type3-frame"'))
    expect(html.indexOf('data-testid="type3-frame"')).toBeLessThan(html.indexOf('data-testid="type3-pickets"'))
    for (const image of ['/street.png', '/yard.png']) expect(wrapper.find(`pattern image[href="${image}"]`).exists()).toBe(true)
    const farPattern = wrapper.get('[data-testid="type3-opposite-pickets"]').attributes('fill')
    expect(farPattern).toMatch(side === 'street' ? /^url\(#type3-yard-/ : /^url\(#type3-facade-/)
  }
  await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
  expect(wrapper.get('[data-testid="type3-opposite-pickets"]').attributes('fill')).toBe('#bfdbfe')
  await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(0)
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  wrapper.unmount()
})

it.each([0, 1] as const)('does not draw a phantom opposite layer for fillSide=%s', fillSide => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'; store.fillSide = fillSide
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.numberOfSticks = 6
  store.layingYardCode = 'gap'; store.gapYardMm = 28; store.numberOfSticksYard = 5
  const wrapper = mount(Type3Drawing)
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(0)
  wrapper.unmount()
})

it('shows the two trimmed edge pieces in the rear layer and in the yard view', async () => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'
  store.widthProyema = '1114'; store.heightProyema = '2000'; store.clearanceProyema = '50'; store.fillSide = 2
  store.raspolozheniyePolotna = 'vertical'
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.thicknessFacade = store.thicknessYard = '100'; store.numberOfSticks = 8; store.numberOfSticksYard = 9
  store.yardTrimCode = 'edge'
  const wrapper = mount(Type3Drawing)
  const rear = wrapper.findAll('[data-testid="type3-opposite-picket"]')
  expect(rear).toHaveLength(9)
  expect(Number(rear[0]!.attributes('width'))).toBe(38)
  expect(Number(rear[8]!.attributes('width'))).toBe(38)
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(8)
  await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(9)
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(8)
  store.yardTrimCode = 'none'
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(7)
  wrapper.unmount()
})


it.each(['vertical', 'horizontal'] as const)('overlays each %s picket with its profile above the material on both views', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.fillSide = 2
  store.raspolozheniyePolotna = direction
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.thicknessFacade = store.thicknessYard = '100'; store.numberOfSticks = direction === 'vertical' ? 6 : 12
  store.numberOfSticksYard = store.numberOfSticks - 1
  store.colorFacadeImage = '/street-material.png'; store.colorYardImage = '/yard-material.png'
  store.reliefFacadeImage = '/street-profile.png'; store.reliefYardImage = '/yard-profile.png'
  const wrapper = mount(Type3Drawing)
  for (const side of ['street', 'yard'] as const) {
    if (side === 'yard') await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    for (const opposite of [false, true]) {
      const group = wrapper.get(`[data-testid="type3-${opposite ? 'opposite-pickets' : 'pickets'}"]`)
      const pickets = group.findAll(opposite ? '[data-testid="type3-opposite-picket"]' : '[data-testid="type3-picket"]')
      const images = group.findAll('image')
      expect(images).toHaveLength(pickets.length)
      expect(images.length).toBeGreaterThan(0)
      const expectedSide = (side === 'street') !== opposite ? 'street' : 'yard'
      images.forEach((image, index) => {
        expect(image.attributes('href')).toBe(`/${expectedSide}-profile.png`)
        expect(image.attributes('preserveAspectRatio')).toBe('none')
        const picket = pickets[index]!
        if (direction === 'horizontal') {
          expect(image.attributes('width')).toBe(picket.attributes('height'))
          expect(image.attributes('height')).toBe(picket.attributes('width'))
          expect(image.attributes('transform')).toContain('rotate(90)')
        } else {
          for (const attr of ['x', 'y', 'width', 'height']) expect(image.attributes(attr)).toBe(picket.attributes(attr))
        }
      })
      expect(group.html().indexOf('<image')).toBeGreaterThan(group.html().lastIndexOf(opposite ? 'data-testid="type3-opposite-picket"' : 'data-testid="type3-picket"'))
      expect(group.attributes('fill')).toMatch(/^url\(#type3-/)
    }
  }
  await wrapper.get('[data-testid="type3-drawing-color-schematic"]').setValue()
  expect(wrapper.findAll('image[href$="-profile.png"]')).toHaveLength(0)
  await wrapper.get('[data-testid="type3-drawing-color-realistic"]').setValue()
  await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)
  expect(wrapper.findAll('image[href$="-profile.png"]')).toHaveLength(0)
  await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(true)
  store.fillingNeedsRecalculation = true
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('image[href$="-profile.png"]')).toHaveLength(0)
  wrapper.unmount()
})

it.each(['vertical', 'horizontal'] as const)('draws continuous %s near-picket outlines above every fill and profile overlay', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.widthProyema = '900'; store.heightProyema = '2000'; store.hasStolby = 0; store.jumperPlacement = 'none'
  store.shieldType = 'upperNet'; store.heightTopPart = '300'; store.fillSide = 2
  store.raspolozheniyePolotna = direction; store.thicknessFacade = '130'; store.thicknessYard = '118'
  store.layingFacadeCode = store.layingYardCode = 'butt'; store.gapName = store.gapYardMm = 0
  store.numberOfSticks = store.numberOfSticksYard = 7
  store.colorFacadeHex = store.colorYardHex = '#8b7355'
  store.reliefFacadeImage = '/front-relief.png'; store.reliefYardImage = '/yard-relief.png'
  const wrapper = mount(Type3Drawing)
  for (const yard of [false, true]) {
    if (yard) await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    const near = wrapper.get('[data-testid="type3-pickets"]')
    const outlines = near.findAll('[data-testid="type3-picket-outline"]')
    expect(outlines).toHaveLength(near.findAll('[data-testid="type3-picket"]').length)
    expect(outlines.length).toBeGreaterThan(0)
    for (const outline of outlines) expect(outline.attributes('vector-effect')).toBe('non-scaling-stroke')
    const html = near.html()
    expect(html.lastIndexOf('data-testid="type3-picket-outline"')).toBeGreaterThan(html.lastIndexOf('<image'))
  }
  await wrapper.get('[data-testid="type3-drawing-fill-toggle"]').setValue(false)
  expect(wrapper.findAll('[data-testid="type3-picket-outline"]')).toHaveLength(0)
  wrapper.unmount()
})

it.each(['vertical', 'horizontal'] as const)('renders the saved %s facade while the yard is pending recalculation', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.hasStolby = 0; store.jumperPlacement = 'none'
  store.fillSide = 2; store.raspolozheniyePolotna = direction
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.thicknessFacade = store.thicknessYard = '100'; store.numberOfSticks = direction === 'vertical' ? 6 : 12
  store.numberOfSticksYard = store.numberOfSticks - 1
  store.colorFacadeImage = '/saved-facade.png'; store.colorYardImage = '/pending-yard.png'
  store.fillingNeedsRecalculation = true; store.fillingFacadeReady = true; store.fillingYardReady = false
  const wrapper = mount(Type3Drawing)
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(store.numberOfSticks)
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(0)
  expect(wrapper.find('pattern image[href="/saved-facade.png"]').exists()).toBe(true)
  expect(wrapper.find('pattern image[href="/pending-yard.png"]').exists()).toBe(false)
  await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(0)
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(store.numberOfSticks)
  store.fillingYardReady = true
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(store.numberOfSticksYard)
  expect(store.fillingNeedsRecalculation).toBe(true)
  store.fillingFacadeReady = false
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-testid="type3-opposite-picket"]')).toHaveLength(0)
  expect(wrapper.findAll('[data-testid="type3-picket"]')).toHaveLength(store.numberOfSticksYard)
  wrapper.unmount()
})

it('renders only detail 4 and central detail 6 reinforcement for horizontal filling in both views', async () => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.widthProyema = '1000'; store.heightProyema = '2000'
  store.hasStolby = 0; store.jumperPlacement = 'none'; store.shieldType = 'noNet'
  store.raspolozheniyePolotna = 'horizontal'
  const wrapper = mount(Type3Drawing)
  for (const yard of [false, true]) {
    if (yard) await wrapper.get('[data-testid="type3-drawing-view-yard"]').setValue()
    expect(wrapper.findAll('[data-testid="type3-detail-4"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="type3-detail-5"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="type3-detail-6"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="type3-detail-6"]').attributes('height')).toBe('40')
  }
  wrapper.unmount()
})

it.each(['vertical', 'horizontal'] as const)('clips %s trimmed relief without squeezing the full profile', direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.fillSide = 2
  store.raspolozheniyePolotna = direction
  store.thicknessFacade = store.thicknessYard = '100'
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.numberOfSticks = direction === 'vertical' ? 7 : 14
  store.numberOfSticksYard = store.numberOfSticks - 1; store.yardTrimCode = 'edge'
  store.reliefFacadeImage = store.reliefYardImage = '/profile.svg'
  const wrapper = mount(Type3Drawing)
  const group = wrapper.get('[data-testid="type3-opposite-pickets"]')
  const pieces = group.findAll('[data-testid="type3-opposite-picket"]')
  const images = group.findAll('image')
  expect(Number(pieces[0]!.attributes(direction === 'horizontal' ? 'height' : 'width'))).toBeLessThan(100)
  for (const image of images) {
    expect(Number(image.attributes('width'))).toBe(100)
    expect(image.attributes('clip-path')).toMatch(/^url\(#/)
  }
})

it.each(['vertical', 'horizontal'] as const)('masks all %s picket layers on both sides without squeezing trimmed caps', async direction => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.hasStolby = 0; store.jumperPlacement = 'none'; store.widthProyema = '1000'; store.heightProyema = '2000'; store.fillSide = 2
  store.raspolozheniyePolotna = direction; store.thicknessFacade = store.thicknessYard = '100'
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28; store.numberOfSticks = direction === 'vertical' ? 7 : 14
  store.yardTrimCode = 'edge'; store.numberOfSticksYard = store.numberOfSticks - 1
  store.fenceEdgeOptions = [{ id: 71, name: 'Любое имя', isHorizontal: 1, isVertical: 1, maskFile: '/rounded.svg' }]
  const w = mount(Type3Drawing)
  expect(w.get('[data-testid="type3-pickets"]').attributes('mask')).toBeUndefined()
  store.fenceEdgeFacadeId = store.fenceEdgeYardId = 71
  await w.vm.$nextTick()
  for (const opposite of [false, true]) {
    expect(w.get(`[data-testid="type3-${opposite ? 'opposite-pickets' : 'pickets'}"]`).attributes('mask')).toMatch(/^url\(#/)
  }
  expect(w.findAll('mask image').length).toBeGreaterThan(0)
  for (const image of w.findAll('mask image')) expect(Number(image.attributes('width'))).toBe(100)
  expect(w.get('mask image').attributes('href')).toBe('/rounded.svg')
  for (const cap of w.findAll('mask > g > g')) {
    const image = cap.get('image')
    const body = cap.get('rect')
    const imageEnd = direction === 'vertical'
      ? Number(image.attributes('y')) + Number(image.attributes('height'))
      : Number(image.attributes('transform')!.match(/translate\(([^ ]+)/)![1]) + Number(image.attributes('height'))
    expect(Number(body.attributes(direction === 'vertical' ? 'y' : 'x'))).toBeLessThan(imageEnd)
  }

})
