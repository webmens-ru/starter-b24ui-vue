<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  copyOrderItem,
  deleteOrderItem,
  listOrderItems,
  reorderOrderItems,
  transitionOrderItem,
  updateOrderItem,
  type OrderItemListResponse,
  type OrderItemMutationResponse,
  type OrderItemSummary,
} from '../../app/api/orderItems'
import OrderItemCard from '../../components/order/OrderItemCard.vue'
import OrderTotals from '../../components/order/OrderTotals.vue'

const route = useRoute()
const router = useRouter()

const result = ref<OrderItemListResponse | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const noticeMessage = ref<string | null>(null)
const busyItemIds = ref<Set<number>>(new Set())
const loadFailed = ref(false)
const staleView = ref(false)
let latestLoadId = 0
let routeGeneration = 0

const orderIdParam = computed(() => String(route.params.orderId ?? ''))
const orderId = computed(() => Number(orderIdParam.value))

function validOrderId(): boolean {
  return Number.isInteger(orderId.value) && orderId.value > 0
}

function setBusy(itemId: number, busy: boolean): void {
  const next = new Set(busyItemIds.value)
  if (busy) next.add(itemId)
  else next.delete(itemId)
  busyItemIds.value = next
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
  return error instanceof Error ? error.message : 'Не удалось выполнить действие с позицией'
}

type LoadResult = 'loaded' | 'failed' | 'stale'

async function loadItems(options: { preserveNotice?: boolean } = {}): Promise<LoadResult> {
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
    const response = await listOrderItems(requestedOrderId)
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

function applyMutation(response: OrderItemMutationResponse): void {
  if (!result.value) return
  const index = result.value.items.findIndex(item => item.id === response.item.id)
  if (index >= 0) result.value.items.splice(index, 1, response.item)
  result.value.orderTotals = response.orderTotals
}

function isCurrentRoute(generation: number, mutationOrderId: number): boolean {
  return generation === routeGeneration && orderId.value === mutationOrderId
}

async function runLockedMutation(
  item: OrderItemSummary,
  operation: () => Promise<OrderItemMutationResponse>,
  options: { reload?: boolean } = {},
): Promise<void> {
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  setBusy(item.id, true)
  errorMessage.value = null
  noticeMessage.value = null
  try {
    const response = await operation()
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (options.reload) {
      const refreshResult = await loadItems()
      if (refreshResult === 'failed' && isCurrentRoute(generation, mutationOrderId)) {
        errorMessage.value = 'Действие выполнено, но состав заказа не удалось обновить'
      }
    } else applyMutation(response)
  } catch (error) {
    if (!isCurrentRoute(generation, mutationOrderId)) return
    if (isConflict(error)) {
      noticeMessage.value = 'Позиция уже была изменена другим пользователем'
      await loadItems({ preserveNotice: true })
    } else {
      errorMessage.value = mutationMessage(error)
    }
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) setBusy(item.id, false)
  }
}

function editItem(item: OrderItemSummary): void {
  const path = item.productType === 'wicket'
    ? `/wicket/type${item.modelId}`
    : item.productType === 'swing'
      ? `/swing-gates/type${item.modelId}`
      : null
  if (!path) {
    errorMessage.value = 'Для этого типа изделия конфигуратор пока недоступен'
    return
  }
  void router.push({
    path,
    query: { orderId: String(orderId.value), orderItemId: String(item.id) },
  })
}

async function copyItem(item: OrderItemSummary): Promise<void> {
  await runLockedMutation(item, () => copyOrderItem({
    orderId: orderId.value,
    orderItemId: item.id,
  }), { reload: true })
}

async function updateQuantity(item: OrderItemSummary, quantity: number): Promise<void> {
  await runLockedMutation(item, () => updateOrderItem({
    orderId: orderId.value,
    orderItemId: item.id,
    lockVersion: item.lockVersion,
    quantity,
  }))
}

