/**
 * Тесты передачи данных на бэк через saveWicketData.
 * Проверяем, что компоненты вызывают saveWicketData с корректным payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useCalculation } from '../../composables/useCalculation'
import ManufacturingOption from './ManufacturingOption.vue'
import FillSide from './type1/FillSide.vue'
import IsTherelock from './IsTherelock.vue'
import LockType from './LockType.vue'
import Pen from './Pen.vue'
import ShieldType from './ShieldType.vue'

const testRouter = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

vi.mock('../../app/api/wicket', () => ({
  saveWicketData: vi.fn().mockResolvedValue(undefined),
  saveWicketAccessoryComposition: vi.fn().mockImplementation(async (payload: { lockVersion: number }) => ({
    lockVersion: payload.lockVersion + 1,
    lockComponents: [], skud: [], doorClosers: [], bumpers: [],
    orderTotals: { priceRetail: 0, priceDealer: 0 },
  })),
  recalculate: vi.fn().mockResolvedValue({ priceDealer: 10000, priceRetail: 13500 }),
  saveOrderData: vi.fn().mockResolvedValue(undefined),
  saveClientInfo: vi.fn().mockResolvedValue(undefined),
  getAssortmentStolb: vi.fn().mockResolvedValue({ assortmentPipe: [] }),
  getPolozhenieJumper: vi.fn().mockResolvedValue({ availablePolozheniyeJumper: [] }),
  getAssortmentJumper: vi.fn().mockResolvedValue({ assortmentJumper: [] }),
  getColorShield: vi.fn().mockResolvedValue({ colorShield: [] }),
  getNetWidths: vi.fn().mockResolvedValue({ netWidths: [] }),
  getNetsByWidth: vi.fn().mockResolvedValue({ items: [] }),
  getFilterOptions: vi.fn().mockResolvedValue({}),
  getSidingTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getProfnastilTable: vi.fn().mockResolvedValue({ table: [], pagination: {} }),
  getLocks: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первый замок', imageUrls: [], components: [] },
      { id: 7, marking: 'Сохранённый замок', imageUrls: [], components: [
        { id: 701, name: 'Сохранённый корпус', imageUrls: [] },
      ] },
    ],
  }),
  getPensByLock: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первая ручка', colors: [{ id: 1, name: 'Первый цвет' }], imageUrls: [] },
      { id: 3, marking: 'Сохранённая ручка', colors: [{ id: 5, name: 'Сохранённый цвет' }], imageUrls: [] },
    ],
  }),
  getAdditionalPens: vi.fn().mockResolvedValue({
    items: [
      { id: 1, marking: 'Первая доп. ручка', colors: [{ id: 1, name: 'Первый цвет' }], imageUrls: [] },
      { id: 9, marking: 'Сохранённая доп. ручка', colors: [{ id: 6, name: 'Сохранённый цвет' }], imageUrls: [] },
    ],
  }),
  getAddressSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
  createOrder: vi.fn().mockResolvedValue({ orderId: 42, companyId: null, managerId: 1 }),
  loadWicketData: vi.fn().mockResolvedValue({}),
  createWicketMainMenu: vi.fn().mockResolvedValue(undefined),
  finalCalculate: vi.fn().mockResolvedValue({ priceDealer: '15000', priceRetail: '22500' }),
  deleteCalculation: vi.fn().mockResolvedValue(undefined),
}))

const { saveWicketData, saveWicketAccessoryComposition, recalculate, getColorShield, getNetWidths } = await import('../../app/api/wicket')

describe('saveWicketData — данные передаются на бэк', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(async () => {
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.reset()
    calc.modelId.value = '1'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1
    vi.mocked(saveWicketData).mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('ManufacturingOption передаёт вариант изготовления', async () => {
    mount(ManufacturingOption, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    // save вызывается на onMounted
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]

    expect(payload).toMatchObject({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      reachedStep: 'page1',
    })
    expect(payload).toHaveProperty('visitedPages')
    expect(payload).toHaveProperty('providesMaterial')
    expect(payload).toHaveProperty('providesPaint')
    expect(payload).toHaveProperty('doesPaintingFrame')
    expect(payload).toHaveProperty('doesAssembly')
  })

  it('FillSide передаёт fillSide и materialFacadeGlob', async () => {
    mount(FillSide, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]

    expect(payload).toMatchObject({
      orderId: 42,
      modelId: '1',
      reachedStep: 'page2',
      fillSide: 'Одна сторона',
      materialFacadeGlob: 'Сайдинг',
      materialYardGlob: null,
    })
  })

  it('FillSide при "Две стороны" передаёт materialYardGlob', async () => {
    calc.fillSide.value = 'Две стороны'
    calc.materialYardGlob.value = 'Профлист'

    mount(FillSide, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload.materialYardGlob).toBe('Профлист')
  })

  it('FillSide сбрасывает все поля двора при переходе с сайдинга на профлист', async () => {
    calc.fillSide.value = 'Две стороны'
    calc.materialFacadeGlob.value = 'Сайдинг'
    calc.materialYardGlob.value = 'Сайдинг'
    calc.idYard.value = 17
    calc.materialYard.value = 'Бревно'
    calc.formYard.value = 'Гладкая'
    calc.thicknessYard.value = '0.45'
    calc.typeOfCoatingYard.value = 'Глянец'
    calc.manufacturerYardId.value = 4
    calc.materialSupplierYard.value = 'Двор-Профиль'
    calc.colorYardId.value = 9
    calc.colorYard.value = 'RAL 9003'

    const wrapper = mount(FillSide, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    await wrapper.get('input[value="Профлист"]').setValue(true)
    await flushPromises()

    expect(calc.materialYardGlob.value).toBe('Профлист')
    expect({
      id: calc.idYard.value,
      manufacturerId: calc.manufacturerYardId.value,
      colorId: calc.colorYardId.value,
      material: calc.materialYard.value,
      manufacturer: calc.materialSupplierYard.value,
      color: calc.colorYard.value,
    }).toEqual({
      id: '',
      manufacturerId: null,
      colorId: null,
      material: '',
      manufacturer: '',
      color: '',
    })
    expect(vi.mocked(saveWicketData).mock.calls[0]?.[0]).toMatchObject({
      materialYardGlob: 'Профлист',
      idYard: null,
      manufacturerYardId: null,
      colorYardId: null,
      materialYard: null,
    })
  })

  it('FillSide сохраняет явные null после перехода с двух сторон на одну', async () => {
    calc.fillSide.value = 'Две стороны'
    calc.materialYardGlob.value = 'Сайдинг'
    calc.idYard.value = 17
    calc.materialYard.value = 'Бревно'
    calc.manufacturerYardId.value = 4
    calc.colorYardId.value = 9

    const wrapper = mount(FillSide, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    await wrapper.get('input[value="Одна сторона"]').setValue(true)
    await flushPromises()

    expect(calc.materialYardGlob.value).toBeNull()
    expect(calc.idYard.value).toBe('')
    expect(calc.manufacturerYardId.value).toBeNull()
    expect(calc.colorYardId.value).toBeNull()
    expect(vi.mocked(saveWicketData).mock.calls[0]?.[0]).toMatchObject({
      fillSide: 'Одна сторона',
      materialYardGlob: null,
      idYard: null,
      manufacturerYardId: null,
      colorYardId: null,
      materialYard: null,
    })
  })

  it('FillSide не изменяет настроенный двор при выборе материала фасада', async () => {
    calc.fillSide.value = 'Две стороны'
    calc.materialFacadeGlob.value = ''
    calc.materialYardGlob.value = 'Профлист'
    calc.idYard.value = 27
    calc.materialYard.value = 'МП-10'
    calc.formYard.value = 'Трапеция'
    calc.thicknessYard.value = '0.5'
    calc.typeOfCoatingYard.value = 'Полиэстер'
    calc.manufacturerYardId.value = 14
    calc.materialSupplierYard.value = 'Сохранённый двор'
    calc.colorYardId.value = 19
    calc.colorYard.value = 'RAL 7016'

    const wrapper = mount(FillSide, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await flushPromises()
    vi.mocked(saveWicketData).mockClear()

    await wrapper.get('input[value="Сайдинг"]').setValue(true)
    await flushPromises()

    expect({
      materialGroup: calc.materialYardGlob.value,
      id: calc.idYard.value,
      material: calc.materialYard.value,
      form: calc.formYard.value,
      thickness: calc.thicknessYard.value,
      coating: calc.typeOfCoatingYard.value,
      manufacturerId: calc.manufacturerYardId.value,
      manufacturer: calc.materialSupplierYard.value,
      colorId: calc.colorYardId.value,
      color: calc.colorYard.value,
    }).toEqual({
      materialGroup: 'Профлист',
      id: 27,
      material: 'МП-10',
      form: 'Трапеция',
      thickness: '0.5',
      coating: 'Полиэстер',
      manufacturerId: 14,
      manufacturer: 'Сохранённый двор',
      colorId: 19,
      color: 'RAL 7016',
    })
    expect(vi.mocked(saveWicketData).mock.calls[0]?.[0]).toMatchObject({
      materialFacadeGlob: 'Сайдинг',
      materialYardGlob: 'Профлист',
      idYard: 27,
      manufacturerYardId: 14,
      colorYardId: 19,
    })
  })

  it('IsTherelock сохраняет root-комплект и его provider/installer вместе с кабелем', async () => {
    calc.isThereLock.value = 1
    calc.isThereLockName.value = 'Есть'
    calc.lockSetId.value = 7
    calc.providesLock.value = 'Предоставляет заказчик'
    calc.lockInstaller.value = 'Выполняет заказчик'
    calc.lockPenColorId.value = 7

    const wrapper = mount(IsTherelock, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.find('input[value="Изготовитель не устанавливает"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(saveWicketData).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(saveWicketData).mock.calls[0][0]
    expect(payload).toMatchObject({
      orderId: 42,
      productRowId: 7,
      modelId: '1',
      lockSetId: 7,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет заказчик',
      isThereCable: 'Изготовитель не устанавливает',
    })
    for (const key of ['isThereLock', 'isThereLockName', 'lockComponentIds', 'lockComponentsInstalled']) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('IsTherelock берёт provider/installer из root, а не из standalone composition', async () => {
    calc.loadFromApi({
      lockSetId: 7,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет заказчик',
    })
    calc.applyAccessoryComposition({
      lockVersion: 1,
      lockComponents: [{ materialItemId: 701, relationRole: 'lock_component_installation' }] as never,
      skud: [], doorClosers: [], bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })

    const wrapper = mount(IsTherelock, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await new Promise(r => setTimeout(r, 100))
    vi.mocked(saveWicketAccessoryComposition).mockClear()

    expect(wrapper.find('input[value="Предоставляет заказчик"]:checked').exists()).toBe(true)
    expect(wrapper.find('input[value="Выполняет заказчик"]:checked').exists()).toBe(true)
    await wrapper.find('input[value="Предоставляет изготовитель"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(vi.mocked(saveWicketData).mock.calls[vi.mocked(saveWicketData).mock.calls.length - 1]?.[0]).toMatchObject({
      lockSetId: 7,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет заказчик',
    })
    expect(calc.getAccessorySelections().lockComponents).toEqual([
      { role: 'lock_component', materialItemId: 701, providedByManufacturer: false, installedByManufacturer: true },
    ])
  })

  it('сохраняет выбранный customer-owned комплект отдельно от состава комплектующих', async () => {
    calc.applyAccessoryComposition({
      lockVersion: 1,
      lockComponents: [], skud: [], doorClosers: [], bumpers: [],
      orderTotals: { priceRetail: 0, priceDealer: 0 },
    })
    const lockPresence = mount(IsTherelock, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await new Promise(r => setTimeout(r, 100))

    await lockPresence.find('input[value="Есть"]').setValue()
    await lockPresence.find('input[value="Предоставляет заказчик"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(calc.isThereLock.value).toBe(1)
    expect(calc.providesLock.value).toBe('Предоставляет заказчик')
    expect(calc.lockInstaller.value).toBe('Выполняет изготовитель')
    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    const rootPayload = vi.mocked(saveWicketData).mock.calls[vi.mocked(saveWicketData).mock.calls.length - 1]?.[0]
    expect(rootPayload).toMatchObject({
      lockSetId: null,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет изготовитель',
    })
    lockPresence.unmount()

    const lockType = mount(LockType, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
      },
    })
    await new Promise(r => setTimeout(r, 100))
    expect(lockType.find('input[type="radio"]:checked').exists()).toBe(false)
    expect(calc.lockSetId.value).toBeNull()
    await lockType.find('input[type="radio"][value="7"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(vi.mocked(saveWicketData).mock.calls[vi.mocked(saveWicketData).mock.calls.length - 1]?.[0]).toMatchObject({
      lockSetId: 7,
      providesLock: 'Предоставляет заказчик',
      lockInstaller: 'Выполняет изготовитель',
    })
  })

  it('IsTherelock очищает существующий root-комплект без удаления standalone child rows', async () => {
    calc.lockSetId.value = 7
    calc.isThereLock.value = 1
    calc.isThereLockName.value = 'Есть'
    calc.providesLock.value = 'Предоставляет заказчик'
    calc.lockInstaller.value = 'Выполняет заказчик'
    calc.setAccessorySelections('lock_component', [{
      role: 'lock_component',
      materialItemId: 701,
      providedByManufacturer: true,
      installedByManufacturer: false,
    }])

    const wrapper = mount(IsTherelock, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await new Promise(r => setTimeout(r, 100))
    vi.mocked(saveWicketData).mockClear()
    vi.mocked(saveWicketAccessoryComposition).mockClear()

    await wrapper.find('input[value="Нет"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(vi.mocked(saveWicketData).mock.calls[vi.mocked(saveWicketData).mock.calls.length - 1]?.[0]).toMatchObject({
      lockSetId: null,
      providesLock: null,
      lockInstaller: null,
    })
    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(calc.getAccessorySelections().lockComponents).toEqual([{
      role: 'lock_component',
      materialItemId: 701,
      providedByManufacturer: true,
      installedByManufacturer: false,
    }])
  })

  it('IsTherelock откатывает локальные radio и не пересчитывает после rejected root save', async () => {
    calc.lockSetId.value = 7
    calc.isThereLock.value = 1
    calc.isThereLockName.value = 'Есть'
    calc.providesLock.value = 'Предоставляет изготовитель'
    calc.lockInstaller.value = 'Выполняет изготовитель'
    calc.priceRetail.value = 100
    const wrapper = mount(IsTherelock, {
      global: { plugins: [testRouter], stubs: ['B24Button'] },
    })
    await new Promise(r => setTimeout(r, 100))
    vi.mocked(saveWicketData).mockRejectedValueOnce(new Error('rejected'))
    vi.mocked(recalculate).mockClear()

    await wrapper.find('input[value="Предоставляет заказчик"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(calc.providesLock.value).toBe('Предоставляет изготовитель')
    expect(wrapper.find('input[value="Предоставляет изготовитель"]:checked').exists()).toBe(true)
    expect(calc.data.value.find(block => block.blockName === 'Замок')?.params).toContainEqual({
      name: 'Замок предоставляет',
      value: 'Предоставляет изготовитель',
    })
    expect(recalculate).not.toHaveBeenCalled()
  })

  it('LockType сохраняет выбранный комплект и очищает legacy-поля ручки', async () => {
    calc.modelId.value = '2'
    calc.lockSetId.value = null

    const wrapper = mount(LockType, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(saveWicketData).not.toHaveBeenCalled()
    await wrapper.find('input[type="radio"][value="7"]').setValue()
    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketAccessoryComposition).not.toHaveBeenCalled()
    expect(saveWicketData).toHaveBeenCalled()
    const saveCalls = vi.mocked(saveWicketData).mock.calls
    const payload = saveCalls[saveCalls.length - 1]?.[0]
    expect(payload).toMatchObject({
      orderId: 42,
      productRowId: 7,
      modelId: '2',
      lockSetId: 7,
      providesLock: 'Предоставляет изготовитель',
      lockInstaller: 'Выполняет изготовитель',
      lockPenId: null,
      lockPenColorId: null,
    })
    for (const key of ['typeLock', 'lockComponentIds', 'lockComponentsInstalled']) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('Pen при редактировании не перетирает сохранённую дополнительную ручку первой из списка', async () => {
    calc.modelId.value = '2'
    calc.isTherePenName.value = 'Будет'
    calc.isTherePen.value = 1
    calc.additionalPenId.value = 9
    calc.penColorId.value = 6

    mount(Pen, {
      global: {
        plugins: [testRouter],
        stubs: ['B24Button', 'B24SelectMenu', 'ImageViewer'],
      },
    })

    await new Promise(r => setTimeout(r, 100))

    expect(saveWicketData).toHaveBeenCalled()
    const saveCalls = vi.mocked(saveWicketData).mock.calls
    const payload = saveCalls[saveCalls.length - 1]?.[0]
    expect(payload).toMatchObject({
      isTherePen: 1,
      additionalPenId: 9,
      penColorId: 6,
      additionalPenColor: 'Сохранённый цвет',
    })
  })

  it('ShieldType сохраняет выбранный цвет при смене типа щита', async () => {
    calc.modelId.value = '2'
    calc.colorShieldId.value = '7'

    vi.mocked(getColorShield).mockResolvedValueOnce({
      colorShield: [
        { id: 1, name: 'Первый цвет', hex: '#111111', paintTypeId: 1, paintTypeName: 'Порошок', consumptionRate: 1 },
        { id: 7, name: 'Сохранённый цвет', hex: '#777777', paintTypeId: 1, paintTypeName: 'Порошок', consumptionRate: 1 },
      ],
    })

    let finishNetWidths!: (value: { netWidths: [] }) => void
    vi.mocked(getNetWidths).mockImplementationOnce(() => new Promise(resolve => {
      finishNetWidths = resolve
    }))

    const wrapper = mount(ShieldType, {
      global: {
        plugins: [testRouter],
        stubs: {
          B24Button: true,
          B24Modal: true,
          B24RadioGroup: true,
          B24SelectMenu: {
            props: ['modelValue'],
            template: '<div data-testid="select" :data-value="String(modelValue ?? \'\')" />',
          },
        },
      },
    })

    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Сохранённый цвет')

    finishNetWidths({ netWidths: [] })
    await new Promise(r => setTimeout(r, 0))
    vi.mocked(saveWicketData).mockClear()

    await wrapper.find('input[value="Тип_2"]').setValue(true)
    await new Promise(r => setTimeout(r, 0))

    const saveCalls = vi.mocked(saveWicketData).mock.calls
    expect(saveCalls[saveCalls.length - 1]?.[0]).toMatchObject({
      shieldType: 'Тип_2',
      colorShieldId: '7',
      colorShieldName: 'Сохранённый цвет',
    })

    wrapper.unmount()
  })
})
