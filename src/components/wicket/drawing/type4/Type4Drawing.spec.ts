import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import Type4Drawing from './Type4Drawing.vue'

describe('type 4 drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const s = useWicketFormStore()
    s.widthProyema = '900'; s.heightProyema = '2000'; s.clearanceProyema = '50'
    s.hasStolby = 0; s.postProfile = null; s.jumperPlacement = 'none'; s.jumperProfile = null
    s.openingOrientation = { hingeSide: 'left', opensOutward: true }
    s.fillSide = 1; s.idFacade = 10; s.thicknessFacade = '100'; s.raspolozheniyePolotna = 'vertical'
    s.colorFacadeHex = '#123456'; s.colorFacadeReverseHex = '#654321'
  })
  it('draws lamella widths and crops the final lamella', () => {
    const w = mount(Type4Drawing)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    const parts = w.findAll('[data-testid="type4-lamella"]')
    expect(parts).toHaveLength(8)
    expect(parts[0]!.attributes('width')).toBe('100')
    expect(parts[7]!.attributes('width')).toBe('76')
    expect(w.get('[data-testid="type4-inner-frame"]').findAll('rect')).toHaveLength(4)
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'] as const)('draws horizontal and vertical inner pipes for %s from either side', async shieldType => {
    const s = useWicketFormStore()
    s.shieldType = shieldType
    s.grilleLocation = 'hinge'
    const w = mount(Type4Drawing)
    for (const yard of [false, true]) {
      if (yard) await w.get('[data-testid="type4-view-yard"]').setValue()
      const pipes = w.get('[data-testid="type4-inner-frame"]').findAll('rect:not([data-testid="type4-subtype-rail"])')
      expect(pipes).toHaveLength(4)
      expect(pipes.filter(pipe => pipe.attributes('height') === '15')).toHaveLength(2)
      expect(pipes.filter(pipe => pipe.attributes('width') === '15')).toHaveLength(2)
    }
  })
  it('keeps filling between the rear and front perimeter from both views', async () => {
    const w = mount(Type4Drawing)
    for (const yard of [false, true]) {
      if (yard) await w.get('[data-testid="type4-view-yard"]').setValue()
      const html = w.html()
      const rearIndex = html.indexOf('data-testid="type4-back-inner-frame"')
      expect(rearIndex).toBeGreaterThanOrEqual(0)
      expect(rearIndex).toBeLessThan(html.indexOf('data-testid="type4-lamella-filling"'))
      expect(html.indexOf('data-testid="type4-lamella-filling"')).toBeLessThan(html.indexOf('data-testid="type4-inner-frame"'))
      const front = w.get('[data-testid="type4-inner-frame"]')
      const rear = w.get('[data-testid="type4-back-inner-frame"]')
      expect(front.attributes('data-face')).toBe(yard ? 'yard' : 'street')
      expect(front.attributes('data-depth')).toBe(yard ? '35' : '0')
      expect(rear.attributes('data-depth')).toBe(yard ? '0' : '35')
      expect(rear.findAll('rect')).toHaveLength(4)
    }
  })
  it('lays out horizontal lamellae', () => {
    useWicketFormStore().raspolozheniyePolotna = 'horizontal'
    const w = mount(Type4Drawing)
    expect(w.findAll('[data-testid="type4-lamella"]')).toHaveLength(19)
    expect(w.get('[data-testid="type4-lamella"]').attributes('height')).toBe('100')
  })
  it('puts reverse filling behind the inner frame from the yard', async () => {
    const w = mount(Type4Drawing)
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#123456')
    await w.get('[data-testid="type4-view-yard"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#654321')
    expect(w.html().indexOf('data-testid="type4-lamella-filling"')).toBeLessThan(w.html().indexOf('data-testid="type4-inner-frame"'))
  })
  it('uses independent yard width and color', async () => {
    const s = useWicketFormStore()
    s.fillSide = 2; s.idYard = 20; s.thicknessYard = '200'; s.colorYardHex = '#abcdef'
    const w = mount(Type4Drawing)
    await w.get('[data-testid="type4-view-yard"]').setValue()
    expect(w.findAll('[data-testid="type4-lamella"]')).toHaveLength(4)
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#abcdef')
  })
  it('lets the user hide unconfigured filling', async () => {
    useWicketFormStore().thicknessFacade = ''
    const w = mount(Type4Drawing)
    expect(w.get('[role="alert"]').text()).toContain('ширина')
    await w.get('[data-testid="type4-show-fill"]').setValue(false)
    expect(w.find('svg').exists()).toBe(true)
  })
  it('ignores stale fields with no filling', () => {
    const s = useWicketFormStore(); s.fillSide = 0; s.raspolozheniyePolotna = ''
    const w = mount(Type4Drawing)
    expect(w.find('svg').exists()).toBe(true)
    expect(w.findAll('[data-testid="type4-lamella"]')).toHaveLength(0)
  })
})
