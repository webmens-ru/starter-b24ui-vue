import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import type { ProductRowSummary } from '../../app/api/productRows'
import ProductRowActionsMenu from './ProductRowActionsMenu.vue'

function makeProductRow(overrides: Partial<ProductRowSummary> = {}): ProductRowSummary {
  return {
    id: 7,
    orderId: 42,
    productType: 'wicket',
    modelId: '3',
    parentProductRowId: null, materialItemId: null, rowKind: 'product', relationRole: null,
    name: 'Калитка', article: null, unit: null,
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

async function openMenu(row = makeProductRow(), props: { disabled?: boolean; reorderDisabled?: boolean; canMoveUp?: boolean; canMoveDown?: boolean; costDetailsUrl?: string } = {}) {
  const wrapper = mount(ProductRowActionsMenu, {
    props: { productRow: row, canMoveUp: true, canMoveDown: true, ...props },
  })
  await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
  return wrapper
}

async function openAttachedMenu(row = makeProductRow()) {
  const wrapper = mount(ProductRowActionsMenu, {
    attachTo: document.body,
    props: { productRow: row, canMoveUp: true, canMoveDown: true },
  })
  await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
  return wrapper
}

describe('ProductRowActionsMenu', () => {
  it('shows the cost details action only when the server provides its URL', async () => {
    const row = makeProductRow()
    const hidden = await openMenu(row)
    expect(hidden.find(`[aria-label="Открыть детализацию стоимости товарной позиции ${row.id}"]`).exists()).toBe(false)

    const visible = await openMenu(row, {
      costDetailsUrl: '/order-cost-details?order_id=42&productRowId=7',
    })
    const action = visible.get(`[aria-label="Открыть детализацию стоимости товарной позиции ${row.id}"]`)
    await action.trigger('click')

    expect(visible.emitted('openCostDetails')).toEqual([[]])
    expect(visible.find('[role="menu"]').exists()).toBe(false)
  })

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

  it('emits each selected non-destructive action and closes the menu immediately', async () => {
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
  })

  it('visually separates the destructive action from the other actions', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row)

    const destructiveActions = wrapper.get('[data-destructive-actions]')
    expect(destructiveActions.classes()).toContain('border-t')
    expect(destructiveActions.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).classes()).toContain('text-red-700')
  })

  it('requires an accessible confirmation and emits delete only after acceptance', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row)

    await wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Удалить товарную позицию?')

    await wrapper.get(`[aria-label="Отменить удаление товарной позиции ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)

    await wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).trigger('click')
    await wrapper.get(`[aria-label="Подтвердить удаление товарной позиции ${row.id}"]`).trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('keeps the delete confirmation open after a native bubbling click', async () => {
    const row = makeProductRow()
    const wrapper = mount(
      defineComponent({
        components: { ProductRowActionsMenu },
        setup: () => {
          const visible = ref(true)
          const handleHostClick = (event: MouseEvent): void => {
            if ((event.target as HTMLElement).getAttribute('aria-label') === `Удалить товарную позицию ${row.id}`) {
              visible.value = false
            }
          }
          return { row, visible, handleHostClick }
        },
        template: `
          <div @click="handleHostClick">
            <ProductRowActionsMenu v-if="visible" :product-row="row" :can-move-up="true" :can-move-down="true" />
          </div>
        `,
      }),
      { attachTo: document.body },
    )

    try {
      await wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).trigger('click')
      const deleteAction = wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`)
      deleteAction.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()

      expect(wrapper.get('[role="alertdialog"]').text()).toContain('Удалить товарную позицию?')
      expect(wrapper.findComponent(ProductRowActionsMenu).emitted('delete')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('moves focus into the announced delete confirmation and restores the delete action on cancel', async () => {
    const row = makeProductRow()
    const wrapper = await openAttachedMenu(row)

    try {
      const deleteAction = wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`)
      ;(deleteAction.element as HTMLButtonElement).focus()
      expect(document.activeElement).toBe(deleteAction.element)

      await deleteAction.trigger('click')
      await nextTick()

      const dialog = wrapper.get('[role="alertdialog"]')
      const cancel = wrapper.get(`[aria-label="Отменить удаление товарной позиции ${row.id}"]`)
      expect(dialog.attributes('aria-labelledby')).toBe(`delete-confirmation-title-${row.id}`)
      expect(wrapper.get(`#delete-confirmation-title-${row.id}`).text()).toBe('Удалить товарную позицию?')
      expect(document.activeElement).toBe(cancel.element)

      await cancel.trigger('click')
      await nextTick()

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
      expect(document.activeElement).toBe(
        wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).element,
      )
    } finally {
      wrapper.unmount()
    }
  })

  it('closes delete confirmation on Escape and restores the menu trigger focus', async () => {
    const row = makeProductRow()
    const wrapper = await openAttachedMenu(row)

    try {
      await wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).trigger('click')
      await nextTick()
      const cancel = wrapper.get(`[aria-label="Отменить удаление товарной позиции ${row.id}"]`)
      expect(document.activeElement).toBe(cancel.element)

      await cancel.trigger('keydown', { key: 'Escape' })
      await nextTick()

      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
      expect(document.activeElement).toBe(
        wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).element,
      )
    } finally {
      wrapper.unmount()
    }
  })

  it('emits delete once on confirmation and leaves focus on the menu trigger', async () => {
    const row = makeProductRow()
    const wrapper = await openAttachedMenu(row)

    try {
      await wrapper.get(`[aria-label="Удалить товарную позицию ${row.id}"]`).trigger('click')
      await nextTick()
      const confirm = wrapper.get(`[aria-label="Подтвердить удаление товарной позиции ${row.id}"]`)
      ;(confirm.element as HTMLButtonElement).focus()

      await confirm.trigger('click')
      await nextTick()

      expect(wrapper.emitted('delete')).toHaveLength(1)
      expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
      expect(document.activeElement).toBe(
        wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`).element,
      )
    } finally {
      wrapper.unmount()
    }
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

  it('keeps non-reorder actions enabled while globally disabling every move command', async () => {
    const row = makeProductRow()
    const wrapper = await openMenu(row, { reorderDisabled: true })

    const copy = wrapper.get(`[aria-label="Копировать товарную позицию ${row.id}"]`)
    const moveUp = wrapper.get(`[aria-label="Переместить товарную позицию ${row.id} вверх"]`)
    const moveDown = wrapper.get(`[aria-label="Переместить товарную позицию ${row.id} вниз"]`)
    expect(copy.attributes('disabled')).toBeUndefined()
    expect(moveUp.attributes('disabled')).toBeDefined()
    expect(moveDown.attributes('disabled')).toBeDefined()

    await moveDown.trigger('click')
    expect(wrapper.emitted('move')).toBeUndefined()
    await copy.trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })

  it('opens from the keyboard and navigates enabled menu items with Arrow keys, Home, and End', async () => {
    const row = makeProductRow()
    const wrapper = mount(ProductRowActionsMenu, {
      attachTo: document.body,
      props: { productRow: row, canMoveUp: true, canMoveDown: true },
    })

    try {
      const trigger = wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`)
      ;(trigger.element as HTMLButtonElement).focus()
      await trigger.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      const items = wrapper.findAll('[role="menuitem"]')
        .filter(item => item.attributes('disabled') === undefined)
      const lastItem = items[items.length - 1]!
      expect(items.length).toBeGreaterThan(3)
      expect(wrapper.get('[role="menu"]').attributes('aria-labelledby')).toBe(
        `product-row-actions-trigger-${row.id}`,
      )
      expect(trigger.attributes('id')).toBe(`product-row-actions-trigger-${row.id}`)
      expect(items.map(item => item.attributes('tabindex'))).toEqual([
        '0',
        ...Array.from({ length: items.length - 1 }, () => '-1'),
      ])
      expect(document.activeElement).toBe(items[0]!.element)

      await items[0]!.trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(items[1]!.element)
      expect(items[0]!.attributes('tabindex')).toBe('-1')
      expect(items[1]!.attributes('tabindex')).toBe('0')
      await items[1]!.trigger('keydown', { key: 'End' })
      expect(document.activeElement).toBe(lastItem.element)
      await lastItem.trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(items[0]!.element)
      await items[0]!.trigger('keydown', { key: 'ArrowUp' })
      expect(document.activeElement).toBe(lastItem.element)
      await lastItem.trigger('keydown', { key: 'Home' })
      expect(document.activeElement).toBe(items[0]!.element)

      await items[0]!.trigger('keydown', { key: 'Escape' })
      await nextTick()
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
      expect(document.activeElement).toBe(trigger.element)
    } finally {
      wrapper.unmount()
    }
  })

  it('closes on Tab exit and allows keyboard opening of only the newly focused row menu', async () => {
    const firstRow = makeProductRow({ id: 7 })
    const secondRow = makeProductRow({ id: 8 })
    const wrapper = mount(
      defineComponent({
        components: { ProductRowActionsMenu },
        setup: () => ({ firstRow, secondRow }),
        template: `
          <div>
            <ProductRowActionsMenu :product-row="firstRow" :can-move-up="false" :can-move-down="true" />
            <ProductRowActionsMenu :product-row="secondRow" :can-move-up="true" :can-move-down="false" />
          </div>
        `,
      }),
      { attachTo: document.body },
    )

    try {
      const firstTrigger = wrapper.get('[aria-label="Действия товарной позиции 7"]')
      const secondTrigger = wrapper.get('[aria-label="Действия товарной позиции 8"]')
      ;(firstTrigger.element as HTMLButtonElement).focus()
      await firstTrigger.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)

      const firstItem = wrapper.findAll('[role="menuitem"]')
        .find(item => item.attributes('disabled') === undefined)!
      await firstItem.trigger('keydown', { key: 'Tab' })
      await nextTick()
      expect(wrapper.findAll('[role="menu"]')).toHaveLength(0)
      expect(document.activeElement).toBe(secondTrigger.element)

      await secondTrigger.trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)
      expect(wrapper.find('[aria-label="Редактировать товарную позицию 7"]').exists()).toBe(false)
      expect(wrapper.find('[aria-label="Редактировать товарную позицию 8"]').exists()).toBe(true)

      const secondFirstItem = wrapper.findAll('[role="menuitem"]')
        .find(item => item.attributes('disabled') === undefined)!
      await secondFirstItem.trigger('keydown', { key: 'Tab', shiftKey: true })
      await nextTick()
      expect(wrapper.findAll('[role="menu"]')).toHaveLength(0)
      expect(document.activeElement).toBe(secondTrigger.element)
    } finally {
      wrapper.unmount()
    }
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

  it('keeps only one product-row menu open at a time', async () => {
    const firstRow = makeProductRow({ id: 7 })
    const secondRow = makeProductRow({ id: 8 })
    const wrapper = mount(
      defineComponent({
        components: { ProductRowActionsMenu },
        setup: () => ({ firstRow, secondRow }),
        template: `
          <div>
            <ProductRowActionsMenu :product-row="firstRow" :can-move-up="false" :can-move-down="true" />
            <ProductRowActionsMenu :product-row="secondRow" :can-move-up="true" :can-move-down="false" />
          </div>
        `,
      }),
      { attachTo: document.body },
    )

    await wrapper.get('[aria-label="Действия товарной позиции 7"]').trigger('click')
    expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)
    await wrapper.get('[aria-label="Действия товарной позиции 8"]').trigger('click')
    expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)
    expect(wrapper.find('[aria-label="Редактировать товарную позицию 7"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Редактировать товарную позицию 8"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('cannot open or emit an action while disabled', async () => {
    const row = makeProductRow()
    const wrapper = mount(ProductRowActionsMenu, {
      attachTo: document.body,
      props: { productRow: row, disabled: true, canMoveUp: true, canMoveDown: true },
    })
    const trigger = wrapper.get(`[aria-label="Действия товарной позиции ${row.id}"]`)

    expect(trigger.attributes('disabled')).toBeUndefined()
    expect(trigger.attributes('aria-disabled')).toBe('true')
    ;(trigger.element as HTMLButtonElement).focus()
    expect(document.activeElement).toBe(trigger.element)
    await trigger.trigger('click')
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    for (const event of ['edit', 'recalculate', 'copy', 'delete', 'transition', 'move']) {
      expect(wrapper.emitted(event)).toBeUndefined()
    }
    wrapper.unmount()
  })
})
