import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import { getType2ProfnastilFormOptions, getProfnastilColors, saveWicketData } from '../../../app/api/wicket'
import type { ProfnastilFormOptions } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T2ProfnastilForm from './T2ProfnastilForm.vue'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  getType2ProfnastilFormOptions: vi.fn(),
  getProfnastilColors: vi.fn(),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 1 }),
}))

const Select = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items', 'disabled'],
  emits: ['update:modelValue'],
  setup: () => () => h('div'),
})
const Input = defineComponent({
  name: 'B24InputMenu',
  props: ['modelValue', 'items', 'disabled', 'valueKey', 'createItem'],
  emits: ['update:modelValue', 'create'],
  setup: () => () => h('div'),
})
let response: ProfnastilFormOptions

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
  response = {
    profiles: [{ id: 901, name: 'Профиль' }, { id: 902, name: 'Профиль' }],
    coatings: [
      { id: 707, drawingProfile: { kind: 'mp10' }, drawingProfileProblem: null, name: 'Любое покрытие', profnastilId: 21, manufacturerId: 71, manufacturerName: 'Любое имя', thickness: '0.45', isDoubleSided: true, coatingHex: null, coatingImage: null, reliefImage: null },
      { id: 707, drawingProfile: { kind: 'c20' }, drawingProfileProblem: null, name: 'Любое покрытие', profnastilId: 22, thickness: '0.50', isDoubleSided: true, coatingHex: null, coatingImage: null, reliefImage: null },
    ],
    manufacturers: [],
    colors: [{ id: 604, name: 'Цвет', hex: '#000000', image: null }, { id: 603, name: 'Цвет', label: 'Цвет - Белый', hex: '#ffffff', image: null }],
  }
  vi.mocked(getType2ProfnastilFormOptions).mockResolvedValue(response)
  vi.mocked(getProfnastilColors).mockImplementation(async () => ({ colors: response.colors }))
})

function render(side: 'facade' | 'yard' = 'facade') {
  return mount(T2ProfnastilForm, { props: { side }, global: { stubs: { B24SelectMenu: Select, SelectMenu: Select, B24InputMenu: Input, InputMenu: Input } } })
}

it.each(['context', 'unmount'] as const)('updates profile before awaiting options and ignores stale continuation after %s', async mode => {
  const wrapper = render()
  await flushPromises()
  let resolve!: (value: ProfnastilFormOptions) => void
  vi.mocked(getType2ProfnastilFormOptions).mockReturnValueOnce(new Promise(done => { resolve = done }))
  wrapper.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  const calc = useCalculation()
  expect(calc.fillingProfileFacade.value).toEqual({ kind: 'mp10' })
  expect(calc.thicknessFacade.value).toBe('0.45')
  expect(calc.typeOfCoatingFacade.value).toBe('Любое покрытие')
  if (mode === 'context') calc.productRowId.value = 99
  else wrapper.unmount()
  calc.idFacade.value = 999
  calc.fillingProfileFacade.value = { kind: 'mp20' }
  calc.colorFacade.value = 'Новый цвет'
  resolve(response)
  await flushPromises()
  expect(calc.idFacade.value).toBe(999)
  expect(calc.fillingProfileFacade.value).toEqual({ kind: 'mp20' })
  expect(calc.colorFacade.value).toBe('Новый цвет')
  expect(saveWicketData).not.toHaveBeenCalled()
})

it('restores profile and thickness variant by IDs despite stale or duplicate names', async () => {
  const wrapper = render()
  await flushPromises()
  expect(getType2ProfnastilFormOptions).toHaveBeenCalledWith(901, 707)
  const selects = wrapper.findAllComponents(Select)
  expect(selects[0]?.props('modelValue')).toBe(901)
  expect(selects[1]?.props('modelValue')).toBe(22)
  expect(selects[1]?.props('items')).toEqual([
    { id: 21, label: 'Любое покрытие — 0.45 мм' }, { id: 22, label: 'Любое покрытие — 0.50 мм' },
  ])
})

it.each(['facade', 'yard'] as const)('keeps %s profile selection and reset independent of the opposite side', async side => {
  const calc = useCalculation()
  calc.profileTypeYardId.value = 901
  calc.typeOfCoatingYardId.value = 707
  calc.materialYardGlob.value = 'Профлист'
  const target = side === 'facade' ? calc.fillingProfileFacade : calc.fillingProfileYard
  const opposite = side === 'facade' ? calc.fillingProfileYard : calc.fillingProfileFacade
  opposite.value = { kind: 'mp20' }
  const wrapper = render(side)
  await flushPromises()
  wrapper.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  expect(target.value).toEqual({ kind: 'mp10' })
  expect(opposite.value).toEqual({ kind: 'mp20' })
  wrapper.findAllComponents(Select)[0]?.vm.$emit('update:modelValue', 902)
  await flushPromises()
  expect(target.value).toBeNull()
  expect(opposite.value).toEqual({ kind: 'mp20' })
  wrapper.unmount()
})

