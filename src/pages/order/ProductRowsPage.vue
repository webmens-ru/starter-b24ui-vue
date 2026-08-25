<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  calculateProductRow,
  copyProductRow,
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
import ProductRowCard from '../../components/order/ProductRowCard.vue'
import OrderTotals from '../../components/order/OrderTotals.vue'
import { parsePositiveDecimalId } from '../../app/positiveDecimalId'

const route = useRoute()
const router = useRouter()

const result = ref<ProductRowListResponse | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const busyProductRowIds = ref<Set<number>>(new Set())
const reorderBusy = ref(false)
const orderTransitionBusy = ref(false)
const loadFailed = ref(false)
const staleView = ref(false)
let latestLoadId = 0
let routeGeneration = 0

const orderIdParam = computed(() => String(route.params.orderId ?? ''))
const orderId = computed(() => {
  const parsed = parsePositiveDecimalId(orderIdParam.value)
  return parsed.kind === 'valid' ? parsed.value : Number.NaN
})
const embeddedInOrderCard = computed(() => isOrderCardEmbedded(window._PARAMS_?.placementOptions?.params))
const canReorder = computed(() => {
  const productRows = result.value?.productRows ?? []
  return productRows.length > 1
    && productRows.every(productRow => productRow.allowedActions.includes('product_row.reorder'))
})

function isOrderCardEmbedded(params: TPlacementOptions['params'] | undefined): boolean {
  return params?.orderCardEmbedded === true
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
  const path = productRow.productType === 'wicket'
    ? `/wicket/type${productRow.modelId}`
    : productRow.productType === 'swing'
      ? `/swing-gates/type${productRow.modelId}`
      : null
  if (!path) {
    errorMessage.value = 'Для этого типа изделия конфигуратор пока недоступен'
    return
  }
  void router.push({
    path,
    query: { orderId: String(orderId.value), productRowId: String(productRow.id) },
  })
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
  await runReloadingProductRowAction(productRow, () => calculateProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    modelId: productRow.modelId,
    lockVersion: productRow.lockVersion,
  }))
}

async function deleteProductRowAction(productRow: ProductRowSummary): Promise<void> {
  await runLockedProductRowMutation(productRow, () => deleteProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    lockVersion: productRow.lockVersion,
  }), { reload: true })
}

async function transitionProductRowAction(productRow: ProductRowSummary, toStatus: string): Promise<void> {
  await runLockedProductRowMutation(productRow, () => transitionProductRow({
    orderId: orderId.value,
    productRowId: productRow.id,
    toStatus,
    lockVersion: productRow.lockVersion,
  }))
}

async function moveProductRow(index: number, direction: -1 | 1): Promise<void> {
  if (!result.value || staleView.value || reorderBusy.value || !canReorder.value) return
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= result.value.productRows.length) return

  const reordered = [...result.value.productRows]
  const [moved] = reordered.splice(index, 1)
  if (!moved) return
  reordered.splice(targetIndex, 0, moved)
  errorMessage.value = null
  noticeMessage.value = null
  reorderBusy.value = true
  setBusy(moved.id, true)
  try {
    const response = await reorderProductRows({
      orderId: mutationOrderId,
      productRows: reordered.map(productRow => ({
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
  void router.push({ path: '/add-product', query: { orderId: String(orderId.value) } })
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
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :aria-label="`Добавить товарную позицию в заказ ${orderIdParam}`"
            @click="addProduct"
          >
            Добавить товарную позицию
          </button>
        </header>

        <main :class="embeddedInOrderCard ? 'p-4' : 'flex-1 overflow-y-auto p-4'">
          <div class="mx-auto flex w-full max-w-[1152px] flex-col gap-4">
            <div
              v-if="embeddedInOrderCard && result?.orderWorkflow.canCreateProductRow"
              class="flex justify-end"
            >
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                :aria-label="`Добавить товарную позицию в заказ ${orderIdParam}`"
                @click="addProduct"
              >
                Добавить товарную позицию
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
              <div
                v-if="result.productRows.length === 0"
                class="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center"
              >
                <h2 class="text-lg font-semibold text-gray-800">В заказе пока нет товарных позиций</h2>
                <p class="mt-1 text-sm text-gray-500">Добавьте первую товарную позицию, чтобы начать конфигурацию.</p>
              </div>

              <div v-else class="flex flex-col gap-4">
                <article
                  v-for="(productRow, index) in result.productRows"
                  :key="productRow.id"
                  data-product-row
                  class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <ProductRowCard
                    :product-row="productRow"
                    :disabled="staleView || reorderBusy || busyProductRowIds.has(productRow.id)"
                    @edit="editProductRow"
                    @copy="copyProductRowAction"
                    @update-quantity="updateQuantity"
                    @update-adjustment="updateAdjustment"
                    @update-deadline="updateDeadline"
                    @recalculate="recalculateProductRow"
                    @delete="deleteProductRowAction"
                    @transition="transitionProductRowAction"
                  />
                  <div v-if="canReorder" class="flex gap-2 sm:flex-col">
                    <button
                      type="button"
                      class="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Переместить товарную позицию ${productRow.id} вверх`"
                      :disabled="reorderBusy || staleView || index === 0 || busyProductRowIds.has(productRow.id)"
                      @click="moveProductRow(index, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Переместить товарную позицию ${productRow.id} вниз`"
                      :disabled="reorderBusy || staleView || index === result.productRows.length - 1 || busyProductRowIds.has(productRow.id)"
                      @click="moveProductRow(index, 1)"
                    >
                      ↓
                    </button>
                  </div>
                </article>
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
