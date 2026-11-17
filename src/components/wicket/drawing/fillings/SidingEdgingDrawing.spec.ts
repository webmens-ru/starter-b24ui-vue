import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import SidingEdgingDrawing from './SidingEdgingDrawing.vue'

it('overlaps full-length vertical strips with square horizontal strips, without mitres', () => {
  const wrapper = mount(SidingEdgingDrawing, { props: {
    area: { x: 10, y: 20, width: 700, height: 1500 }, width: 30, color: '#abc',
  } })
  expect(wrapper.findAll('polygon')).toHaveLength(0)
  expect(wrapper.findAll('rect').map(rect => ['x', 'y', 'width', 'height'].map(key => Number(rect.attributes(key))))).toEqual([
    [10, 20, 30, 1500], [680, 20, 30, 1500],
    [10, 20, 700, 30], [10, 1490, 700, 30],
  ])
})
