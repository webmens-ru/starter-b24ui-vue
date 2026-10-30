import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalculation } from '../../../composables/useCalculation'
import T2FillSide from './T2FillSide.vue'
import Type2 from '../../../pages/wicket/Type2.vue'

const apiMocks = vi.hoisted(() => ({
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../../app/api/wicket', async importOriginal => ({
  ...await importOriginal<typeof import('../../../app/api/wicket')>(),
  saveWicketData: apiMocks.saveWicketData,
  recalculate: apiMocks.recalculate,
}))

const WizardStub = defineComponent({
  name: 'WicketWizardPage',
  props: ['stepComponents', 'route'],
  template: '<div />',
})

describe('Type 2 historical siding correction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.orderId.value = 42
    calc.productRowId.value = 72
    calc.modelId.value = '2'
    calc.materialFacadeGlob.value = 'siding'
    apiMocks.saveWicketData.mockReset()
    apiMocks.saveWicketData.mockResolvedValue({ lockVersion: 1 })
    apiMocks.recalculate.mockReset()
  })

  it('returns historical siding steps to filling selection', () => {
    const wrapper = mount(Type2, {
      global: { stubs: { WicketWizardPage: WizardStub } },
    })
    const steps = wrapper.getComponent(WizardStub).props('stepComponents') as Record<string, unknown>

    expect(steps.page2_facade_siding).toBe(T2FillSide)
    expect(steps.page2_yard_siding).toBe(T2FillSide)
  })

  it('corrects historical facade siding and preserves the independently configured yard', async () => {
    const calc = useCalculation()
    calc.fillSide.value = 2
    calc.materialFacadeGlob.value = 'siding'
    calc.materialYardGlob.value = 'profnastil'
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

    expect(calc.materialFacadeGlob.value).toBe('profnastil')
    expect(calc.materialYardGlob.value).toBe('profnastil')
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
      materialYardGlob: 'profnastil',
    })
  })

  it('preserves facade product and appearance fields when only the yard material changes', async () => {
    const calc = useCalculation()
    calc.fillSide.value = 2
    calc.materialFacadeGlob.value = 'profnastil'
    calc.idFacade.value = 27
    calc.materialFacade.value = 'Бревно Type 2'
    calc.formFacade.value = 'Гладкая'
    calc.thicknessFacade.value = '0.45'
    calc.typeOfCoatingFacade.value = 'Глянец'
    calc.manufacturerFacadeId.value = 13
    calc.colorFacadeId.value = 18
    calc.colorFacade.value = 'RAL 7016'
    calc.materialYardGlob.value = 'siding'
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