it('can select yard metadata while a facade catalog request is still pending', async () => {
  const calc = useCalculation()
  calc.profileTypeYardId.value = 901
  calc.typeOfCoatingYardId.value = 707
  calc.materialYardGlob.value = 'Профлист'
  const facade = render()
  await flushPromises()
  let resolve!: (value: ProfnastilFormOptions) => void
  vi.mocked(getType2ProfnastilFormOptions).mockReturnValueOnce(new Promise(done => { resolve = done }))
  facade.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 22)
  await flushPromises()
  const yard = render('yard')
  await flushPromises()
  yard.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  expect(calc.fillingProfileYard.value).toEqual({ kind: 'mp10' })
  expect(calc.fillingProfileFacade.value).toEqual({ kind: 'c20' })
  resolve(response)
  await flushPromises()
  expect(calc.fillingProfileYard.value).toEqual({ kind: 'mp10' })
  expect(calc.fillingProfileFacade.value).toEqual({ kind: 'c20' })
  facade.unmount()
  yard.unmount()
})

it('selects a material variant without confusing the shared coating ID', async () => {
  const wrapper = render()
  await flushPromises()
  wrapper.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  const calc = useCalculation()
  expect(calc.idFacade.value).toBe(21)
  expect(calc.fillingProfileFacade.value).toEqual({ kind: 'mp10' })
  expect(calc.fillingProfileFacadeProblem.value).toBeNull()
  expect(calc.thicknessFacade.value).toBe('0.45')
  expect(calc.typeOfCoatingFacade.value).toBe('Любое покрытие')
  expect(saveWicketData).not.toHaveBeenCalled()
  expect(wrapper.findAllComponents(Select)[2]?.props('items')).toContainEqual({ id: 603, label: 'Цвет - Белый', hex: '#ffffff' })
  wrapper.findAllComponents(Select)[2]?.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idFacade: 21, materialFacade: 'Профиль', typeOfCoatingFacade: 'Любое покрытие', colorFacadeId: 603 }))
})

it('keeps a chosen dictionary color ID when another color has the same name', async () => {
  const wrapper = render()
  await flushPromises()
  wrapper.findAllComponents(Select)[2]?.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(useCalculation().colorFacade.value).toBe('Цвет')
  expect(useCalculation().colorFacadeId.value).toBe(603)
  expect(useCalculation().colorFacadeHex.value).toBe('#ffffff')
})

it('shows a legacy-selection diagnostic instead of silently choosing a material', async () => {
  useCalculation().loadFromApi({ materialSelectionProblems: [{ side: 'facade', reason: 'ambiguous', message: 'Найдено несколько материалов. Выберите заново.' }] })
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('Найдено несколько материалов. Выберите заново.')
  expect(await (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
})

async function validate(wrapper: ReturnType<typeof render>) {
  return (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()
}

it.each(['none', 'combobox', 'broken', undefined])('ignores legacy mode %s on hydration and requires an assigned palette color', async mode => {
  response.coatings.forEach(item => Object.assign(item, { colorInputMode: mode }))
  useCalculation().colorFacadeId.value = null
  useCalculation().colorFacade.value = 'Историческая текстура'
  const wrapper = render()
  await flushPromises()
  expect(wrapper.findAllComponents(Select)).toHaveLength(3)
  expect(wrapper.findComponent(Input).exists()).toBe(false)
  expect(await validate(wrapper)).toBe(false)
  expect(useCalculation().colorFacade.value).toBe('Историческая текстура')
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.findAllComponents(Select)[2]!.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(await validate(wrapper)).toBe(true)
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ colorFacadeId: 603 }))
  wrapper.unmount()
})

it('reports an empty list without switching to free text', async () => {
  response.colors = []
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('нет доступных цветов')
  expect(wrapper.findComponent(Input).exists()).toBe(false)
  expect(await validate(wrapper)).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
})

it.each(['list', 'combobox', 'none'] as const)('keeps an unavailable saved ID visible in %s without replacing it by label', async mode => {
  response.coatings.forEach(item => Object.assign(item, { colorInputMode: mode }))
  useCalculation().colorFacadeId.value = 999
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('недоступен')
  expect(await validate(wrapper)).toBe(false)
  expect(useCalculation().colorFacadeId.value).toBe(999)
  const items = wrapper.findAllComponents(Select)[2]!.props('items')
  expect(items).toContainEqual({ id: 999, label: 'Цвет (недоступен)', disabled: true })
  expect(saveWicketData).not.toHaveBeenCalled()
})

