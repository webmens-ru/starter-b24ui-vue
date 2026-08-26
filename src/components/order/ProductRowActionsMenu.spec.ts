import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { ProductRowSummary } from '../../app/api/productRows'
import ProductRowActionsMenu from './ProductRowActionsMenu.vue'

function makeProductRow(overrides: Partial<ProductRowSummary> = {}): ProductRowSummary {
  return {
    id: 7,
    orderId: 42,
    productType: 'wicket',
    modelId: '3',
    quantity: 2,
    sortOrder: 10,
    status: { id: 1, code: 'draft', name: 'Черновик', color: '#777777' },
    baseRetailUnitPrice: 1000,
    baseDealerUnitPrice: 800,
    finalRetailUnitPrice: 900,
    finalDealerUnitPrice: 720,
    retailTotalPrice: 1800,
    dealerTotalPrice: 1440,
    adjustmentType: 'discount',
    adjustmentValue: 10,
    adjustmentUnit: 'percent',
    plannedCompletionAt: '2026-09-01',
    lastCalculatedAt: 1788200000,
    isActual: true,
    calculationError: null,
    lockVersion: 4,
    allowedActions: [
      'product_row.edit_configuration',
      'product_row.calculate',
      'product_row.copy',
      'product_row.delete',
      'product_row.transition',
      'product_row.reorder',
    ],
    availableTransitions: ['approval', 'approved', 'cancelled'],
    ...overrides,
  }
}

async function openMenu(row = makeProductRow(), props: { disabled?: boolean; canMoveUp?: boolean; canMoveDown?: boolean } = {}) {
  const wrapper = mount(ProductRowActionsMenu, {
    props: { productRow: row, canMoveUp: true, canMoveDown: true, ...props },
  })
  await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
  return wrapper
}

describe('ProductRowActionsMenu', () => {
  it('shows only actions authorized by the server and all available transitions', async () => {
    const row = makeProductRow({
      allowedActions: ['product_row.edit_configuration', 'product_row.delete', 'product_row.transition'],
      availableTransitions: ['approval', 'cancelled'],
    })
    const wrapper = await openMenu(row)

    expect(wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`)).toBeTruthy()
    expect(wrapper.find(`[aria-label="Редактировать товарную позицию ${row.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[aria-label="Пересчитать товарную позицию ${row.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[aria-label="Копировать товарную позицию ${row.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[aria-label="Удалить товарную позицию ${row.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[aria-label="Перевести товарную позицию ${row.id} в статус approval"]`).exists()).toBe(true)
    expect(wrapper.find(`[aria-label="Перевести товарную позицию ${row.id} в статус cancelled"]`).exists()).toBe(true)
    expect(wrapper.find(`[aria-label="Перевести товарную позицию ${row.id} в статус production"]`).exists()).toBe(false)
    expect(wrapper.find(`[aria-label="Переместить товарную позицию ${row.id} вверх"]`).exists()).toBe(false)
  })

  it('emits each selected action and closes the menu immediately', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row)

    await wrapper.get(`[aria-label="Редактировать товарную позицию ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
    await wrapper.get(`[aria-label="Пересчитать товарную позицию ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('recalculate')).toHaveLength(1)

    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
    await wrapper.get(`[aria-label="Копировать товарную позицию ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)

    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
    expect(wrapper.find(`[aria-label="Удалить товарную позицию ${row.id}"]`).classes()).toContain('text-red-700')
    await wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('emits transitions and permitted moves while disabling movement at boundaries', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row, { canMoveUp: false, canMoveDown: true })

    await wrapper.get(`[aria-label="Перевести товарную позицию ${row.id} в статус approval"]`).trigger('click')
    expect(wrapper.emitted('transition')).toEqual([['approval']])

    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
    const moveUp = wrapper.get(`[aria-label="Переместить товарную позицию ${row.id} вверх"]`)
    const moveDown = wrapper.get(`[aria-label="Переместить товарную позицию ${row.id} вниз"]`)
    expect(moveUp.attributes('disabled')).toBeDefined()
    expect(moveDown.attributes('disabled')).toBeUndefined()
    await moveUp.trigger('click')
    await moveDown.trigger('click')
    expect(wrapper.emitted('move')).toEqual([[1]])
  })

  it('closes on outside click and Escape', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row)

    await document.body.click()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
    await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('cannot open or emit an action while disabled', async () => {
    const row = makeProductRow()
    const wrapper = mount(ProductRowActionsMenu, {
      props: { productRow: row, disabled: true, canMoveUp: true, canMoveDown: true },
    })
    const trigger = wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`)

    expect(trigger.attributes('disabled')).toBeDefined()
    await trigger.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.emitted()).toEqual({})
  })
})
