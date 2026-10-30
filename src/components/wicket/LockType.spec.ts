import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LockType from './LockType.vue'
import { useCalculation } from '../../composables/useCalculation'

const apiMocks = vi.hoisted(() => ({
  getLocks: vi.fn(),
  getPensByLock: vi.fn(),
  saveWicketData: vi.fn(),
  recalculate: vi.fn(),
}))

vi.mock('../../app/api/wicket', () => apiMocks)

const lockSet7 = {
  id: 7,
  marking: 'Комплект механический чёрный',
  imageUrls: [],
  components: [
    { id: 701, name: 'Корпус чёрный', imageUrls: ['/uploads/material-items/701/images/front.jpg'] },
    { id: 702, name: 'Ответная планка', imageUrls: [] },
  ],
}

const lockSet8 = {
  id: 8,
  marking: 'Комплект механический белый',
  imageUrls: [],
  components: [
    { id: 801, name: 'Корпус белый', imageUrls: ['/uploads/material-items/801/images/front.jpg'] },
  ],
}

function mountLockType() {
  return mount(LockType, {
    global: { stubs: { B24Button: true, B24SelectMenu: true, ImageViewer: true, teleport: true } },
  })
}

describe('LockType', () => {
  let calc: ReturnType<typeof useCalculation>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.reset()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    calc.accessoryCompositionLockVersion.value = 1
    apiMocks.getLocks.mockResolvedValue({ items: [lockSet7, lockSet8] })
    apiMocks.getPensByLock.mockResolvedValue({ items: [] })
    apiMocks.saveWicketData.mockResolvedValue(undefined)
    apiMocks.recalculate.mockResolvedValue({ priceDealer: 0, priceRetail: 0 })
  })

  it('shows kit cost separately from installation and hides unavailable financial fields', async () => {
    apiMocks.getLocks.mockResolvedValue({ items: [{ ...lockSet7, price: 1250.5 }, { ...lockSet8, price: 0 }] })
    const wrapper = mountLockType()
    await flushPromises()
    expect(wrapper.get('[data-lock-price="7"]').text().replace(/\s/g, ' ')).toBe('Стоимость комплекта: 1 250,50 ₽')
    expect(wrapper.get('[data-lock-price="8"]').text().replace(/\s/g, ' ')).toBe('Стоимость комплекта: 0,00 ₽')
    wrapper.unmount()
    setActivePinia(createPinia())
    useCalculation().modelId.value = '2'
    apiMocks.getLocks.mockResolvedValue({ items: [lockSet7] })
    const hidden = mountLockType()
    await flushPromises()
    expect(hidden.find('[data-lock-price]').exists()).toBe(false)
    hidden.unmount()
  })

  it('renders the selected set composition and saves cleared legacy handle fields', async () => {
    const wrapper = mountLockType()
    await flushPromises()

    await wrapper.find('input[type="radio"][value="7"]').setValue()
    await flushPromises()

    await wrapper.get('[data-description-id="7"]').trigger('click')
    expect(wrapper.text()).toContain('Состав комплекта')
    expect(wrapper.text()).toContain('Корпус чёрный')
    expect(wrapper.text()).toContain('Ответная планка')
    expect(wrapper.text()).not.toContain('Цвет ручки')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(apiMocks.getPensByLock).not.toHaveBeenCalled()
    expect(apiMocks.saveWicketData).toHaveBeenCalledWith(expect.objectContaining({
      lockSetId: 7,
      lockPenId: null,
      lockPenColorId: null,
    }))
  })

  it('renders only the selected set components and explains an empty composition', async () => {
    const wrapper = mountLockType()
    await flushPromises()

    await wrapper.find('input[type="radio"][value="8"]').setValue()
    await flushPromises()

    await wrapper.get('[data-description-id="8"]').trigger('click')
    expect(wrapper.text()).toContain('Корпус белый')
    expect(wrapper.text()).not.toContain('Корпус чёрный')
    expect(wrapper.text()).not.toContain('Ответная планка')

    apiMocks.getLocks.mockResolvedValueOnce({
      items: [{ ...lockSet7, components: [] }, lockSet8],
    })
    wrapper.unmount()
    setActivePinia(createPinia())
    calc = useCalculation()
    calc.modelId.value = '2'
    calc.number.value = 42
    calc.productRowId.value = 7
    const emptyWrapper = mountLockType()
    await flushPromises()
    await emptyWrapper.find('input[type="radio"][value="7"]').setValue()
    await flushPromises()

    await emptyWrapper.get('[data-description-id="7"]').trigger('click')
    expect(emptyWrapper.text()).toContain('Состав комплекта не указан')
  })

  it('combines component photos and opens descriptions without selecting or saving', async () => {
    const wrapper = mountLockType()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Корпус чёрный')
    const viewers = wrapper.findAllComponents({ name: 'ImageViewer' })
    expect(viewers[0]!.props('images')).toEqual(lockSet7.components[0]!.imageUrls)
    expect(viewers[1]!.props('images')).toEqual(lockSet8.components[0]!.imageUrls)
    await wrapper.get('[data-description-id="8"]').trigger('click')
    expect(wrapper.text()).toContain('Корпус белый')
    expect(wrapper.find('input:checked').exists()).toBe(false)
    expect(apiMocks.saveWicketData).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Закрыть описание"]').trigger('click')
    expect(wrapper.text()).not.toContain('Корпус белый')
    wrapper.unmount()
  })

  it('reuses a successfully loaded catalog when the lock step mounts again', async () => {
    const firstWrapper = mountLockType()
    await flushPromises()
    firstWrapper.unmount()

    mountLockType()
    await flushPromises()

    expect(apiMocks.getLocks).toHaveBeenCalledTimes(1)
  })

  it('reconciles a loaded set from the catalog and refreshes only its summary without saving', async () => {
    calc.loadFromApi({
      orderId: 42,
      productRowId: 7,
      modelId: '2',
      lockSetId: 7,
      typeLock: 'Устаревшее имя комплекта',
      lockPenId: 3,
      lockPenColor: 'Старый цвет ручки',
      lockPenColorId: 5,
    })
    const wrapper = mountLockType()

    await flushPromises()

    await wrapper.get('[data-description-id="7"]').trigger('click')
    expect(wrapper.find('input[type="radio"][value="7"]:checked').exists()).toBe(true)
    expect(wrapper.text()).toContain('Корпус чёрный')
    expect(wrapper.text()).toContain('Ответная планка')
    expect(calc.typeLock.value).toBe(lockSet7.marking)
    expect(calc.lockPenId.value).toBeNull()
    expect(calc.lockPenColorId.value).toBeNull()
    expect(calc.lockPenColor.value).toBe('')
    expect(calc.data.value.find(block => block.blockName === 'Замок')?.params).toContainEqual({
      paramCode: 'lockType', name: 'Тип замка',
      value: lockSet7.marking,
    })
    expect(calc.data.value.flatMap(block => block.params)).not.toContainEqual({
      paramCode: 'penColor', name: 'Цвет ручки',
      value: 'Старый цвет ручки',
    })
    expect(apiMocks.saveWicketData).not.toHaveBeenCalled()
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
  })

  it('restores the previous set and its composition without recalculation when save is rejected', async () => {
    calc.lockSetId.value = 7
    calc.typeLock.value = lockSet7.marking
    calc.priceRetail.value = 100
    const wrapper = mountLockType()
    await flushPromises()

    apiMocks.saveWicketData.mockRejectedValueOnce(new Error('rejected'))
    apiMocks.recalculate.mockClear()

    await wrapper.find('input[type="radio"][value="8"]').setValue()
    await flushPromises()

    expect(calc.lockSetId.value).toBe(7)
    expect(calc.typeLock.value).toBe(lockSet7.marking)
    expect(calc.lockPenId.value).toBeNull()
    expect(calc.lockPenColorId.value).toBeNull()
    expect(calc.lockPenColor.value).toBe('')
    await wrapper.get('[data-description-id="7"]').trigger('click')
    expect(wrapper.find('input[type="radio"][value="7"]:checked').exists()).toBe(true)
    expect(wrapper.text()).toContain('Корпус чёрный')
    expect(wrapper.text()).toContain('Ответная планка')
    expect(wrapper.text()).not.toContain('Корпус белый')
    expect(apiMocks.getPensByLock).not.toHaveBeenCalled()
    expect(apiMocks.saveWicketData).toHaveBeenCalledTimes(1)
    expect(apiMocks.recalculate).not.toHaveBeenCalled()
  })
})
