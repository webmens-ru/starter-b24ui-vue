import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AddMaterialProductRow from './AddMaterialProductRow.vue'

const mocks = vi.hoisted(() => ({
  getMaterialTypes: vi.fn(),
  getMaterialItems: vi.fn(),
  getStandaloneMaterialItems: vi.fn(),
}))

vi.mock('../../app/api/wicket', () => ({
  getMaterialTypes: mocks.getMaterialTypes,
  getMaterialItems: mocks.getMaterialItems,
  getStandaloneMaterialItems: mocks.getStandaloneMaterialItems,
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
    mocks.getStandaloneMaterialItems.mockResolvedValue([
      {
        id: 104,
        typeCode: 'lock_component',
        name: 'Универсальный замок без applicability',
        article: 'UNSCOPED-LOCK',
        price: 900,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
        attributes: {}, imageUrls: [], documents: [],
      },
    ])
  })

  it('loads standalone catalog items without wicket-model applicability requests', async () => {
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()

    expect(wrapper.text()).toContain('Универсальный замок без applicability')
    expect(mocks.getStandaloneMaterialItems).toHaveBeenCalledWith('lock_component')
    expect(mocks.getMaterialItems).not.toHaveBeenCalled()
  })

  it('searches active catalog items and emits a manufacturer material submission', async () => {
    mocks.getMaterialTypes.mockResolvedValue([
      { id: 1, code: 'lock_component', name: 'Комплектующие замка' },
      { id: 2, code: 'inactive', name: 'Архивный материал', isActive: false },
    ])
    mocks.getStandaloneMaterialItems.mockResolvedValue([
      {
        id: 101,
        typeCode: 'lock_component',
        name: 'Замок из каталога',
        article: 'NEW-LOCK',
        price: 1250,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
        attributes: {}, imageUrls: [], documents: [],
      },
      {
        id: 102,
        typeCode: 'lock_component',
        name: 'Замок для standalone-продажи',
        article: 'STANDALONE-LOCK',
        price: 1250,
        unit: { code: 'pcs', name: 'Штука', symbol: 'шт.' },
        attributes: {}, imageUrls: [], documents: [],
      },
    ])
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Архивный материал')
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    await wrapper.get('[aria-label="Поиск материала"]').setValue('standalone')
    expect(wrapper.text()).toContain('Замок для standalone-продажи')
    expect(wrapper.text()).not.toContain('Замок из каталога')
    expect(mocks.getStandaloneMaterialItems).toHaveBeenCalledTimes(1)
    expect(mocks.getStandaloneMaterialItems).toHaveBeenCalledWith('lock_component')
    expect(mocks.getMaterialItems).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="Поиск материала"]').setValue('')
    await wrapper.get('[aria-label="Материал"]').setValue('101')
    await wrapper.get('[aria-label="Количество материала"]').setValue('3')
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')

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
    await wrapper.get('[aria-label="Материал"]').setValue('104')
    await wrapper.get('[aria-label="Материал заказчика"]').setValue(true)
    await wrapper.get('[aria-label="Добавить установку"]').setValue(true)
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([[
      {
        materialItemId: 104,
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
    await wrapper.get('[aria-label="Материал"]').setValue('104')
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