async function deleteItem(item: OrderItemSummary): Promise<void> {
  await runLockedMutation(item, () => deleteOrderItem({
    orderId: orderId.value,
    orderItemId: item.id,
    lockVersion: item.lockVersion,
  }), { reload: true })
}

async function transitionItem(item: OrderItemSummary, toStatus: string): Promise<void> {
  await runLockedMutation(item, () => transitionOrderItem({
    orderId: orderId.value,
    orderItemId: item.id,
    toStatus,
    lockVersion: item.lockVersion,
  }))
}

async function moveItem(index: number, direction: -1 | 1): Promise<void> {
  if (!result.value || staleView.value) return
  const generation = routeGeneration
  const mutationOrderId = orderId.value
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= result.value.items.length) return

  const reordered = [...result.value.items]
  const [moved] = reordered.splice(index, 1)
  if (!moved) return
  reordered.splice(targetIndex, 0, moved)
  errorMessage.value = null
  noticeMessage.value = null
  setBusy(moved.id, true)
  try {
    const response = await reorderOrderItems({
      orderId: mutationOrderId,
      itemIds: reordered.map(item => item.id),
    })
    if (isCurrentRoute(generation, mutationOrderId)) result.value = response
  } catch (error) {
    if (isCurrentRoute(generation, mutationOrderId)) errorMessage.value = mutationMessage(error)
  } finally {
    if (isCurrentRoute(generation, mutationOrderId)) setBusy(moved.id, false)
  }
}

function addProduct(): void {
  void router.push({ path: '/add-product', query: { orderId: orderIdParam.value } })
}

onMounted(() => {
  void loadItems()
})

watch(orderIdParam, () => {
  routeGeneration += 1
  result.value = null
  errorMessage.value = null
  noticeMessage.value = null
  loadFailed.value = false
  staleView.value = false
  busyItemIds.value = new Set()
  void loadItems()
})
</script>

<template>
  <B24App>
    <B24SidebarLayout :use-light-content="false" :b24ui="{ container: 'mt-0' }">
      <div class="flex h-[calc(100vh-50px)] flex-col overflow-hidden bg-gray-50">
        <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-800 sm:text-3xl">Заказ №{{ orderIdParam }}</h1>
            <p class="text-sm text-gray-500">Состав заказа</p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :aria-label="`Добавить изделие в заказ ${orderIdParam}`"
            @click="addProduct"
          >
            Добавить изделие
          </button>
        </header>

        <main class="flex-1 overflow-y-auto p-4">
          <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
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
                @click="loadItems()"
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
                v-if="result.items.length === 0"
                class="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center"
              >
                <h2 class="text-lg font-semibold text-gray-800">В заказе пока нет изделий</h2>
                <p class="mt-1 text-sm text-gray-500">Добавьте первое изделие, чтобы начать конфигурацию.</p>
              </div>

              <div v-else class="flex flex-col gap-4">
                <article
                  v-for="(item, index) in result.items"
                  :key="item.id"
                  data-order-item
                  class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <OrderItemCard
                    :item="item"
                    :disabled="staleView || busyItemIds.has(item.id)"
                    @edit="editItem"
                    @copy="copyItem"
                    @update-quantity="updateQuantity"
                    @delete="deleteItem"
                    @transition="transitionItem"
                  />
                  <div class="flex gap-2 sm:flex-col">
                    <button
                      type="button"
                      class="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Переместить позицию ${item.id} вверх`"
                      :disabled="staleView || index === 0 || busyItemIds.has(item.id)"
                      @click="moveItem(index, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      :aria-label="`Переместить позицию ${item.id} вниз`"
                      :disabled="staleView || index === result.items.length - 1 || busyItemIds.has(item.id)"
                      @click="moveItem(index, 1)"
                    >
                      ↓
                    </button>
                  </div>
                </article>
              </div>

              <OrderTotals :totals="result.orderTotals" />
            </template>
          </div>
        </main>
      </div>
    </B24SidebarLayout>
  </B24App>
</template>
