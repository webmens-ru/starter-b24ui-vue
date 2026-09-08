import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AddMaterialProductRow from './AddMaterialProductRow.vue'

const mocks = vi.hoisted(() => ({
  getMaterialTypes: vi.fn(),
  getMaterialItems: vi.fn(),
}))

vi.mock('../../app/api/wicket', () => ({
  getMaterialTypes: mocks.getMaterialTypes,
  getMaterialItems: mocks.getMaterialItems,
}))

describe('AddMaterialProductRow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getMaterialTypes.mockResolvedValue([{ id: 1, code: 'lock_component', name: 'Комплектующие замка' }])
    mocks.getMaterialItems.mockResolvedValue([
      {
        id: 101,
        typeCode: 'lock_component',
        name: 'Замок из каталога',
        article: 'NEW-LOCK',
        price: 1250,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
        attributes: {}, imageUrls: [], documents: [],
      },
    ])
  })

  it('searches active catalog items and emits a manufacturer material submission', async () => {
    mocks.getMaterialTypes.mockResolvedValue([
      { id: 1, code: 'lock_component', name: 'Комплектующие замка' },
      { id: 2, code: 'inactive', name: 'Архивный материал', isActive: false },
    ])
    mocks.getMaterialItems.mockImplementation(({ modelId }: { modelId: number }) => Promise.resolve([
      {
        id: modelId === 2 ? 102 : 101,
        typeCode: 'lock_component',
        name: modelId === 2 ? 'Замок для второй модели' : 'Замок из каталога',
        article: modelId === 2 ? 'MODEL-2' : 'NEW-LOCK',
        price: 1250,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
        attributes: {}, imageUrls: [], documents: [],
      },
      ...(modelId === 3 ? [{
        id: 103, typeCode: 'lock_component', name: 'Архивная позиция', article: 'OLD', price: 1,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' }, attributes: {}, imageUrls: [], documents: [], isActive: false,
      }] : []),
    ]))
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Архивный материал')
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    await wrapper.get('[aria-label="Поиск материала"]').setValue('второй')
    expect(wrapper.text()).toContain('Замок для второй модели')
    expect(wrapper.text()).not.toContain('Замок из каталога')
    expect(wrapper.text()).not.toContain('Архивная позиция')
    expect(mocks.getMaterialItems).toHaveBeenCalledTimes(11)
    expect(mocks.getMaterialItems).toHaveBeenCalledWith({ typeCode: 'lock_component', productType: 'wicket', modelId: 11 })
    await wrapper.get('[aria-label="Поиск материала"]').setValue('')
    await wrapper.get('[aria-label="Материал"]').setValue('101')
    await wrapper.get('[aria-label="Количество материала"]').setValue('3')
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')

    expect(mocks.getMaterialItems).toHaveBeenCalledWith({
      typeCode: 'lock_component', productType: 'wicket', modelId: 1,
    })
    expect(wrapper.emitted('submit')).toEqual([[
      { materialItemId: 101, quantity: 3, installationRole: null, customerOwned: false },
    ]])
    expect(wrapper.text()).not.toContain('1 250')
  })

  it('emits a root installation for a customer-owned material without creating goods', async () => {
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    await wrapper.get('[aria-label="Материал"]').setValue('101')
    await wrapper.get('[aria-label="Материал заказчика"]').setValue(true)
    await wrapper.get('[aria-label="Добавить установку"]').setValue(true)
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([[
      {
        materialItemId: 101,
        quantity: 1,
        installationRole: 'lock_component_installation',
        customerOwned: true,
      },
    ]])
  })

  it('rejects a customer-owned item without installation and clears hidden installation state on type change', async () => {
    mocks.getMaterialTypes.mockResolvedValue([
      { id: 1, code: 'lock_component', name: 'Комплектующие замка' },
      { id: 2, code: 'other', name: 'Другое' },
    ])
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    await wrapper.get('[aria-label="Материал"]').setValue('101')
    await wrapper.get('[aria-label="Материал заказчика"]').setValue(true)
    expect(wrapper.get('[aria-label="Добавить материал в заказ"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[aria-label="Добавить установку"]').setValue(true)
    await wrapper.get('[aria-label="Тип материала"]').setValue('other')
    await flushPromises()

    expect(wrapper.find('[aria-label="Добавить установку"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Добавить материал в заказ"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
