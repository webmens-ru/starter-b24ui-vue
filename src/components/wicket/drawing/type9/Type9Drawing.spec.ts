import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from '../drawingRegistry'
import Type9Drawing from './Type9Drawing.vue'
describe('type 9 drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const s = useWicketFormStore()
    s.widthProyema = '1000'; s.heightProyema = '2000'; s.clearanceProyema = '50'
    s.hasStolby = 0; s.postProfile = null; s.jumperPlacement = 'none'; s.jumperProfile = null
    s.openingOrientation = { hingeSide: 'left', opensOutward: true }
    s.fillSide = 1; s.idFacade = 10; s.raspolozheniyePolotna = 'vertical'
    s.colorFacadeHex = '#123456'; s.colorFacadeReverseHex = '#654321'
  })
  it('registers model 9 and places street sheet above crossbar, yard crossbar above sheet', async () => {
    expect(resolveDrawingComponent('9')).toBe(Type9Drawing)
    const w = mount(Type9Drawing)
    expect(w.findAll('[data-position="6"]')).toHaveLength(3)
    expect(w.find('[data-position="4"], [data-position="5"], [data-position="8"], [data-position="10"]').exists()).toBe(false)
    expect(w.html().indexOf('data-position="6"')).toBeLessThan(w.html().indexOf('data-testid="filling-surface"'))
    await w.get('[data-testid="type9-view-yard"]').setValue()
    expect(w.html().indexOf('data-position="6"')).toBeGreaterThan(w.html().indexOf('data-testid="filling-surface"'))
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#654321')
    await w.get('[data-testid="type9-color-schematic"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    await w.get('[data-testid="type9-show-fill"]').setValue(false)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(w.findAll('[data-position="6"]')).toHaveLength(3)
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'] as const)('keeps crossbar visible without filling and shared %s rails', async shieldType => {
    const s = useWicketFormStore(); s.shieldType = shieldType; s.grilleLocation = 'hinge'; s.fillSide = 0; s.raspolozheniyePolotna = ''
    const w = mount(Type9Drawing)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.findAll('[data-position="6"]')).toHaveLength(3)
    expect(w.findAll('[data-testid="type9-subtype-rail"]')).toHaveLength(w.findAll('[data-testid="type9-net"]').length)
    await w.get('[data-testid="type9-view-yard"]').setValue()
    expect(w.findAll('[data-position="6"]')).toHaveLength(3)
  })
  it('keeps profile 50, common hinges, posts, jumper and net layers in both views', async () => {
    const s = useWicketFormStore()
    s.hasStolby = 1; s.postProfile = { sizeA: 80, sizeB: 80 }
    s.jumperPlacement = 'behind'; s.jumperProfile = { sizeA: 40, sizeB: 20 }
    s.shieldType = 'upperNet'; s.heightTopPart = '200'; s.upperGrilleNetImage = '/net.png'
    s.openingOrientation = { hingeSide: 'right', opensOutward: false }
    s.colorShieldHex = '#315c2b'
    const w = mount(Type9Drawing)
    const base = w.getComponent({ name: 'WicketBaseDrawing' })
    expect(base.props('geometry').outerFrame.left.width).toBe(50)
    expect(base.props('geometry').hinges).toHaveLength(4)
    expect(w.get('[data-testid="type9-net"] image').attributes('href')).toBe('/net.png')
    expect(w.get('[data-testid="type9-jumper-background"]').attributes('fill')).toBe('none')
    expect(w.get('[data-position="6"]').attributes('fill')).toBe('#315c2b')
    await w.get('[data-testid="type9-view-yard"]').setValue()
    expect(base.props('yard')).toBe(true)
    expect(w.get('[data-testid="type9-jumper-foreground"]').attributes('fill')).toBe('#315c2b')
    expect(w.findAll('[data-position="6"]')).toHaveLength(3)
  })

})
