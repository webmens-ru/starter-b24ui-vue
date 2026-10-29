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
      { materialItemId: 101, quantity: 3, installationRole: null, customerOwned: false, parameters: [] },
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
        customerOwned: true, parameters: [],
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
  it('offers 30 colors for one item, requires a choice and emits typed IDs', async () => {
    mocks.getStandaloneMaterialItems.mockResolvedValue([{
      id: 104, name: 'Один материал', article: '', price: 900,
      orderParameters: [{ attributeId: 7, code: 'finish', name: 'Оттенок', dataType: 'color', required: true,
        values: Array.from({ length: 30 }, (_, index) => ({ id: index + 1, label: `Цвет ${index + 1}` })) }],
    }])
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    expect(wrapper.get('[aria-label="Материал"]').findAll('option')).toHaveLength(2)
    await wrapper.get('[aria-label="Материал"]').setValue('104')
    expect(wrapper.get('[aria-label="Добавить материал в заказ"]').attributes('disabled')).toBeDefined()
    const select = wrapper.get('[data-material-parameter="7"]')
    expect(select.findAll('option')).toHaveLength(31)
    await select.setValue('29')
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ materialItemId: 104, parameters: [{ attributeId: 7, colorId: 29 }] })
  })

  it('autoselects singletons, hides optional empty fields and blocks required empty fields', async () => {
    mocks.getStandaloneMaterialItems.mockResolvedValue([
      { id: 104, name: 'Первый', orderParameters: [
        { attributeId: 8, code: 'coat', name: 'Покрытие', dataType: 'coating', required: true, values: [{ id: 44, label: 'Один' }] },
        { attributeId: 9, code: 'empty', name: 'Пустой', dataType: 'option', required: false, values: [] },
        { attributeId: 10, code: 'optional', name: 'Опция', dataType: 'option', required: false, values: [{ id: 1, label: 'A' }, { id: 2, label: 'B' }] },
      ] },
      { id: 105, name: 'Второй', orderParameters: [{ attributeId: 8, code: 'coat', name: 'Покрытие', dataType: 'coating', required: true, values: [] }] },
    ])
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await flushPromises()
    await wrapper.get('[aria-label="Материал"]').setValue('104')
    expect(wrapper.find('[data-material-parameter="9"]').exists()).toBe(false)
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ parameters: [{ attributeId: 8, coatingId: 44 }] })
    await wrapper.get('[aria-label="Материал"]').setValue('105')
    expect(wrapper.get('[aria-label="Добавить материал в заказ"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('Покрытие')
  })

  it('clears choices when the item changes and ignores an older type load', async () => {
    mocks.getMaterialTypes.mockResolvedValue([{ id: 1, code: 'lock_component', name: 'Первый' }, { id: 2, code: 'other', name: 'Второй' }])
    let resolveOld!: (items: unknown[]) => void
    mocks.getStandaloneMaterialItems.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce([
        { id: 201, name: 'A', orderParameters: [{ attributeId: 7, code: 'finish', name: 'Цвет', dataType: 'color', required: true, values: [{ id: 1, label: 'A' }, { id: 2, label: 'B' }] }] },
        { id: 202, name: 'B', orderParameters: [{ attributeId: 7, code: 'finish', name: 'Переименовано', dataType: 'color', required: true, values: [{ id: 1, label: 'C' }, { id: 2, label: 'D' }] }] },
      ])
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    await wrapper.get('[aria-label="Тип материала"]').setValue('other')
    await flushPromises()
    await wrapper.get('[aria-label="Материал"]').setValue('201')
    await wrapper.get('[data-material-parameter="7"]').setValue('2')
    await wrapper.get('[aria-label="Материал"]').setValue('202')
    expect(wrapper.get('[aria-label="Добавить материал в заказ"]').attributes('disabled')).toBeDefined()
    resolveOld([{ id: 999, name: 'Устаревший' }])
    await flushPromises()
    expect(wrapper.text()).not.toContain('Устаревший')
    await wrapper.get('[data-material-parameter="7"]').setValue('2')
    await wrapper.get('[aria-label="Добавить материал в заказ"]').trigger('click')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ materialItemId: 202, parameters: [{ attributeId: 7, colorId: 2 }] })
  })

  it('clears loading state when a pending type is deselected', async () => {
    mocks.getStandaloneMaterialItems.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(AddMaterialProductRow, { props: { orderId: 42 } })
    await flushPromises()
    await wrapper.get('[aria-label="Тип материала"]').setValue('lock_component')
    expect(wrapper.get('[aria-label="Поиск материала"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[aria-label="Тип материала"]').setValue('')
    expect(wrapper.get('[aria-label="Поиск материала"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-material-parameter]').exists()).toBe(false)
  })

})
