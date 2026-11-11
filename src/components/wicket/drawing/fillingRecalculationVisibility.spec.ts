import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import { useWicketFormStore } from '../../../stores/wicket/wicketFormStore'
import { resolveDrawingComponent } from './drawingRegistry'

it.each(['3'])('hides stale filling for type%s while keeping the frame and material choices', async modelId => {
  setActivePinia(createPinia())
  const store = useWicketFormStore()
  store.widthProyema = '1000'; store.heightProyema = '2000'; store.clearanceProyema = '50'
  store.hasStolby = 0; store.postProfile = null; store.jumperPlacement = 'none'; store.jumperProfile = null
  store.openingOrientation = { hingeSide: 'left', opensOutward: true }
  store.shieldType = 'noNet'; store.raspolozheniyePolotna = 'vertical'; store.fillSide = 2
  store.idFacade = 10; store.idYard = 20; store.thicknessFacade = store.thicknessYard = '100'
  store.fillingProfileFacade = store.fillingProfileYard = { kind: 'c8' }
  store.layingFacadeCode = store.layingYardCode = 'gap'; store.gapName = store.gapYardMm = 28
  store.numberOfSticks = 6; store.numberOfSticksYard = 5
  store.colorFacadeHex = '#123456'; store.colorYardHex = '#654321'
  const wrapper = mount(resolveDrawingComponent(modelId)!)
  const filling = '[data-testid="filling-surface"], [data-testid="type3-picket"], [data-testid="type3-opposite-picket"], [data-testid="type4-lamella"]'
  expect(wrapper.find('svg').exists()).toBe(true)
  expect(wrapper.findAll(filling).length).toBeGreaterThan(0)
  store.fillingNeedsRecalculation = true
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll(filling)).toHaveLength(0)
  expect(wrapper.find(`[data-testid="type${modelId}-outer-frame"], [data-testid="type${modelId}-drawing-frame"]`).exists()).toBe(true)
  const yard = wrapper.find(`[data-testid="type${modelId}-view-yard"], [data-testid="type${modelId}-drawing-view-yard"]`)
  expect(yard.exists()).toBe(true)
  await yard.setValue()
  expect(wrapper.findAll(filling)).toHaveLength(0)
  expect(wrapper.find(`[data-testid="type${modelId}-outer-frame"], [data-testid="type${modelId}-drawing-frame"]`).exists()).toBe(true)
  expect(store.idFacade).toBe(10); expect(store.idYard).toBe(20)
  store.fillingNeedsRecalculation = false
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll(filling).length).toBeGreaterThan(0)
  wrapper.unmount()
})
