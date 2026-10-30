import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import { getProfnastilTable, getType2ProfnastilFormOptions, saveWicketData } from '../../../app/api/wicket'
import T2ProfnastilForm from './T2ProfnastilForm.vue'
import ProfnastilMaterialTable from '../shared/ProfnastilMaterialTable.vue'

vi.mock('../../../app/api/wicket', async original => ({
  ...(await original<typeof import('../../../app/api/wicket')>()),
  getProfnastilTable: vi.fn(), getType2ProfnastilFormOptions: vi.fn(),
  saveWicketData: vi.fn().mockResolvedValue({ lockVersion: 1 }),
}))
const Select = defineComponent({ name: 'B24SelectMenu', props: ['modelValue', 'items'], emits: ['update:modelValue'], setup: () => () => h('div') })
const row = { id: 17, profileTypeId: 901, typeOfCoatingId: 707, name: 'Любая подпись', material: 'Другой профиль', typeOfCoating: 'Другое покрытие', thickness: 0.45, drawingProfile: { kind: 'c8' as const }, drawingProfileProblem: null }

beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  const calc = useCalculation(); calc.reset()
  calc.orderId.value = 42; calc.productRowId.value = 7; calc.modelId.value = '2'
  calc.materialFacadeGlob.value = 'profnastil'; calc.materialYardGlob.value = 'profnastil'
  vi.mocked(getProfnastilTable).mockResolvedValue({ table: [row], pagination: { page: 1, pageSize: 100, pageCount: 1, totalCount: 1 } })
  vi.mocked(getType2ProfnastilFormOptions).mockResolvedValue({
    profiles: [{ id: 901, name: 'Переименованный профиль' }],
    coatings: [{ id: 707, profnastilId: 17, name: 'Переименованное покрытие', thickness: 0.45, colorInputMode: 'list', isDoubleSided: true, coatingHex: null, coatingImage: null, reliefImage: null, drawingProfile: { kind: 'c8' }, drawingProfileProblem: null }],
    manufacturers: [], colors: [{ id: 603, name: 'Цвет', hex: '#ffffff', image: null }],
  })
})

it.each(['facade', 'yard'] as const)('uses the shared table for %s and saves material and coating by ID after color selection', async side => {
  const calc = useCalculation()
  if (side === 'facade') calc.idYard.value = 99
  else calc.idFacade.value = 99
  const wrapper = mount(T2ProfnastilForm, { props: { side, tableMode: true }, global: { stubs: { B24SelectMenu: Select, SelectMenu: Select, FilterDropdown: true } } })
  await flushPromises()
  expect(wrapper.findComponent(ProfnastilMaterialTable).exists()).toBe(true)
  expect(wrapper.text()).toContain('Другой профиль')
  await wrapper.get('tbody input').setValue(true)
  await flushPromises()
  expect(saveWicketData).not.toHaveBeenCalled()
  wrapper.findAllComponents(Select).slice(-1)[0]!.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(saveWicketData).toHaveBeenLastCalledWith(expect.objectContaining(side === 'facade'
    ? { idFacade: 17, colorFacadeId: 603 } : { idYard: 17, colorYardId: 603 }))
  expect(side === 'facade' ? calc.idYard.value : calc.idFacade.value).toBe(99)
  wrapper.unmount()
})

it.each(['facade', 'yard'] as const)('clears only the repaired %s diagnostic when replacing a historical material', async side => {
  const calc = useCalculation()
  calc.materialSelectionProblems.value = [
    { side: 'facade', reason: 'missing', message: 'Старый фасад недоступен' },
    { side: 'yard', reason: 'missing', message: 'Старый двор недоступен' },
  ]
  const wrapper = mount(T2ProfnastilForm, { props: { side, tableMode: true }, global: { stubs: { B24SelectMenu: Select, SelectMenu: Select, FilterDropdown: true } } })
  await flushPromises()
  await wrapper.get('tbody input').setValue(true)
  await flushPromises()
  expect(calc.materialSelectionProblems.value.map(problem => problem.side)).toEqual([side === 'facade' ? 'yard' : 'facade'])
  wrapper.findAllComponents(Select).slice(-1)[0]!.vm.$emit('update:modelValue', 603)
  await flushPromises()
  expect(saveWicketData).toHaveBeenCalled()
  wrapper.unmount()
})
