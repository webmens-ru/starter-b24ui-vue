import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from '../drawingRegistry'
import Type8Drawing from './Type8Drawing.vue'
describe('type 8 drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const s = useWicketFormStore()
    s.widthProyema = '1000'; s.heightProyema = '2000'; s.clearanceProyema = '50'
    s.hasStolby = 0; s.postProfile = null; s.jumperPlacement = 'none'; s.jumperProfile = null
    s.openingOrientation = { hingeSide: 'left', opensOutward: true }
    s.fillSide = 1; s.idFacade = 10; s.raspolozheniyePolotna = 'vertical'
    s.colorFacadeHex = '#123456'; s.colorFacadeReverseHex = '#654321'
  })
  it('registers model 8 and places street sheet above crossbar, yard crossbar above sheet', async () => {
    expect(resolveDrawingComponent('8')).toBe(Type8Drawing)
    const w = mount(Type8Drawing)
    expect(w.findAll('[data-position="6"]')).toHaveLength(1)
    expect(w.find('[data-position="4"], [data-position="5"], [data-position="8"], [data-position="10"]').exists()).toBe(false)
    expect(w.html().indexOf('data-position="6"')).toBeLessThan(w.html().indexOf('data-testid="filling-surface"'))
    await w.get('[data-testid="type8-view-yard"]').setValue()
    expect(w.html().indexOf('data-position="6"')).toBeGreaterThan(w.html().indexOf('data-testid="filling-surface"'))
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#654321')
    await w.get('[data-testid="type8-color-schematic"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    await w.get('[data-testid="type8-show-fill"]').setValue(false)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
    expect(w.findAll('[data-position="6"]')).toHaveLength(1)
  })
  it.each(['noNet', 'lowerNet', 'upperNet', 'upperAndLowerNet', 'sideNet'] as const)('keeps crossbar visible without filling and shared %s rails', async shieldType => {
    const s = useWicketFormStore(); s.shieldType = shieldType; s.grilleLocation = 'hinge'; s.fillSide = 0; s.raspolozheniyePolotna = ''
    const w = mount(Type8Drawing)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.findAll('[data-position="6"]')).toHaveLength(1)
    expect(w.findAll('[data-testid="type8-subtype-rail"]')).toHaveLength(w.findAll('[data-testid="type8-net"]').length)
    await w.get('[data-testid="type8-view-yard"]').setValue()
    expect(w.findAll('[data-position="6"]')).toHaveLength(1)
  })
})
