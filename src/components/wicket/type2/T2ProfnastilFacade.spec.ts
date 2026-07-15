import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProfnastilRow } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T2FillSide from './T2FillSide.vue'
import T2ProfnastilFacade from './T2ProfnastilFacade.vue'

const rows: ProfnastilRow[] = []

vi.mock('../../../app/api/wicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/api/wicket')>()
  return {
    ...actual,
    getProfnastilTable: vi.fn(async () => ({
      table: rows,
      pagination: { page: 1, pageSize: 100, totalCount: rows.length, pageCount: 1 },
    })),
    saveWicketData: vi.fn(async () => undefined),
    recalculate: vi.fn(),
  }
})

function mountComponent() {
  return mount(T2ProfnastilFacade, {
    global: {
      stubs: {
        B24Button: true,
        B24Modal: true,
        T2FilterDropdown: true,
      },
    },
  })
}

describe('T2ProfnastilFacade appearance state', () => {
  beforeEach(() => {
    rows.splice(0)
    setActivePinia(createPinia())
    const calc = useCalculation()
    calc.reset()
    calc.modelId.value = '2'
  })

  it('copies optional appearance when a row is selected and clears it on deselection', async () => {
    rows.push({
      id: 7,
      company: 'DoorHan',
      material: 'С20',
      thickness: '0.5',
      typeOfCoating: 'Printech',
      color: 'Дуб',
      colorHex: '#704214',
      colorImage: '/uploads/colors/wood.jpg',
    })
    const wrapper = mountComponent()
    await flushPromises()

    const checkbox = wrapper.get('tbody input[type="checkbox"]')
    await checkbox.setValue(true)

    const calc = useCalculation()
    expect(calc.colorFacadeHex.value).toBe('#704214')
    expect(calc.colorFacadeImage.value).toBe('/uploads/colors/wood.jpg')

    await checkbox.setValue(false)
    expect(calc.colorFacadeHex.value).toBe('')
    expect(calc.colorFacadeImage.value).toBe('')
  })

  it('accepts an old API row without appearance fields', async () => {
    rows.push({
      id: 8,
      company: 'DoorHan',
      material: 'С20',
      thickness: '0.5',
      typeOfCoating: 'Полиэстер',
      color: 'RAL 8017',
    })
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.get('tbody input[type="checkbox"]').setValue(true)

    const calc = useCalculation()
    expect(calc.colorFacadeHex.value).toBe('')
    expect(calc.colorFacadeImage.value).toBe('')
  })

  it('restores the live appearance kept in calculation state', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 9
    calc.materialSupplierFacade.value = 'DoorHan'
    calc.materialFacade.value = 'С20'
    calc.thicknessFacade.value = '0.5'
    calc.typeOfCoatingFacade.value = 'Printech'
    calc.colorFacade.value = 'Дуб'
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = '/uploads/colors/wood.jpg'

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.get('tbody tr').classes()).toContain('bg-blue-100')
    expect(calc.colorFacadeHex.value).toBe('#704214')
    expect(calc.colorFacadeImage.value).toBe('/uploads/colors/wood.jpg')
  })
})

describe('T2FillSide appearance clearing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCalculation().reset()
  })

  it('clears facade appearance when the facade filling changes', async () => {
    const calc = useCalculation()
    calc.idFacade.value = 7
    calc.colorFacadeHex.value = '#704214'
    calc.colorFacadeImage.value = '/uploads/colors/wood.jpg'
    const wrapper = mount(T2FillSide, {
      global: { stubs: { B24Button: true } },
    })
    await flushPromises()

    await wrapper.get('input[value="Профлист"]').trigger('change')

    expect(calc.idFacade.value).toBe('')
    expect(calc.colorFacadeHex.value).toBe('')
    expect(calc.colorFacadeImage.value).toBe('')
  })
})
