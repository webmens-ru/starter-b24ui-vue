<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCalculation } from '../composables/useCalculation'
import { createOrder } from '../app/api/wicket'
import { parsePositiveDecimalId } from '../app/positiveDecimalId'
import { navigateToCreatedOrderProductRows, navigateToProductRows } from '../app/productRowReturnNavigation'

declare const window: Window & { _HOSTNAME_?: string }

const router = useRouter()
const route = useRoute()
const calc = useCalculation()

const loading = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
let mounted = false
let lifecycleGeneration = 0

const productTypes = [
  {
    id: 'wicket',
    label: 'Калитки',
    productType: 'Калитка',
    route: '/wicket/model',
    image: '/k2.jpg',
  },
  {
    id: 'swing',
    label: 'Ворота распашные',
    productType: 'Ворота распашные',
    route: '/swing-gates/type1',
    modelId: '1',
    model: 'Ворота распашные',
    image: '/k3.jpg',
    soon: true,
  },
]

const orderIdState = computed(() => parsePositiveDecimalId(route.query.orderId))
const currentOrderId = computed(() => orderIdState.value.kind === 'valid' ? orderIdState.value.value : null)

function getImageSrc(path: string): string {
  const base = window._HOSTNAME_ || ''
  return base ? `${base}${path}` : path
}

function isCurrentLifecycle(generation: number): boolean {
  return mounted && generation === lifecycleGeneration
}

function exitToProductRows(): void {
  lifecycleGeneration += 1
  navigateToProductRows()
}

async function onProductTypeSelect(item: (typeof productTypes)[0]) {
  if (loading.value || item.soon) return
  if (orderIdState.value.kind === 'invalid') {
    errorMessage.value = 'Некорректный номер заказа'
    return
  }
  if (!currentOrderId.value) {
    errorMessage.value = 'Не указан заказ для добавления товарной позиции'
    return
  }
  loading.value = item.id
  errorMessage.value = null

  try {
    calc.orderId.value = currentOrderId.value
    calc.productType.value = item.productType

    calc.updateOrCreateBlock('calculationNumber', [
      { paramCode: 'calculationNumber', name: 'Номер расчета', value: String(currentOrderId.value) },
    ], 'Номер расчета')
    calc.updateOrCreateBlock('productType', [
      { paramCode: 'productType', name: 'Тип изделия', value: item.productType },
    ], 'Тип изделия')

    await router.push({
      path: item.route,
      query: { orderId: String(currentOrderId.value) },
    })
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Произошла ошибка при создании расчёта'
  } finally {
    loading.value = null
  }
}

onMounted(async () => {
  mounted = true
  const generation = ++lifecycleGeneration
  calc.reset()
  if (orderIdState.value.kind === 'invalid') {
    errorMessage.value = 'Некорректный номер заказа'
    return
  }
  if (currentOrderId.value) {
    calc.orderId.value = currentOrderId.value
    return
  }

  loading.value = 'order'
  errorMessage.value = null
  try {
    const order = await createOrder()
    if (!isCurrentLifecycle(generation)) return
    calc.orderId.value = order.orderId
    if (navigateToCreatedOrderProductRows(order.orderId)) {
      lifecycleGeneration += 1
    } else {
      errorMessage.value = 'Не удалось открыть созданный заказ'
    }
  } catch (e) {
    if (!isCurrentLifecycle(generation)) return
    errorMessage.value = e instanceof Error ? e.message : 'Произошла ошибка при создании заказа'
  } finally {
    if (isCurrentLifecycle(generation)) loading.value = null
  }
})

watch(() => route.query.orderId, (nextRawOrderId) => {
  if (!mounted) return
  const nextOrderIdState = parsePositiveDecimalId(nextRawOrderId)
  lifecycleGeneration += 1
  loading.value = null
  errorMessage.value = null
  calc.reset()
  if (nextOrderIdState.kind === 'invalid') {
    errorMessage.value = 'Некорректный номер заказа'
    return
  }
  if (nextOrderIdState.kind === 'valid') calc.orderId.value = nextOrderIdState.value
})

onUnmounted(() => {
  mounted = false
  lifecycleGeneration += 1
})
</script>

<template>
  <B24App>
    <B24SidebarLayout :use-light-content="false" :b24ui="{ container: 'mt-0' }">
      <div class="flex flex-col h-[calc(100vh-50px)] overflow-hidden bg-gray-50">
        <div class="flex items-center justify-between flex-wrap gap-2 shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <B24Button
            label="Назад"
            color="air-secondary"
            @click="exitToProductRows"
          />
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">
            Выберите тип изделия
          </h1>
          <div class="w-[68px]" />
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <div
            v-if="errorMessage"
            role="alert"
            class="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200"
          >
            {{ errorMessage }}
          </div>

          <div class="flex flex-wrap justify-center gap-8 sm:gap-12 lg:gap-16">
            <div
              v-for="item in productTypes"
              :key="item.id"
              class="flex flex-col items-center w-[200px] group cursor-pointer"
            >
              <button
                type="button"
                class="text-left bg-transparent border-none text-base font-medium text-air-primary hover:underline focus:outline-none focus:ring-2 focus:ring-air-primary/50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!!loading || item.soon"
                @click="onProductTypeSelect(item)"
              >
                {{ item.label }}
                <span v-if="item.soon" class="ml-1 text-xs text-amber-700">Скоро</span>
              </button>
              <div
                class="mt-2 w-full max-w-[200px] rounded border border-gray-200 overflow-hidden transition-shadow group-hover:shadow-md group-hover:border-gray-300"
                @click="onProductTypeSelect(item)"
              >
                <img
                  :src="getImageSrc(item.image)"
                  :alt="item.label"
                  class="w-full h-auto object-cover"
                  loading="lazy"
                  @error="($event.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'120\'%3E%3Crect fill=\'%23e5e7eb\' width=\'200\' height=\'120\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%239ca3af\' font-size=\'14\'%3ENo image%3C/text%3E%3C/svg%3E'"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </B24SidebarLayout>
  </B24App>
</template>
