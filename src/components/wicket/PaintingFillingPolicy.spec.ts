import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useCalculation } from '../../composables/useCalculation'
import PaintingProviders from './PaintingProviders.vue'

beforeEach(() => setActivePinia(createPinia()))
it.each([1, 2] as const)('switches customer to manufacturer synchronously when filling becomes %s', count => {
  const calc = useCalculation()
  calc.fillSide.value = 0
  calc.doesPaintingFrame.value = 'customer'
  calc.fillSide.value = count
  expect(calc.doesPaintingFrame.value).toBe('manufacturer')
})
it.each([1, 2] as const)('does not offer customer painting with %s filling sides', count => {
  const calc = useCalculation()
  calc.fillSide.value = count
  const wrapper = mount(PaintingProviders)
  expect(wrapper.find('input[value="customer"]').exists()).toBe(false)
  expect(wrapper.find('input[value="manufacturer"]').exists()).toBe(true)
  wrapper.unmount()
})
it('keeps customer available without filling and does not restore it automatically', () => {
  const calc = useCalculation()
  calc.fillSide.value = 0
  calc.doesPaintingFrame.value = 'customer'
  const wrapper = mount(PaintingProviders)
  expect(wrapper.find('input[value="customer"]').exists()).toBe(true)
  expect(calc.doesPaintingFrame.value).toBe('customer')
  calc.fillSide.value = 1
  calc.fillSide.value = 0
  expect(calc.doesPaintingFrame.value).toBe('manufacturer')
  wrapper.unmount()
})
it.each([0, 1, 2])('restores the correct performer for loaded side count %s', count => {
  const calc = useCalculation()
  calc.loadFromApi({ fillingSideCount: count, doesPaintingFrameCode: 'customer' })
  expect(calc.doesPaintingFrame.value).toBe(count === 0 ? 'customer' : 'manufacturer')
})
it('updates a renamed summary through semantic codes when adding filling', () => {
  const calc = useCalculation()
  calc.fillSide.value = 0
  calc.doesPaintingFrame.value = 'customer'
  calc.data.value = [{ blockCode: 'painting', blockName: 'Renamed block', params: [
    { paramCode: 'paintingPerformer', name: 'Renamed parameter', value: 'old' },
  ] }]
  calc.fillSide.value = 2
  expect(calc.data.value[0]?.params[0]).toEqual({ paramCode: 'paintingPerformer', name: 'Renamed parameter', value: 'Выполняет изготовитель' })
})