it('shows a load error and blocks submission without changing historical state', async () => {
  vi.mocked(getType2ProfnastilFormOptions).mockRejectedValue(new Error('Справочник недоступен'))
  const wrapper = render()
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось загрузить справочник')
  expect(await validate(wrapper)).toBe(false)
  expect(saveWicketData).not.toHaveBeenCalled()
  expect(useCalculation().colorFacadeId.value).toBe(603)
})

it.each(['facade', 'yard'] as const)('inherits %s manufacturer only when material changes', async side => {
  const calc = useCalculation()
  calc.loadFromApi({ idYard: 22, profileTypeYardId: 901, typeOfCoatingYardId: 707, colorYardId: 603, materialYardGlob: 'Профлист' })
  calc.manufacturerFacadeId.value = 99
  calc.manufacturerYardId.value = 98
  const target = side === 'facade' ? calc.manufacturerFacadeId : calc.manufacturerYardId
  const opposite = side === 'facade' ? calc.manufacturerYardId : calc.manufacturerFacadeId
  const wrapper = render(side)
  await flushPromises()
  expect(wrapper.text()).not.toContain('Производитель')
  expect(target.value).toBe(side === 'facade' ? 99 : 98)
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.findAllComponents(Select)[1]!.vm.$emit('update:modelValue', 21)
  await flushPromises()
  expect(target.value).toBe(71)
  expect(opposite.value).toBe(side === 'facade' ? 98 : 99)
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.findAllComponents(Select)[2]!.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ [side === 'facade' ? 'manufacturerFacadeId' : 'manufacturerYardId']: 71 }))
  wrapper.unmount()
})

it('does not treat an unselected material as a broken mode or select a default', async () => {
  const calc = useCalculation()
  calc.idFacade.value = ''
  calc.profileTypeFacadeId.value = null
  calc.typeOfCoatingFacadeId.value = null
  calc.colorFacadeId.value = null
  calc.colorFacade.value = ''
  const wrapper = render()
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.findAllComponents(Select)).toHaveLength(3)
  expect(await validate(wrapper)).toBe(false)
  expect(calc.idFacade.value).toBe('')
  expect(saveWicketData).not.toHaveBeenCalled()
})

it('does not save a changed material which disappears on options reload', async () => {
  const wrapper = render()
  await flushPromises()
  vi.mocked(getType2ProfnastilFormOptions).mockResolvedValueOnce({ ...response, coatings: [] })
  wrapper.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('материал недоступен')
  expect(saveWicketData).not.toHaveBeenCalled()
  expect(await validate(wrapper)).toBe(false)
})

it('loads the actual material palette independently of the coating palette', async () => {
  vi.mocked(getProfnastilColors).mockResolvedValue({ colors: [{ id: 909, name: 'Палитра материала', hex: null, image: null }] })
  const wrapper = render()
  await flushPromises()
  expect(getProfnastilColors).toHaveBeenLastCalledWith('2', 22)
  expect(wrapper.findAllComponents(Select)[2]?.props('items')).toContainEqual({ id: 909, label: 'Палитра материала', hex: null })
  expect(wrapper.findAllComponents(Select)[2]?.props('items')).not.toContainEqual(expect.objectContaining({ id: 604 }))
  expect(useCalculation().colorFacadeId.value).toBe(603)
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.unmount()
})

it.each(['none', 'combobox'] as const)('requires the material palette for new %s coating selections', async mode => {
  response.coatings.forEach(item => Object.assign(item, { colorInputMode: mode }))
  const wrapper = render()
  await flushPromises()
  wrapper.findAllComponents(Select)[1]?.vm.$emit('update:modelValue', 21)
  await flushPromises()
  expect(wrapper.findComponent(Input).exists()).toBe(false)
  expect(wrapper.findAllComponents(Select)).toHaveLength(3)
  expect(saveWicketData).not.toHaveBeenCalled()
  expect(await validate(wrapper)).toBe(false)
  wrapper.unmount()
})

it('keeps palette validation and saved IDs stable after all captions are renamed', async () => {
  response.profiles.forEach(item => { item.name = 'Новая подпись профиля' })
  response.coatings.forEach(item => { item.name = 'Новая подпись покрытия' })
  response.colors.forEach(item => { item.name = 'Новая подпись цвета'; item.label = 'Новая подпись цвета' })
  const wrapper = render()
  await flushPromises()
  expect(await validate(wrapper)).toBe(true)
  wrapper.findAllComponents(Select)[2]!.vm.$emit('update:modelValue', 604)
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining({ idFacade: 22, colorFacadeId: 604, colorFacade: 'Новая подпись цвета' }))
  wrapper.unmount()
})
