<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  calculateProductRow,
  copyProductRow,
  createInstallationProductRow,
  createMaterialProductRow,
  deleteProductRow,
  listProductRows,
  reorderProductRows,
  transitionProductRow,
  transitionOrder,
  updateProductRow,
  type ProductRowListResponse,
  type ProductRowMutationResponse,
  type ProductRowSummary,
  type UpdateProductRowPayload,
} from '../../app/api/productRows'
import ProductRowTableRows from '../../components/order/ProductRowTableRows.vue'
import AddMaterialProductRow, { type StandaloneMaterialSubmission } from '../../components/order/AddMaterialProductRow.vue'
import OrderTotals from '../../components/order/OrderTotals.vue'
import { parsePositiveDecimalId } from '../../app/positiveDecimalId'

const route = useRoute()

const result = ref<ProductRowListResponse | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const busyProductRowIds = ref<Set<number>>(new Set())
const reorderBusy = ref(false)
const orderTransitionBusy = ref(false)
const loadFailed = ref(false)
const staleView = ref(false)
const addProductButton = ref<HTMLButtonElement | null>(null)
const addMaterialButton = ref<HTMLButtonElement | null>(null)
const pageMain = ref<HTMLElement | null>(null)
const addMaterialOpen = ref(false)
const addMaterialBusy = ref(false)
let latestLoadId = 0
let routeGeneration = 0

const orderIdParam = computed(() => String(route.params.orderId ?? ''))
const orderId = computed(() => {
  const parsed = parsePositiveDecimalId(orderIdParam.value)
  return parsed.kind === 'valid' ? parsed.value : Number.NaN
})
const embeddedInOrderCard = computed(() => isOrderCardEmbedded(window._PARAMS_?.placementOptions?.params))
const canReorder = computed(() => {
  const roots = groupedProductRows.value.roots
  return roots.length > 1
    && roots.every(productRow => productRow.allowedActions.includes('product_row.reorder'))
})

interface GroupedProductRows {
  roots: ProductRowSummary[]
  groups: Array<{ root: ProductRowSummary, children: ProductRowSummary[] }>
  rows: Array<{ productRow: ProductRowSummary, depth: 0 | 1 }>
}

const groupedProductRows = computed<GroupedProductRows>(() => {
  const productRows = result.value?.productRows ?? []
  const rootIds = new Set(productRows.filter(row => row.parentProductRowId === null).map(row => row.id))
  const roots = [...productRows]
    .filter(row => row.parentProductRowId === null || !rootIds.has(row.parentProductRowId))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
  const childrenByParentId = new Map<number, ProductRowSummary[]>()
  for (const productRow of productRows) {
    if (productRow.parentProductRowId === null || !rootIds.has(productRow.parentProductRowId)) continue
    const children = childrenByParentId.get(productRow.parentProductRowId) ?? []
    children.push(productRow)
    childrenByParentId.set(productRow.parentProductRowId, children)
  }
  const groups: GroupedProductRows['groups'] = []
  const rows: GroupedProductRows['rows'] = []
  for (const root of roots) {
    const children = [...(childrenByParentId.get(root.id) ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
    )
    groups.push({ root, children })
    rows.push({ productRow: presentationProductRow(root), depth: 0 })
    for (const child of children) {
      rows.push({ productRow: presentationProductRow(child), depth: 1 })
    }
  }
  return { roots, groups, rows }
})

function presentationProductRow(productRow: ProductRowSummary): ProductRowSummary {
  if (productRow.parentProductRowId === null && productRow.rowKind === 'product') return productRow
  const prefix = productRow.rowKind === 'service' ? 'Услуга' : 'Комплектующее'
  return {
    ...productRow,
    name: `${prefix}: ${productRow.name}`,
    allowedActions: productRow.parentProductRowId === null
      ? productRow.allowedActions.filter(action => action !== 'product_row.edit_configuration' && action !== 'product_row.calculate')
      : productRow.allowedActions.filter(action => ![
          'product_row.edit_configuration',
          'product_row.calculate',
          'product_row.reorder',
        ].includes(action)),
  }
}

function isOrderCardEmbedded(params: TPlacementOptions['params'] | undefined): boolean {
  return params?.orderCardEmbedded === true
}

function isSameOriginProductRowUrl(url: unknown, expectedOrderId: number): url is string {
  if (
    typeof url !== 'string'
    || !url.startsWith('/')
    || url.startsWith('//')
    || url.startsWith('/\\')
  ) return false

  const parsed = new URL(url, window.location.origin)
  return parsed.origin === window.location.origin && parsed.searchParams.get('id') === String(expectedOrderId)
}

function navigateTop(url: string): void {
  const testNavigateTop = window.__productRowsNavigateTop__
  if (testNavigateTop) {
    testNavigateTop(url)
    return
  }
  window.top?.location.assign(url)
}

function configurationNavigationError(): void {
  errorMessage.value = 'Ссылка на конфигуратор недоступна'
}

function navigateToConfiguration(url: unknown): void {
  if (!validOrderId() || !isSameOriginProductRowUrl(url, orderId.value)) {
    configurationNavigationError()
    return
  }
  navigateTop(url)
}

function validOrderId(): boolean {
  return Number.isInteger(orderId.value) && orderId.value > 0
}

function setBusy(productRowId: number, busy: boolean): void {
  const next = new Set(busyProductRowIds.value)
  if (busy) next.add(productRowId)
  else next.delete(productRowId)
  busyProductRowIds.value = next
}

function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}

function mutationMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message
      ?? error.response?.data?.error?.message
    if (typeof serverMessage === 'string' && serverMessage.trim() !== '') return serverMessage
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить действие с товарной позицией'
}

type LoadResult = 'loaded' | 'failed' | 'stale'

async function loadProductRows(options: { preserveNotice?: boolean } = {}): Promise<LoadResult> {
  const loadId = ++latestLoadId
  const requestedOrderId = orderId.value
  if (!validOrderId()) {
    errorMessage.value = 'Некорректный номер заказа'
    loadFailed.value = false
    loading.value = false
    return 'failed'
  }
  loading.value = true
  errorMessage.value = null
  loadFailed.value = false
  if (!options.preserveNotice) noticeMessage.value = null
  try {
    const response = await listProductRows(requestedOrderId)
    if (loadId !== latestLoadId || orderId.value !== requestedOrderId) return 'stale'
    result.value = response
    staleView.value = false
    return 'loaded'
  } catch {
    if (loadId !== latestLoadId || orderId.value !== requestedOrderId) return 'stale'
    errorMessage.value = 'Не удалось загрузить состав заказа'
    loadFailed.value = true
    staleView.value = result.value !== null
    return 'failed'
  } finally {
    if (loadId === latestLoadId && orderId.value === requestedOrderId) loading.value = false
  }
}

function applyMutation(response: ProductRowMutationResponse): void {
  if (!result.value) return
  const index = result.value.productRows.findIndex(productRow => productRow.id === response.productRow.id)
  if (index >= 0) result.value.productRows.splice(index, 1, response.productRow)
  result.value.orderTotals = response.orderTotals
}

function isCurrentRoute(generation: number, mutationOrderId: number): boolean {
  return generation === routeGeneration && orderId.value === mutationOrderId
}

async function runLockedProductRowMutation(
  productRow: ProductRowSummary,
  operation: () => Promise<ProductRowMutationResponse>,
  options: { reload?: boolean } = {},
): Promise<void> {
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  setBusy(productRow.id, true)
  errorMessage.value = null
  noticeMessage.value = null
  try {
    const response = await operation()
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (options.reload) {
      const refreshResult = await loadProductRows()
      if (refreshResult === 'failed' && isCurrentRoute(generation, mutationOrderId)) {
        errorMessage.value = 'Действие выполнено, но состав заказа не удалось обновить'
      }
    } else applyMutation(response)
  } catch (error) {
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (isConflict(error)) {
      noticeMessage.value = 'Товарная позиция уже была изменена другим пользователем'
      await loadProductRows({ preserveNotice: true })
    } else {
      errorMessage.value = mutationMessage(error)
    }
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) setBusy(productRow.id, false)
  }
}

async function runReloadingProductRowAction(
  productRow: ProductRowSummary,
  operation: () => Promise<unknown>,
): Promise<void> {
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  setBusy(productRow.id, true)
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await operation()
    if (!isCurrentRoute(generation, mutationOrderId)) return
    const refreshResult = await loadProductRows()
    if (refreshResult === 'failed' && isCurrentRoute(generation, mutationOrderId)) {
      errorMessage.value = 'Действие выполнено, но состав заказа не удалось обновить'
    }
  } catch (error) {
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (isConflict(error)) {
      noticeMessage.value = 'Товарная позиция уже была изменена другим пользователем'
      await loadProductRows({ preserveNotice: true })
    } else {
      errorMessage.value = mutationMessage(error)
    }
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) setBusy(productRow.id, false)
  }
}

