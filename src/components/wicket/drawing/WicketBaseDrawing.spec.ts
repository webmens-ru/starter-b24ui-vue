import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WicketBaseDrawing from './WicketBaseDrawing.vue'
import { computeWicketBase } from './wicketBaseGeometry'

describe('WicketBaseDrawing layers', () => {
  for (const opensOutward of [false, true]) for (const yard of [false, true]) for (const hingeSide of ['left', 'right'] as const) {
    it(`orders the complete assembly: ${opensOutward}/${yard}/${hingeSide}`, () => {
      const orientation = { opensOutward, hingeSide }
      const geometry = computeWicketBase({ profileSize: 50, openingWidth: 900, hasPosts: true, postWidth: 80, orientation, vertical: { visible: false, placement: 'above', railY: 0, gateY: 0, gateHeight: 1950, postY: 0, postHeight: 2000 } })
      const wrapper = mount(WicketBaseDrawing, { props: { geometry, orientation, yard, color: '#315c2b', testPrefix: 'base' }, slots: { background: '<g data-testid="background" />', inner: '<g data-testid="inner" />', foreground: '<g data-testid="foreground" />' } })
      const html = wrapper.html()
      const index = (id: string) => html.indexOf(`data-testid="${id}"`)
      const behind = !opensOutward !== yard
      expect(index('base-hinges') < index('base-outer-frame')).toBe(behind)
      expect(index('base-hinges') < index('base-posts')).toBe(behind)
      expect(index('base-strip') < index('base-outer-frame')).toBe(yard)
      expect(index('background')).toBeLessThan(index('inner'))
      expect(index('inner')).toBeLessThan(index('base-outer-frame'))
      expect(index('base-strip')).toBeLessThan(index('foreground'))
      expect(wrapper.get('[data-testid="base-posts"]').attributes('fill')).toBe('#315c2b')
      wrapper.unmount()
    })
  }
})
