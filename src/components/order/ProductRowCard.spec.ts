import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { ProductRowSummary } from '../../app/api/productRows'
import ProductRowCard from './ProductRowCard.vue'

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
    allowedActions: ['product_row.copy', 'product_row.change_quantity'],
    availableTransitions: [],
    ...overrides,
  }
}

describe('ProductRowCard', () => {
  it('shows configuration, status, quantity, dual prices, adjustment and deadline', () => {
    const wrapper = mount(ProductRowCard, { props: { productRow: makeProductRow() } })
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain('wicket · модель 3')
    expect(text).toContain('Черновик')
    expect(text).toContain('Количество')
    expect(text).toContain('Товарная позиция')
    expect(text).toContain('1 000')
    expect(text).toContain('800')
    expect(text).toContain('1 800')
    expect(text).toContain('1 440')
    expect(text).toContain('Скидка: 10 %')
    expect(text).toContain('01.09.2026')
  })

  it('redacts every nullable price instead of coercing null to zero', () => {
    const wrapper = mount(ProductRowCard, {
      props: {
        productRow: makeProductRow({
          baseRetailUnitPrice: null,
          baseDealerUnitPrice: null,
          finalRetailUnitPrice: null,
          finalDealerUnitPrice: null,
          retailTotalPrice: null,
          dealerTotalPrice: null,
        }),
      },
    })

    expect(wrapper.text()).not.toContain('0,00')
    expect(wrapper.findAll('[data-price-redacted]')).toHaveLength(6)
  })

  it('enables actions only when the server includes their allowed action', async () => {
    const productRow = makeProductRow()
    const wrapper = mount(ProductRowCard, { props: { productRow } })

    expect(wrapper.get('[aria-label="Редактировать товарную позицию 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Копировать товарную позицию 7"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Удалить товарную позицию 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Сменить статус товарной позиции 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Количество товарной позиции 7"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').trigger('change')

    expect(wrapper.emitted('copy')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('updateQuantity')?.[0]).toEqual([productRow, 3])
  })

  it('edits commercial terms and deadline and recalculates only from server capabilities', async () => {
    const productRow = makeProductRow({
      allowedActions: [
        'product_row.change_terms',
        'product_row.change_deadline',
        'product_row.calculate',
        'product_row.transition',
      ],
      availableTransitions: ['approval', 'cancelled'],
    })
    const wrapper = mount(ProductRowCard, { props: { productRow } })

    await wrapper.get('[aria-label="Тип корректировки товарной позиции 7"]').setValue('markup')
    await wrapper.get('[aria-label="Значение корректировки товарной позиции 7"]').setValue('15')
    await wrapper.get('[aria-label="Единица корректировки товарной позиции 7"]').setValue('fixed')
    await wrapper.get('[aria-label="Сохранить корректировку товарной позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Плановый срок товарной позиции 7"]').setValue('2026-09-15')
    await wrapper.get('[aria-label="Сохранить срок товарной позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Новый статус товарной позиции 7"]').setValue('cancelled')
    await wrapper.get('[aria-label="Сменить статус товарной позиции 7"]').trigger('click')

    expect(wrapper.emitted('updateAdjustment')?.[0]).toEqual([
      productRow,
      { adjustmentType: 'markup', adjustmentValue: 15, adjustmentUnit: 'fixed' },
    ])
    expect(wrapper.emitted('updateDeadline')?.[0]).toEqual([productRow, '2026-09-15'])
    expect(wrapper.emitted('recalculate')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('transition')?.[0]).toEqual([productRow, 'cancelled'])
    expect(wrapper.find('[aria-label="Новый статус товарной позиции 7"] option[value="production"]').exists()).toBe(false)
  })
})
