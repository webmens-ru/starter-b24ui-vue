import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { OrderItemSummary } from '../../app/api/orderItems'
import OrderItemCard from './OrderItemCard.vue'

function makeItem(overrides: Partial<OrderItemSummary> = {}): OrderItemSummary {
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
    allowedActions: ['order_item.copy', 'order_item.change_quantity'],
    availableTransitions: [],
    ...overrides,
  }
}

describe('OrderItemCard', () => {
  it('shows configuration, status, quantity, dual prices, adjustment and deadline', () => {
    const wrapper = mount(OrderItemCard, { props: { item: makeItem() } })
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain('wicket · модель 3')
    expect(text).toContain('Черновик')
    expect(text).toContain('Количество')
    expect(text).toContain('1 000')
    expect(text).toContain('800')
    expect(text).toContain('1 800')
    expect(text).toContain('1 440')
    expect(text).toContain('Скидка: 10 %')
    expect(text).toContain('01.09.2026')
  })

  it('redacts every nullable price instead of coercing null to zero', () => {
    const wrapper = mount(OrderItemCard, {
      props: {
        item: makeItem({
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
    const item = makeItem()
    const wrapper = mount(OrderItemCard, { props: { item } })

    expect(wrapper.get('[aria-label="Редактировать позицию 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Копировать позицию 7"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[aria-label="Удалить позицию 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Сменить статус позиции 7"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Количество позиции 7"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[aria-label="Копировать позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Количество позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество позиции 7"]').trigger('change')

    expect(wrapper.emitted('copy')?.[0]).toEqual([item])
    expect(wrapper.emitted('updateQuantity')?.[0]).toEqual([item, 3])
  })

  it('edits commercial terms and deadline and recalculates only from server capabilities', async () => {
    const item = makeItem({
      allowedActions: [
        'order_item.change_terms',
        'order_item.change_deadline',
        'order_item.calculate',
        'order_item.transition',
      ],
      availableTransitions: ['approval', 'cancelled'],
    })
    const wrapper = mount(OrderItemCard, { props: { item } })

    await wrapper.get('[aria-label="Тип корректировки позиции 7"]').setValue('markup')
    await wrapper.get('[aria-label="Значение корректировки позиции 7"]').setValue('15')
    await wrapper.get('[aria-label="Единица корректировки позиции 7"]').setValue('fixed')
    await wrapper.get('[aria-label="Сохранить корректировку позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Плановый срок позиции 7"]').setValue('2026-09-15')
    await wrapper.get('[aria-label="Сохранить срок позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Пересчитать позицию 7"]').trigger('click')
    await wrapper.get('[aria-label="Новый статус позиции 7"]').setValue('cancelled')
    await wrapper.get('[aria-label="Сменить статус позиции 7"]').trigger('click')

    expect(wrapper.emitted('updateAdjustment')?.[0]).toEqual([
      item,
      { adjustmentType: 'markup', adjustmentValue: 15, adjustmentUnit: 'fixed' },
    ])
    expect(wrapper.emitted('updateDeadline')?.[0]).toEqual([item, '2026-09-15'])
    expect(wrapper.emitted('recalculate')?.[0]).toEqual([item])
    expect(wrapper.emitted('transition')?.[0]).toEqual([item, 'cancelled'])
    expect(wrapper.find('[aria-label="Новый статус позиции 7"] option[value="production"]').exists()).toBe(false)
  })
})