function editProductRow(productRow: ProductRowSummary): void {
  if (!Number.isSafeInteger(productRow.id) || productRow.id <= 0) {
    configurationNavigationError()
    return
  }
  const template = window._PARAMS_?.placementOptions?.params?.productRowUpdateUrlTemplate
  if (typeof template !== 'string' || !template.includes('{productRowId}')) {
    configurationNavigationError()
    return
  }
  navigateToConfiguration(template.replace('{productRowId}', String(productRow.id)))
}

async function copyProductRowAction(productRow: ProductRowSummary): Promise<void> {
  await runLockedProductRowMutation(productRow, () => copyProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    lockVersion: productRow.lockVersion,
  }), { reload: true })
}

async function updateQuantity(productRow: ProductRowSummary, quantity: number): Promise<void> {
  await runLockedProductRowMutation(productRow, () => updateProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    lockVersion: productRow.lockVersion,
    quantity,
  }))
}

async function updateAdjustment(
  productRow: ProductRowSummary,
  adjustment: Pick<
    UpdateProductRowPayload,
    'adjustmentType' | 'adjustmentValue' | 'adjustmentUnit'
  >,
): Promise<void> {
  await runLockedProductRowMutation(productRow, () => updateProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    lockVersion: productRow.lockVersion,
    ...adjustment,
  }))
}

async function updateDeadline(productRow: ProductRowSummary, plannedCompletionAt: string | null): Promise<void> {
  await runLockedProductRowMutation(productRow, () => updateProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    lockVersion: productRow.lockVersion,
    plannedCompletionAt,
  }))
}

async function recalculateProductRow(productRow: ProductRowSummary): Promise<void> {
  const modelId = productRow.modelId
  if (modelId === null) return
  await runReloadingProductRowAction(productRow, () => calculateProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    modelId,
    lockVersion: productRow.lockVersion,
  }))
}

async function deleteProductRowAction(productRow: ProductRowSummary): Promise<void> {
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  const originalIndex = result.value?.productRows.findIndex(row => row.id === productRow.id) ?? -1
  const deletingRowSelector = `[data-product-row="${productRow.id}"]`
  let shouldRestoreFocus = Boolean(document.activeElement?.closest(deletingRowSelector))
  const trackFocusOwnership = (event: FocusEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target === document.body || target === document.documentElement) return
    if (!target.closest(deletingRowSelector)) shouldRestoreFocus = false
  }
  document.addEventListener('focusin', trackFocusOwnership)
  try {
    await runLockedProductRowMutation(productRow, () => deleteProductRow({
      orderId: orderId.value,
      productRowId: productRow.id,
      lockVersion: productRow.lockVersion,
    }), { reload: true })
  } finally {
    document.removeEventListener('focusin', trackFocusOwnership)
  }
  if (!isCurrentRoute(generation, mutationOrderId) || !result.value) return
  if (!shouldRestoreFocus) return
  if (result.value.productRows.some(row => row.id === productRow.id)) return

  const adjacentRow = result.value.productRows[Math.min(originalIndex, result.value.productRows.length - 1)]
  await nextTick()
  const target = adjacentRow
    ? pageMain.value?.querySelector<HTMLButtonElement>(`#product-row-actions-trigger-${adjacentRow.id}`)
    : addProductButton.value ?? pageMain.value
  target?.focus()
}

async function transitionProductRowAction(productRow: ProductRowSummary, toStatus: string): Promise<void> {
  await runLockedProductRowMutation(productRow, () => transitionProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    toStatus,
    lockVersion: productRow.lockVersion,
  }))
}

async function moveProductRow(productRow: ProductRowSummary, direction: -1 | 1): Promise<void> {
  if (!result.value || staleView.value || reorderBusy.value || !canReorder.value) return
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  const index = groupedProductRows.value.roots.findIndex(root => root.id === productRow.id)
  if (index < 0) return
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= groupedProductRows.value.roots.length) return

  const reorderedGroups = [...groupedProductRows.value.groups]
  const [movedGroup] = reorderedGroups.splice(index, 1)
  const moved = movedGroup?.root
  if (!moved) return
  reorderedGroups.splice(targetIndex, 0, movedGroup)
  errorMessage.value = null
  noticeMessage.value = null
  reorderBusy.value = true
  setBusy(moved.id, true)
  try {
    const response = await reorderProductRows({
      orderId: mutationOrderId,
      productRows: reorderedGroups.flatMap(group => [group.root, ...group.children]).map(productRow => ({
        productRowId: productRow.id,
        lockVersion: productRow.lockVersion,
      })),
    })
    if (isCurrentRoute(generation, mutationOrderId) && result.value) {
      result.value = {
        ...result.value,
        productRows: response.productRows,
        orderTotals: response.orderTotals,
      }
    }
  } catch (error) {
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (isConflict(error)) {
      noticeMessage.value = 'Товарная позиция уже была изменена другим пользователем'
      await loadProductRows({ preserveNotice: true })
    } else {
      errorMessage.value = mutationMessage(error)
    }
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) {
      reorderBusy.value = false
      setBusy(moved.id, false)
    }
  }
}

