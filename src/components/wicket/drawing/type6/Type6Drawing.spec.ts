import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from '../drawingRegistry'
import WicketBaseDrawing from '../WicketBaseDrawing.vue'

describe('type 6 drawing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const s = useWicketFormStore()
    s.widthProyema = '1000'; s.heightProyema = '2000'; s.clearanceProyema = '50'
    s.hasStolby = 0; s.postProfile = null; s.jumperPlacement = 'none'; s.jumperProfile = null
    s.openingOrientation = { hingeSide: 'left', opensOutward: true }
    s.fillSide = 1; s.idFacade = 10; s.raspolozheniyePolotna = 'horizontal'
    s.colorFacadeHex = '#123456'; s.colorFacadeReverseHex = '#654321'
  })
  const draw = () => mount(resolveDrawingComponent('6')!)
  it.each([[700, 1500], [1000, 2000]])('draws only the common 60 mm frame at %s×%s with 5 mm filling clearance', (width, height) => {
    const s = useWicketFormStore(); s.widthProyema = String(width); s.heightProyema = String(height)
    const w = draw()
    expect(w.find('[data-testid="type6-drawing-svg"]').exists()).toBe(true)
    const base = w.getComponent(WicketBaseDrawing).props('geometry')
    expect(base.outerFrame.left.width).toBe(60)
    expect(base.outerFrame.right.width).toBe(60)
    expect(w.findAll('[data-position="4"], [data-position="5"], [data-position="6"], [data-position="8"], [data-position="10"]')).toHaveLength(0)
    expect(w.findAll('[data-testid="type6-subtype-rail"]')).toHaveLength(0)
    const fill = w.get('[data-testid="filling-surface"]')
    expect(Number(fill.attributes('x'))).toBe(base.gate.x + 65)
    expect(Number(fill.attributes('y'))).toBe(base.gate.y + 65)
    expect(Number(fill.attributes('width'))).toBe(base.gate.width - 130)
    expect(Number(fill.attributes('height'))).toBe(base.gate.height - 130)
  })
  it('mirrors the yard view and preserves reverse, independent yard and schematic colors and hidden filling', async () => {
    const s = useWicketFormStore()
    const w = draw()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#123456')
    await w.get('[data-testid="type6-view-yard"]').setValue()
    expect(w.get('svg > g').attributes('transform')).toBe('translate(1000 0) scale(-1 1)')
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#654321')
    s.fillSide = 2; s.idYard = 20; s.colorYardHex = '#abcdef'
    await w.vm.$nextTick()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#abcdef')
    await w.get('[data-testid="type6-color-schematic"]').setValue()
    expect(w.get('[data-testid="filling-surface"]').attributes('fill')).toBe('#bfdbfe')
    await w.get('[data-testid="type6-show-fill"]').setValue(false)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
  })
  it.each([['lowerNet', 1], ['upperNet', 1], ['upperAndLowerNet', 2], ['sideNet', 1]] as const)('keeps common subtype dividers for %s', (shieldType, rails) => {
    const s = useWicketFormStore(); s.shieldType = shieldType; s.grilleLocation = 'hinge'
    const w = draw()
    expect(w.findAll('[data-testid="type6-subtype-rail"]')).toHaveLength(rails)
    expect(w.findAll('[data-testid="type6-net"]')).toHaveLength(rails)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(true)
  })
  it.each(['left', 'right'] as const)('keeps common hinge layering for the %s hinge side and both opening directions', async hingeSide => {
    const s = useWicketFormStore()
    for (const opensOutward of [true, false]) {
      s.openingOrientation = { hingeSide, opensOutward }
      const w = draw()
      const behind = () => w.html().indexOf('data-testid="type6-hinges"') < w.html().indexOf('data-testid="type6-outer-frame"')
      expect(behind()).toBe(!opensOutward)
      await w.get('[data-testid="type6-view-yard"]').setValue()
      expect(behind()).toBe(opensOutward)
      w.unmount()
    }
  })
  it('keeps rear jumper dashed from the street and in the yard foreground', async () => {
    const s = useWicketFormStore(); s.jumperPlacement = 'behind'; s.jumperProfile = { sizeA: 60, sizeB: 60 }
    const w = draw()
    expect(w.get('[data-testid="type6-jumper-background"]').attributes('stroke-dasharray')).toBe('12 8')
    await w.get('[data-testid="type6-view-yard"]').setValue()
    expect(w.find('[data-testid="type6-jumper-background"]').exists()).toBe(false)
    expect(w.get('[data-testid="type6-jumper-foreground"]').attributes('stroke-dasharray')).toBeUndefined()
  })
  it('keeps supplied mesh imagery and its one millimetre space allowance', async () => {
    const s = useWicketFormStore(); s.shieldType = 'upperNet'; s.heightTopPart = '300'
    s.upperGrilleNetImage = '/mesh.png'; s.netWidthProviderTop = ''
    const w = draw()
    expect(w.get('[data-testid="type6-net"] image').attributes('href')).toBe('/mesh.png')
    const emptyY = Number(w.get('[data-testid="filling-surface"]').attributes('y'))
    s.netWidthProviderTop = '1000'
    await w.vm.$nextTick()
    expect(Number(w.get('[data-testid="filling-surface"]').attributes('y'))).toBe(emptyY + 1)
  })
  it('ignores a stale orientation when filling is absent', () => {
    const s = useWicketFormStore(); s.fillSide = 0; s.raspolozheniyePolotna = ''
    const w = draw()
    expect(w.find('[data-testid="type6-drawing-svg"]').exists()).toBe(true)
    expect(w.find('[data-testid="filling-surface"]').exists()).toBe(false)
  })
})
