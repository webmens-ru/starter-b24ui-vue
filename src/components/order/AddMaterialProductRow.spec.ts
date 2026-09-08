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
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Архивный материал')
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
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
})
