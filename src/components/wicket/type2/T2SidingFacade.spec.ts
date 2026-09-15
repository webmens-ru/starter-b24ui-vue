import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SidingRow } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import SidingFacade from '../type1/SidingFacade.vue'
import SidingYard from '../type1/SidingYard.vue'
import T2FillSide from './T2FillSide.vue'
import Type2 from '../../../pages/wicket/Type2.vue'

const apiMocks = vi.hoisted(() => ({
  getSidingTable: vi.fn(),
  getFillingAppearanceOptions: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  getSidingTable: apiMocks.getSidingTable,
  getFillingAppearanceOptions: apiMocks.getFillingAppearanceOptions,
  saveWicketData: apiMocks.saveWicketData,
  recalculate: apiMocks.recalculate,
}))

const SelectMenuStub = defineComponent({
  name: 'B24SelectMenu',
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `
    <select :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">Не выбран</option>
      <option v-for="item in items" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
  `,
})

const WizardStub = defineComponent({
  name: 'WicketWizardPage',
  props: ['stepComponents', 'route'],
  template: '<div />',
})

const row: SidingRow = {
  id: 27,
  material: 'Бревно Type 2',
  form: 'Гладкая',
  typeOfCoating: 'Глянец',
}

function mountSidingFacade() {
  return mount(SidingFacade, {
    global: {
      stubs: {
        B24Button: true,
        Button: true,
        B24Modal: true,
        Modal: true,
        B24SelectMenu: SelectMenuStub,
        SelectMenu: SelectMenuStub,
        FilterDropdown: true,
      },
    },
  })
}

