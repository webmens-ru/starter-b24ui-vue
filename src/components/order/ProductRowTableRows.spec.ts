import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import type { ProductRowSummary } from '../../app/api/productRows'
import ProductRowTableRows from './ProductRowTableRows.vue'

function makeProductRow(overrides: Partial<ProductRowSummary> = {}): ProductRowSummary {
  return {
    id: 7, orderId: 42, productType: 'wicket', modelId: '3', parentProductRowId: null,
    materialItemId: null, rowKind: 'product', relationRole: null, name: 'Калитка', article: null, unit: null,
    quantity: 2, sortOrder: 10,
    status: { id: 1, code: 'draft', name: 'Черновик', color: '#777777' },
    baseRetailUnitPrice: 1000, baseDealerUnitPrice: 800, finalRetailUnitPrice: 900, finalDealerUnitPrice: 720,
    retailTotalPrice: 1800, dealerTotalPrice: 1440,
    adjustmentType: 'discount', adjustmentValue: 10, adjustmentUnit: 'percent', plannedCompletionAt: '2026-09-01',
    lastCalculatedAt: 1788200000, isActual: true, calculationError: null, lockVersion: 4,
    allowedActions: ['product_row.copy', 'product_row.change_quantity'], availableTransitions: [], ...overrides,
  }
}

function mountRows(productRow = makeProductRow(), props: { disabled?: boolean; reorderDisabled?: boolean; canMoveUp?: boolean; canMoveDown?: boolean; costDetailsUrl?: string; pdfUrl?: string; htmlUrl?: string } = {}) {
  return mount(ProductRowTableRows, { props: { productRow, canMoveUp: false, canMoveDown: false, ...props } })
}

async function openActions(wrapper: ReturnType<typeof mountRows>, id = 7): Promise<void> {
  await wrapper.get(`[aria-label="Действия товарной позиции ${id}"]`).trigger('click')
}

