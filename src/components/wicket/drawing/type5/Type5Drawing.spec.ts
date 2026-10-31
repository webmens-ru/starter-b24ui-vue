import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from '../drawingRegistry'
import Type5Drawing from './Type5Drawing.vue'

describe('type 5 drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const s = useWicketFormStore()
    s.widthProyema = '900'; s.heightProyema = '2000'; s.clearanceProyema = '50'
    s.hasStolby = 0; s.postProfile = null; s.jumperPlacement = 'none'; s.jumperProfile = null
    s.openingOrientation = { hingeSide: 'left', opensOutward: true }
    s.fillSide = 1; s.idFacade = 10; s.raspolozheniyePolotna = 'vertical'
    s.colorFacadeHex = '#123456'; s.colorFacadeReverseHex = '#654321'
  })
  it('is the registered model-5 renderer and draws street strips above the outer frame', () => {
    expect(resolveDrawingComponent('5')).toBe(Type5Drawing)
    const w = mount(Type5Drawing)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.get('[data-testid="type5-inner-frame"]').findAll('polygon')).toHaveLength(4)
    expect(w.get('[data-testid="type5-back-inner-frame"]').findAll('rect')).toHaveLength(4)
    expect(w.find('[data-position="6"]').exists()).toBe(false)
    const html = w.html()
    expect(html.indexOf('data-testid="type5-back-inner-frame"')).toBeLessThan(html.indexOf('data-testid="filling-surface"'))
    expect(html.indexOf('data-testid="filling-surface"')).toBeLessThan(html.indexOf('data-testid="type5-outer-frame"'))
    expect(html.indexOf('data-testid="type5-outer-frame"')).toBeLessThan(html.indexOf('data-testid="type5-inner-frame"'))
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'] as const)('swaps visible retainers for %s without adding detail 6', async shieldType => {
    const s = useWicketFormStore(); s.shieldType = shieldType; s.grilleLocation = 'hinge'
    const w = mount(Type5Drawing)
    expect(w.get('[data-testid="type5-inner-frame"]').attributes('data-face')).toBe('street')
    expect(w.get('[data-testid="type5-inner-frame"]').attributes('data-depth')).toBe('-4')
    await w.get('[data-testid="type5-view-yard"]').setValue()
    const front = w.get('[data-testid="type5-inner-frame"]')
    expect(front.attributes('data-face')).toBe('yard')
    expect(front.attributes('data-depth')).toBe('40')
    expect(front.findAll('[data-position="4"]')).toHaveLength(2)
    expect(front.findAll('[data-position="5"]')).toHaveLength(2)
    expect(w.get('[data-testid="type5-back-inner-frame"]').findAll('polygon')).toHaveLength(4)
    expect(w.find('[data-position="6"]').exists()).toBe(false)
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#654321')
  })
  it('uses independent yard color, supports hidden filling and schematic mode', async () => {
    const s = useWicketFormStore(); s.fillSide = 2; s.idYard = 20; s.colorYardHex = '#abcdef'
    const w = mount(Type5Drawing)
    await w.get('[data-testid="type5-view-yard"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#abcdef')
    await w.get('[data-testid="type5-color-schematic"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    await w.get('[data-testid="type5-show-fill"]').setValue(false)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
  })
  it('ignores stale filling orientation when no filling is selected', () => {
    const s = useWicketFormStore(); s.fillSide = 0; s.raspolozheniyePolotna = ''
    const w = mount(Type5Drawing)
    expect(w.find('svg').exists()).toBe(true)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
  })
})