function addProduct(): void {
  if (!validOrderId()) return
  navigateToConfiguration(window._PARAMS_?.placementOptions?.params?.productRowCreateUrl)
}

function openAddMaterial(): void {
  if (validOrderId()) addMaterialOpen.value = true
}

async function addMaterial(submission: StandaloneMaterialSubmission): Promise<void> {
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  addMaterialBusy.value = true
  errorMessage.value = null
  noticeMessage.value = null
  try {
    if (!submission.customerOwned) {
      await createMaterialProductRow({
        orderId: mutationOrderId,
        materialItemId: submission.materialItemId,
        quantity: submission.quantity,
      })
      if (!isCurrentRoute(generation, mutationOrderId)) return
    }
    if (submission.installationRole !== null) {
      await createInstallationProductRow({
        orderId: mutationOrderId,
        materialItemId: submission.materialItemId,
        relationRole: submission.installationRole,
      })
    }
    if (!isCurrentRoute(generation, mutationOrderId)) return
    const refreshResult = await loadProductRows()
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (refreshResult === 'failed') {
      errorMessage.value = 'Материал добавлен, но состав заказа не удалось обновить'
      return
    }
    addMaterialOpen.value = false
    await nextTick()
    addMaterialButton.value?.focus()
  } catch (error) {
    if (!isCurrentRoute(generation, mutationOrderId)) return
    errorMessage.value = mutationMessage(error)
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) addMaterialBusy.value = false
  }
}

async function transitionOrderStatus(toStatus: string): Promise<void> {
  if (embeddedInOrderCard.value) return
  if (!result.value?.orderWorkflow.availableTransitions.includes(toStatus)) return
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  orderTransitionBusy.value = true
  errorMessage.value = null
  noticeMessage.value = null
  try {
    await transitionOrder({ orderId: mutationOrderId, toStatus })
    if (!isCurrentRoute(generation, mutationOrderId)) return
    const refreshResult = await loadProductRows()
    if (refreshResult === 'failed' && isCurrentRoute(generation, mutationOrderId)) {
      errorMessage.value = 'Статус изменён, но состав заказа не удалось обновить'
    }
  } catch (error) {
    if (isCurrentRoute(generation, mutationOrderId)) errorMessage.value = mutationMessage(error)
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) orderTransitionBusy.value = false
  }
}

function orderTransitionLabel(code: string): string {
  return ({
    submitted_to_order: 'Оформить заказ',
    order_acceptance: 'Принять заказ',
    production: 'Передать в производство',
    ready: 'Заказ готов',
    shipped: 'Заказ отгружен',
    cancelled: 'Отменить заказ',
  } as Record<string, string>)[code] ?? code
}

onMounted(() => {
  void loadProductRows()
})

onUnmounted(() => {
  routeGeneration += 1
  latestLoadId += 1
})

watch(orderIdParam, () => {
  routeGeneration += 1
  result.value = null
  errorMessage.value = null
  noticeMessage.value = null
  loadFailed.value = false
  staleView.value = false
  busyProductRowIds.value = new Set()
  reorderBusy.value = false
  orderTransitionBusy.value = false
  addMaterialOpen.value = false
  addMaterialBusy.value = false
  void loadProductRows()
})
</script>

