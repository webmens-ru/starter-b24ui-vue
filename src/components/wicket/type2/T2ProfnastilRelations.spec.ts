import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import { getType2ProfnastilFormOptions, saveWicketData } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T2ProfnastilForm from './T2ProfnastilForm.vue'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  getType2ProfnastilFormOptions: vi.fn(),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 1 }),
}))

const Select = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items', 'disabled'],
  emits: ['update:modelValue'],
  setup: () => () => h('div'),
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  const calc = useCalculation()
  calc.reset()
  calc.orderId.value = 42
  calc.number.value = 42
  calc.productRowId.value = 7
  calc.modelId.value = '2'
  calc.loadFromApi({
    modelId: '2', idFacade: 22, materialFacadeGlob: 'Профлист',
    materialFacade: 'Старая подпись профиля', typeOfCoatingFacade: 'Старая подпись покрытия',
    profileTypeFacadeId: 901, typeOfCoatingFacadeId: 707,
    colorFacadeId: 603, colorFacade: 'Цвет',
  })
  vi.mocked(getType2ProfnastilFormOptions).mockResolvedValue({
    profiles: [{ id: 901, name: 'Профиль' }, { id: 902, name: 'Профиль' }],
    coatings: [
      { id: 707, name: 'Глянец', profnastilId: 21, thickness: '0.45', colorInputMode: 'list', isDoubleSided: true, coatingHex: null, coatingImage: null, reliefImage: null },
      { id: 707, name: 'Глянец', profnastilId: 22, thickness: '0.50', colorInputMode: 'list', isDoubleSided: true, coatingHex: null, coatingImage: null, reliefImage: null },
    ],
    manufacturers: [],
    colors: [{ id: 604, name: 'Цвет', hex: '#000000', image: null }, { id: 603, name: 'Цвет', hex: '#ffffff', image: null }],
  })
})

function render() {
  return mount(T2ProfnastilForm, { props: { side: 'facade' }, global: { stubs: { B24SelectMenu: Select, SelectMenu: Select, B24InputMenu: Select, InputMenu: Select } } })
}

it('restores profile and thickness variant by IDs despite stale or duplicate names', async () => {
  const wrapper = render()
  await flushPromises()
  expect(getType2ProfnastilFormOptions).toHaveBeenCalledWith(901, 707)
  const selects = wrapper.findAllComponents(Select)
  expect(selects[1]?.props('modelValue')).toBe(901)
  expect(selects[2]?.props('modelValue')).toBe(22)
  expect(selects[2]?.props('items')).toEqual([
    { id: 21, label: 'Глянец — 0.45 мм' }, { id: 22, label: 'Глянец — 0.50 мм' },
  ])
})

it('selects a material variant without confusing the shared coating ID', async () => {
  const wrapper = render()
  await flushPromises()
  wrapper.findAllComponents(Select)[2]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  const calc = useCalculation()
  expect(calc.idFacade.value).toBe(21)
  expect(calc.thicknessFacade.value).toBe('0.45')
  expect(calc.typeOfCoatingFacade.value).toBe('Глянец')
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idFacade: 21, materialFacade: 'Профиль', typeOfCoatingFacade: 'Глянец' }))
})

it('keeps a chosen dictionary color ID when another color has the same name', async () => {
  const wrapper = render()
  await flushPromises()
  wrapper.findAllComponents(Select)[3]?.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(useCalculation().colorFacadeId.value).toBe(603)
  expect(useCalculation().colorFacadeHex.value).toBe('#ffffff')
})

it('shows a legacy-selection diagnostic instead of silently choosing a material', async () => {
  useCalculation().loadFromApi({ materialSelectionProblems: [{ side: 'facade', reason: 'ambiguous', message: 'Найдено несколько материалов. Выберите заново.' }] })
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('Найдено несколько материалов. Выберите заново.')
})
