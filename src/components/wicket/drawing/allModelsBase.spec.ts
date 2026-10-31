import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWicketFormStore } from '../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from './drawingRegistry'

const profiles = [60, 50, 50, 50, 60, 60, 50, 60, 50, 50, 50]
describe('shared base for all eleven models', () => {
  beforeEach(() => setActivePinia(createPinia()))
  for (const [index, profile] of profiles.entries()) {
    for (const hingeSide of ['left', 'right'] as const) {
      it(`renders model ${index + 1}, profile ${profile}, hinges ${hingeSide}`, async () => {
        const store = useWicketFormStore()
        store.widthProyema = '900'
        store.heightProyema = '2000'
        store.clearanceProyema = '50'
        store.hasStolby = 1
        store.postProfile = { sizeA: 80, sizeB: 80 }
        store.jumperPlacement = 'none'
        store.jumperProfile = null
        store.openingOrientation = { hingeSide, opensOutward: false }
        store.fillSide = 0
        store.colorShieldHex = '#315c2b'
        const component = resolveDrawingComponent(String(index + 1))
        expect(component).not.toBeNull()
        const wrapper = mount(component!)
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        const base = wrapper.getComponent({ name: 'WicketBaseDrawing' })
        expect(base.props('geometry').outerFrame.left.width).toBe(profile)
        expect(base.props('geometry').hinges).toHaveLength(4)
        expect(base.props('geometry').strip).toHaveLength(3)
        expect(base.props('geometry').posts.visible).toBe(true)
        const html = base.html()
        expect(html.indexOf('-hinges')).toBeLessThan(html.indexOf('-posts'))
        const yard = wrapper.find('input[value="yard"]')
        if (yard.exists()) await yard.setValue()
        else if (index === 3 || index === 4 || index === 5 || index === 6 || index === 7 || index === 8 || index === 9 || index === 10) await wrapper.get(`[data-testid="type${index + 1}-view-yard"]`).setValue()
        else await wrapper.get('[data-testid="base-view-yard"]').setValue()
        expect(base.props('yard')).toBe(true)
        const yardHtml = base.html()
        expect(yardHtml.indexOf('-hinges')).toBeGreaterThan(yardHtml.indexOf('-posts'))
        wrapper.unmount()
      })
    }
  }
})