<template>
  <component :is="embeddedInOrderCard ? 'div' : 'B24App'">
    <component
      :is="embeddedInOrderCard ? 'div' : 'B24SidebarLayout'"
      v-bind="embeddedInOrderCard ? {} : { useLightContent: false, b24ui: { container: 'mt-0' } }"
    >
      <div :class="embeddedInOrderCard ? undefined : 'flex h-[calc(100vh-50px)] flex-col overflow-hidden bg-gray-50'">
        <header
          v-if="!embeddedInOrderCard"
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-800 sm:text-3xl">Заказ №{{ orderIdParam }}</h1>
            <p class="text-sm text-gray-500">Товарные позиции заказа</p>
          </div>
          <button
            v-if="result?.orderWorkflow.canCreateProductRow"
            ref="addProductButton"
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :aria-label="`Добавить товарную позицию в заказ ${orderIdParam}`"
            @click="addProduct"
          >
            Добавить товарную позицию
          </button>
          <button
            v-if="result?.orderWorkflow.canCreateProductRow"
            ref="addMaterialButton"
            type="button"
            class="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :aria-label="`Добавить материал в заказ ${orderIdParam}`"
            @click="openAddMaterial"
          >
            Добавить материал
          </button>
        </header>

        <main ref="pageMain" tabindex="-1" :class="embeddedInOrderCard ? 'p-4' : 'flex-1 overflow-y-auto p-4'">
          <div class="mx-auto flex w-full max-w-[1152px] flex-col gap-4">
            <div
              v-if="embeddedInOrderCard && result?.orderWorkflow.canCreateProductRow"
              class="flex justify-end"
            >
              <button
                type="button"
                ref="addProductButton"
                class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                :aria-label="`Добавить товарную позицию в заказ ${orderIdParam}`"
                @click="addProduct"
              >
                Добавить товарную позицию
              </button>
              <button
                type="button"
                ref="addMaterialButton"
                class="rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                :aria-label="`Добавить материал в заказ ${orderIdParam}`"
                @click="openAddMaterial"
              >
                Добавить материал
              </button>
            </div>

            <div
              v-if="noticeMessage"
              role="status"
              class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
            >
              {{ noticeMessage }}
            </div>

            <div
              v-if="errorMessage"
              role="alert"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            >
              <p>{{ errorMessage }}</p>
              <button
                v-if="loadFailed"
                type="button"
                class="mt-2 rounded border border-red-300 px-3 py-1.5 text-sm hover:bg-red-100"
                aria-label="Повторить загрузку состава заказа"
                :disabled="loading"
                @click="loadProductRows()"
              >
                Повторить
              </button>
            </div>

            <div
              v-if="loading && !result"
              role="status"
              class="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-600"
            >
              Загрузка состава заказа…
            </div>

            <template v-else-if="result">
              <AddMaterialProductRow
                v-if="addMaterialOpen"
                :order-id="orderId"
                :disabled="addMaterialBusy"
                @close="addMaterialOpen = false"
                @submit="addMaterial"
              />
              <div
                v-if="result.productRows.length === 0"
                class="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center"
              >
                <h2 class="text-lg font-semibold text-gray-800">В заказе пока нет товарных позиций</h2>
                <p class="mt-1 text-sm text-gray-500">Добавьте первую товарную позицию, чтобы начать конфигурацию.</p>
              </div>

              <div
                v-else
                data-product-rows-table
                role="table"
                aria-label="Товарные позиции заказа"
                class="grid gap-3"
              >
                <ProductRowTableRows
                  v-for="row in groupedProductRows.rows"
                  :key="row.productRow.id"
                  :data-product-row-depth="row.depth"
                  :class="row.depth === 1 ? 'ml-6' : undefined"
                  :product-row="row.productRow"
                  :disabled="staleView || busyProductRowIds.has(row.productRow.id)"
                  :reorder-disabled="staleView || reorderBusy"
                  :can-move-up="row.depth === 0 && canReorder && groupedProductRows.roots.findIndex(root => root.id === row.productRow.id) > 0"
                  :can-move-down="row.depth === 0 && canReorder && groupedProductRows.roots.findIndex(root => root.id === row.productRow.id) < groupedProductRows.roots.length - 1"
                  @edit="editProductRow"
                  @copy="copyProductRowAction"
                  @update-quantity="updateQuantity"
                  @update-adjustment="updateAdjustment"
                  @update-deadline="updateDeadline"
                  @recalculate="recalculateProductRow"
                  @delete="deleteProductRowAction"
                  @transition="transitionProductRowAction"
                  @move="(_, direction) => moveProductRow(row.productRow, direction)"
                />
              </div>

              <OrderTotals :totals="result.orderTotals" />

              <div
                v-if="!embeddedInOrderCard && result.orderWorkflow.availableTransitions.length > 0"
                class="flex flex-wrap justify-end gap-2"
              >
                <button
                  v-for="target in result.orderWorkflow.availableTransitions"
                  :key="target"
                  type="button"
                  class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                  :aria-label="`Перевести заказ в статус ${target}`"
                  :disabled="staleView || orderTransitionBusy"
                  @click="transitionOrderStatus(target)"
                >
                  {{ orderTransitionLabel(target) }}
                </button>
              </div>
            </template>
          </div>
        </main>
      </div>
    </component>
  </component>
</template>