describe('ProductRowTableRows', () => {
  it('forwards the page-provided PDF URL to the actions menu', async () => {
    const wrapper = mountRows(makeProductRow(), {
      pdfUrl: '/pdf-for-production?order_id=42&productRowId=7&model_id=3',
    })
    await openActions(wrapper)

    expect(wrapper.get('[aria-label="Сформировать PDF товарной позиции 7"]').attributes('href'))
      .toBe('/pdf-for-production?order_id=42&productRowId=7&model_id=3')
  })

  it('forwards the page-provided HTML URL to the actions menu', async () => {
    const wrapper = mountRows(makeProductRow(), {
      pdfUrl: '/pdf-for-production?order_id=42&productRowId=7&model_id=3',
      htmlUrl: '/pdf-for-production?order_id=42&productRowId=7&model_id=3&format=html',
    })
    await openActions(wrapper)

    expect(wrapper.get('[aria-label="Сформировать HTML товарной позиции 7"]').attributes('href'))
      .toBe('/pdf-for-production?order_id=42&productRowId=7&model_id=3&format=html')
  })

  it('renders one spacious aligned card with six labelled cells', () => {
    const wrapper = mountRows()
    const card = wrapper.get('[data-product-row="7"][role="rowgroup"]')
    const main = card.get('[data-product-row-main][role="row"]')
    expect(main.classes()).toContain('product-row-grid')
    expect(main.findAll('[role="cell"]')).toHaveLength(6)
    expect(main.get('[data-label="Товарная позиция"] [data-product-row-eyebrow]').text()).toBe('Позиция №7')
    expect(main.get('[data-label="Товарная позиция"] [data-product-row-title]').text()).toBe('Калитка')
  })

  it('keeps dealer prices primary and retail prices secondary', () => {
    const wrapper = mountRows()
    const unit = wrapper.get('[data-label="Цена за единицу"]')
    expect(unit.get('[data-price-kind="final-dealer-unit"]').text()).toMatch(/720/)
    expect(unit.get('[data-price-kind="final-retail-unit"]').text()).toMatch(/900/)
    expect(unit.get('[data-price-kind="final-dealer-unit"]').classes()).toContain('font-semibold')
    expect(unit.get('[data-price-kind="final-retail-unit"]').classes()).toContain('text-gray-500')
  })

  it('hides saved prices until the product row calculation is actual', async () => {
    const wrapper = mountRows(makeProductRow({ isActual: false }))
    expect(wrapper.findAll('[data-price-kind]')).toHaveLength(0)
    expect(wrapper.get('[data-label="Цена за единицу"]').text()).toContain('Требуется расчёт')
    expect(wrapper.get('[data-label="Сумма"]').text()).toContain('Требуется расчёт')
    expect(wrapper.text()).not.toMatch(/720|900|1[\s ]?440|1[\s ]?800/)

    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    const details = wrapper.get('[data-product-row-details]')
    expect(details.text()).toContain('Требуется расчёт')
    expect(details.text()).not.toMatch(/720|800|900|1[\s ]?000|1[\s ]?440|1[\s ]?800/)
  })

  it('renders status as a badge and deadline as separate secondary text', () => {
    const wrapper = mountRows()
    expect(wrapper.get('[data-product-row-status]').attributes('data-status-badge')).toBe('')
    expect(wrapper.get('[data-product-row-deadline]').text()).toBe('Срок: 01.09.2026')
  })

  it('renders a full-width calculation error strip with details action', () => {
    const wrapper = mountRows(makeProductRow({ calculationError: 'Проблемы в данных справочников' }))
    const error = wrapper.get('[data-product-row-error]')
    expect(error.classes()).toEqual(expect.arrayContaining(['bg-red-50', 'text-red-700']))
    expect(error.text()).toContain('Проблемы в данных справочников')
    expect(error.get('[aria-label="Подробнее об ошибке расчёта товарной позиции 7"]')).toBeTruthy()
  })

  it('keeps the action menu outside clipping card boundaries', async () => {
    const wrapper = mountRows()
    await openActions(wrapper)
    let ancestor: HTMLElement | null = wrapper.get('[role="menu"]').element.parentElement
    while (ancestor) {
      expect(ancestor.classList).not.toContain('overflow-hidden')
      if (ancestor === wrapper.element) break
      ancestor = ancestor.parentElement
    }
  })

  it('expands price and terms details', async () => {
    const wrapper = mountRows()
    expect(wrapper.find('[data-product-row-details]').exists()).toBe(false)
    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    const details = wrapper.get('[data-product-row-details]')
    const detailsText = details.text().replace(/\s+/g, ' ')
    expect(details.text()).toContain('Базовая цена за единицу')
    expect(detailsText).toContain('1 000')
    expect(detailsText).toContain('800')
    expect(detailsText).toContain('900')
    expect(detailsText).toContain('1 800')
    expect(detailsText).toContain('Скидка: 10 %')
    expect(detailsText).toContain('Плановый срок')
  })

  it('keeps calculation errors visible before details are expanded', () => {
    const wrapper = mountRows(makeProductRow({ calculationError: 'Не удалось рассчитать позицию' }))
    expect(wrapper.get('[data-product-row-error]').text()).toContain('Не удалось рассчитать позицию')
    expect(wrapper.find('[data-product-row-details]').exists()).toBe(false)
  })

  it('redacts nullable prices instead of coercing them to zero', async () => {
    const wrapper = mountRows(makeProductRow({ baseRetailUnitPrice: null, baseDealerUnitPrice: null, finalRetailUnitPrice: null, finalDealerUnitPrice: null, retailTotalPrice: null, dealerTotalPrice: null }))
    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    expect(wrapper.text()).not.toContain('0,00')
    expect(wrapper.findAll('[data-price-redacted]')).toHaveLength(8)
  })

  it('stacks every mobile cell label above a full-width value without horizontal basis squeezing', () => {
    const wrapper = mountRows()
    const mainRow = wrapper.get('[data-product-row-main]')
    for (const label of ['Товарная позиция', 'Количество', 'Цена за единицу', 'Сумма', 'Статус', 'Действия']) {
      const cell = mainRow.get(`[data-label="${label}"]`)
      const mobileLabel = cell.get('[data-mobile-cell-label]')
      const mobileValue = cell.get('[data-mobile-cell-value]')
      expect(mobileLabel.text()).toBe(label)
      expect(mobileLabel.classes()).toEqual(expect.arrayContaining(['block', 'text-xs', 'font-medium', 'uppercase', 'tracking-wide', 'text-gray-500']))
      expect(mobileLabel.classes().some(className => className.includes('basis-'))).toBe(false)
      expect(mobileValue.classes()).toEqual(expect.arrayContaining(['block', 'w-full', 'min-w-0']))
      expect(cell.element.children[0]).toBe(mobileLabel.element)
      expect(cell.element.children[1]).toBe(mobileValue.element)
    }
  })

  it('keeps details state independent for separately mounted product rows', async () => {
    const secondRow = makeProductRow({ id: 8, modelId: '4' })
    const wrapper = mount(defineComponent({
      components: { ProductRowTableRows },
      setup: () => ({ firstRow: makeProductRow(), secondRow }),
      template: `<div><ProductRowTableRows :product-row="firstRow" :can-move-up="false" :can-move-down="true" /><ProductRowTableRows :product-row="secondRow" :can-move-up="true" :can-move-down="false" /></div>`,
    }))
    const rows = wrapper.findAll('[data-product-row]')
    await rows[0]!.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    expect(rows[0]!.find('[data-product-row-details]').exists()).toBe(true)
    expect(rows[1]!.find('[data-product-row-details]').exists()).toBe(false)
  })

  it('forwards permitted action-menu and quantity events with the current product row', async () => {
    const productRow = makeProductRow({
      allowedActions: ['product_row.edit_configuration', 'product_row.change_quantity', 'product_row.calculate', 'product_row.copy', 'product_row.delete', 'product_row.transition', 'product_row.reorder'],
      availableTransitions: ['cancelled'],
    })
    const wrapper = mountRows(productRow, {
      canMoveUp: true,
      canMoveDown: true,
      costDetailsUrl: '/order-cost-details?order_id=42&productRowId=7',
    })
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').setValue('3')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').trigger('change')
    await openActions(wrapper); await wrapper.get('[aria-label="Редактировать товарную позицию 7"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Пересчитать товарную позицию 7"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Копировать товарную позицию 7"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Открыть детализацию стоимости товарной позиции 7"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Удалить товарную позицию 7"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    await wrapper.get('[aria-label="Подтвердить удаление товарной позиции 7"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Перевести товарную позицию 7 в статус cancelled"]').trigger('click')
    await openActions(wrapper); await wrapper.get('[aria-label="Переместить товарную позицию 7 вниз"]').trigger('click')
    expect(wrapper.emitted('updateQuantity')?.[0]).toEqual([productRow, 3])
    expect(wrapper.emitted('edit')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('recalculate')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('copy')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('openCostDetails')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('delete')?.[0]).toEqual([productRow])
    expect(wrapper.emitted('transition')?.[0]).toEqual([productRow, 'cancelled'])
    expect(wrapper.emitted('move')?.[0]).toEqual([productRow, 1])
  })

  it('shows and enables controls only for server-authorized actions', async () => {
    const productRow = makeProductRow()
    const wrapper = mountRows(productRow)
    expect(wrapper.get('[aria-label="Количество товарной позиции 7"]').attributes('disabled')).toBeUndefined()
    await openActions(wrapper)
    expect(wrapper.find('[aria-label="Редактировать товарную позицию 7"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Копировать товарную позицию 7"]')).toBeTruthy()
    expect(wrapper.find('[aria-label="Удалить товарную позицию 7"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Перевести товарную позицию 7 в статус cancelled"]').exists()).toBe(false)
  })

  it('edits commercial terms and deadline only from server capabilities', async () => {
    const productRow = makeProductRow({ allowedActions: ['product_row.change_terms', 'product_row.change_deadline'] })
    const wrapper = mountRows(productRow)
    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Тип корректировки товарной позиции 7"]').setValue('markup')
    await wrapper.get('[aria-label="Значение корректировки товарной позиции 7"]').setValue('15')
    await wrapper.get('[aria-label="Единица корректировки товарной позиции 7"]').setValue('fixed')
    await wrapper.get('[aria-label="Сохранить корректировку товарной позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Плановый срок товарной позиции 7"]').setValue('2026-09-15')
    await wrapper.get('[aria-label="Сохранить срок товарной позиции 7"]').trigger('click')
    expect(wrapper.emitted('updateAdjustment')?.[0]).toEqual([productRow, { adjustmentType: 'markup', adjustmentValue: 15, adjustmentUnit: 'fixed' }])
    expect(wrapper.emitted('updateDeadline')?.[0]).toEqual([productRow, '2026-09-15'])
  })

  it('rejects invalid quantities and adjustments without emitting updates', async () => {
    const productRow = makeProductRow({ allowedActions: ['product_row.change_quantity', 'product_row.change_terms'] })
    const wrapper = mountRows(productRow)
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').setValue('0')
    await wrapper.get('[aria-label="Количество товарной позиции 7"]').trigger('change')
    await wrapper.get('[aria-label="Подробнее о товарной позиции 7"]').trigger('click')
    await wrapper.get('[aria-label="Тип корректировки товарной позиции 7"]').setValue('discount')
    await wrapper.get('[aria-label="Значение корректировки товарной позиции 7"]').setValue('-1')
    await wrapper.get('[aria-label="Сохранить корректировку товарной позиции 7"]').trigger('click')
    expect(wrapper.get<HTMLInputElement>('[aria-label="Количество товарной позиции 7"]').element.value).toBe('2')
    expect(wrapper.emitted('updateQuantity')).toBeUndefined()
    expect(wrapper.emitted('updateAdjustment')).toBeUndefined()
  })
})