describe('Type 2 siding flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 72
    calc.modelId.value = '2'
    calc.materialFacadeGlob.value = 'Сайдинг'
    apiMocks.getSidingTable.mockReset()
    apiMocks.getSidingTable.mockResolvedValue({
      table: [row],
      pagination: { page: 1, pageSize: 100, totalCount: 1, pageCount: 1 },
    })
    apiMocks.getFillingAppearanceOptions.mockReset()
    apiMocks.getFillingAppearanceOptions.mockResolvedValue({
      manufacturers: [{ id: 13, name: 'Type 2 Профиль' }],
      colors: [{ id: 18, name: 'RAL 7016', hex: '#383E42', image: null }],
    })
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
  })

  it('uses the shared siding pages for facade and yard route steps', () => {
    const wrapper = mount(Type2, {
      global: { stubs: { WicketWizardPage: WizardStub } },
    })
    const steps = wrapper.getComponent(WizardStub).props('stepComponents') as Record<string, unknown>

    expect(steps.page2_facade_siding).toBe(SidingFacade)
    expect(steps.page2_yard_siding).toBe(SidingYard)
  })

  it('loads and saves siding appearance through the type-2 API context', async () => {
    const wrapper = mountSidingFacade()
    await flushPromises()

    await wrapper.get('tbody input[type="checkbox"]').setValue(true)
    await flushPromises()
    await wrapper.get('[data-testid="appearance-manufacturer"]').setValue('13')
    await wrapper.get('[data-testid="appearance-color"]').setValue('18')
    await flushPromises()

    expect(apiMocks.getSidingTable).toHaveBeenCalledWith('2', {
      materials: [],
      form: [],
      typeOfCoating: [],
    }, 1)
    expect(apiMocks.getFillingAppearanceOptions).toHaveBeenCalledWith('2', 'Сайдинг')
    const payload = apiMocks.saveWicketData.mock.calls[apiMocks.saveWicketData.mock.calls.length - 1]?.[0]
    expect(payload).toMatchObject({
      modelId: '2',
      idFacade: 27,
      manufacturerFacadeId: 13,
      colorFacadeId: 18,
      materialFacade: 'Бревно Type 2',
      formFacade: 'Гладкая',
      typeOfCoatingFacade: 'Глянец',
    })
  })

  it('offers siding and preserves an independently configured yard when the facade material changes', async () => {
    const calc = useCalculation()
    calc.fillSide.value = 'Две стороны'
    calc.materialFacadeGlob.value = 'Профлист'
    calc.materialYardGlob.value = 'Профлист'
    calc.idFacade.value = 1
    calc.manufacturerFacadeId.value = 3
    calc.colorFacadeId.value = 8
    calc.materialSupplierFacade.value = 'Старый фасад'
    calc.colorFacade.value = 'Старый цвет фасада'
    calc.colorFacadeHex.value = '#111111'
    calc.colorFacadeImage.value = '/old-facade.webp'
    calc.coatingFacadeHex.value = '#222222'
    calc.coatingFacadeImage.value = '/old-facade-coating.webp'
    calc.reliefFacadeImage.value = '/old-facade-relief.webp'
    calc.idYard.value = 2
    calc.manufacturerYardId.value = 4
    calc.colorYardId.value = 9
    calc.materialSupplierYard.value = 'Старый двор'
    calc.colorYard.value = 'Старый цвет двора'
    calc.colorYardHex.value = '#333333'
    calc.colorYardImage.value = '/old-yard.webp'
    calc.coatingYardHex.value = '#444444'
    calc.coatingYardImage.value = '/old-yard-coating.webp'
    calc.reliefYardImage.value = '/old-yard-relief.webp'

    const wrapper = mount(T2FillSide, {
      global: { stubs: { B24Button: true, Button: true } },
    })
    await flushPromises()

    const sidingInputs = wrapper.findAll('input[value="Сайдинг"]')
    expect(sidingInputs).toHaveLength(2)
    await sidingInputs[0]!.setValue(true)
    await flushPromises()

    expect(calc.materialFacadeGlob.value).toBe('Сайдинг')
    expect(calc.materialYardGlob.value).toBe('Профлист')
    expect({
      id: calc.idFacade.value,
      manufacturerId: calc.manufacturerFacadeId.value,
      colorId: calc.colorFacadeId.value,
      manufacturer: calc.materialSupplierFacade.value,
      color: calc.colorFacade.value,
      colorHex: calc.colorFacadeHex.value,
      colorImage: calc.colorFacadeImage.value,
      coatingHex: calc.coatingFacadeHex.value,
      coatingImage: calc.coatingFacadeImage.value,
      reliefImage: calc.reliefFacadeImage.value,
    }).toEqual({
      id: '',
      manufacturerId: null,
      colorId: null,
      manufacturer: '',
      color: '',
      colorHex: '',
      colorImage: '',
      coatingHex: '',
      coatingImage: '',
      reliefImage: '',
    })
    expect({
      id: calc.idYard.value,
      manufacturerId: calc.manufacturerYardId.value,
      colorId: calc.colorYardId.value,
      manufacturer: calc.materialSupplierYard.value,
      color: calc.colorYard.value,
      colorHex: calc.colorYardHex.value,
      colorImage: calc.colorYardImage.value,
      coatingHex: calc.coatingYardHex.value,
      coatingImage: calc.coatingYardImage.value,
      reliefImage: calc.reliefYardImage.value,
    }).toEqual({
      id: 2,
      manufacturerId: 4,
      colorId: 9,
      manufacturer: 'Старый двор',
      color: 'Старый цвет двора',
      colorHex: '#333333',
      colorImage: '/old-yard.webp',
      coatingHex: '#444444',
      coatingImage: '/old-yard-coating.webp',
      reliefImage: '/old-yard-relief.webp',
    })

    const payload = apiMocks.saveWicketData.mock.calls[apiMocks.saveWicketData.mock.calls.length - 1]?.[0]
    expect(payload).toMatchObject({
      idFacade: null,
      materialFacade: null,
      idYard: 2,
      manufacturerFacadeId: null,
      colorFacadeId: null,
      manufacturerYardId: 4,
      colorYardId: 9,
      materialYardGlob: 'Профлист',
    })
  })

  it('preserves facade product and appearance fields when only the yard material changes', async () => {
    const calc = useCalculation()
    calc.fillSide.value = 'Две стороны'
    calc.materialFacadeGlob.value = 'Сайдинг'
    calc.idFacade.value = 27
    calc.materialFacade.value = 'Бревно Type 2'
    calc.formFacade.value = 'Гладкая'
    calc.thicknessFacade.value = '0.45'
    calc.typeOfCoatingFacade.value = 'Глянец'
    calc.manufacturerFacadeId.value = 13
    calc.colorFacadeId.value = 18
    calc.colorFacade.value = 'RAL 7016'
    calc.materialYardGlob.value = 'Профлист'
    calc.idYard.value = 37
    calc.materialYard.value = 'С10'
    calc.formYard.value = 'Старое значение'
    calc.thicknessYard.value = '0.5'
    calc.typeOfCoatingYard.value = 'Полиэстер'
    calc.manufacturerYardId.value = 14
    calc.colorYardId.value = 19
    calc.colorYard.value = 'RAL 8017'

    const wrapper = mount(T2FillSide, {
      global: { stubs: { B24Button: true, Button: true } },
    })
    await flushPromises()
    apiMocks.saveWicketData.mockClear()

    await wrapper.findAll('input[value="Сайдинг"]')[1]!.setValue(true)
    await flushPromises()

    const payload = apiMocks.saveWicketData.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      idFacade: 27,
      materialFacade: 'Бревно Type 2',
      formFacade: 'Гладкая',
      thicknessFacade: '0.45',
      typeOfCoatingFacade: 'Глянец',
      manufacturerFacadeId: 13,
      colorFacadeId: 18,
      colorFacade: 'RAL 7016',
      idYard: null,
      materialYard: null,
      formYard: null,
      thicknessYard: null,
      typeOfCoatingYard: null,
      manufacturerYardId: null,
      colorYardId: null,
      colorYard: null,
    })
  })
})
