<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCalculation } from '../../composables/useCalculation'
import { createWicketMainMenu } from '../../app/api/wicket'

declare const window: Window & { _HOSTNAME_?: string }

const router = useRouter()
const calc = useCalculation()

const loading = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const modalOpen = ref(false)
const modalImages = ref<string[]>([])
const modalIndex = ref(0)

const models = [
  {
    id: '1',
    model: '"Стандарт" 60/60/C20/сайдинг',
    route: '/wicket/type1',
    images: ['/web/k2.jpg', '/web/60_60_c20.jpg', '/web/r_60_60_c20.jpg', '/web/k3.jpg'],
  },
  {
    id: '2',
    model: '"Стандарт" 50/50/МП8',
    route: '/wicket/type2',
    images: ['/web/k3.jpg', '/web/r_60_60_c20.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/r_60_60_c20.jpg'],
  },
  {
    id: '3',
    model: '"Стандарт" 50/50/штакетник',
    route: '/wicket/type3',
    images: ['/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg'],
    soon: true,
  },
  {
    id: '4',
    model: '"Стандарт" 50/50/ламель RH77',
    route: '/wicket/type4',
    images: ['/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg'],
    soon: true,
  },
  {
    id: '5',
    model: '"Стандарт" 60/60/СП40',
    route: '/wicket/type5',
    images: ['/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg'],
    soon: true,
  },
  {
    id: '7',
    model: '"Стандарт" 50/50/СП50',
    route: '/wicket/type7',
    images: ['/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg'],
    soon: true,
  },
  {
    id: '8',
    model: '"Стандарт" 60/60/для накладного заполнения листовым материалом',
    route: '/wicket/type8',
    images: ['/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg', '/web/k2.jpg', '/web/k3.jpg'],
    soon: true,
  },
]

function getImageSrc(path: string): string {
  const base = window._HOSTNAME_ || ''
  return base ? `${base}${path}` : path
}

function scrollSlider(el: HTMLElement | null, direction: 'left' | 'right') {
  if (!el) return
  const amount = 170
  el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
}

function openImageModal(images: string[], index: number) {
  modalImages.value = images.map((p) => getImageSrc(p))
  modalIndex.value = index
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function modalPrev() {
  if (modalIndex.value > 0) modalIndex.value--
}

function modalNext() {
  if (modalIndex.value < modalImages.value.length - 1) modalIndex.value++
}

const modalImageSrc = computed(() => modalImages.value[modalIndex.value] || '')

const placeholderImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect fill='%23e5e7eb' width='200' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3ENo image%3C/text%3E%3C/svg%3E"

function onImageError(e: Event) {
  (e.target as HTMLImageElement).src = placeholderImg
}

async function onModelSelect(item: (typeof models)[0]) {
  if (loading.value || !calc.number.value || item.soon) return
  loading.value = item.id
  errorMessage.value = null

  try {
    calc.modelId.value = item.id
    calc.model.value = item.model
    calc.updateOrCreateBlock('Модель', [{ name: 'Модель', value: item.model }])

    await createWicketMainMenu({
      orderId: Number(calc.number.value),
      modelId: item.id,
      model: item.model,
    })

    await router.push(item.route)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Произошла ошибка при выполнении запроса'
  } finally {
    loading.value = null
  }
}
</script>

<template>
  <B24App>
    <B24SidebarLayout :use-light-content="false" :b24ui="{ container: 'mt-0' }">
      <div class="flex flex-col h-[calc(100vh-50px)] overflow-hidden bg-gray-50">
        <div class="flex items-center justify-between flex-wrap gap-2 shrink-0 px-4 py-3 mb-6 border-b border-gray-200 bg-white">
          <B24Button
            label="Назад"
            color="air-secondary"
            @click="router.push('/add-product')"
          />
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-800">
            Выберите заполнение калитки
          </h1>
          <div class="w-[68px]" />
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4">
          <div
            v-if="errorMessage"
            class="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200"
          >
            {{ errorMessage }}
          </div>

          <div class="flex flex-wrap justify-center gap-8 sm:gap-10">
            <div
              v-for="item in models"
              :key="item.id"
              class="flex flex-col items-center w-full max-w-[310px] sm:max-w-[400px]"
            >
              <button
                type="button"
                class="w-full text-center py-1.5 px-1 text-lg font-semibold rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-air-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative"
                :class="item.soon ? 'text-gray-500 no-underline cursor-default' : 'text-blue-600 underline'"
                :disabled="!!loading || item.soon"
                @click="onModelSelect(item)"
              >
                {{ item.model }}
                <span
                  v-if="item.soon"
                  class="absolute -top-2.5 -right-2.5 bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border border-amber-500"
                >
                  Скоро
                </span>
              </button>

              <div class="mt-2 w-full border border-gray-200 rounded overflow-hidden bg-white">
                <div
                  class="flex gap-4 overflow-x-auto scroll-smooth pb-2.5"
                  :class="{ 'opacity-50 grayscale': item.soon }"
                  style="scrollbar-width: thin; max-width: 100%;"
                >
                  <img
                    v-for="(img, idx) in item.images"
                    :key="idx"
                    :src="getImageSrc(img)"
                    :alt="`${item.model} фото ${idx + 1}`"
                    class="h-[200px] flex-shrink-0 rounded cursor-pointer border border-gray-200 hover:opacity-90 transition-opacity"
                    @error="onImageError"
                    @click.stop="openImageModal(item.images, idx)"
                  >
                </div>
                <div class="flex justify-between px-2 py-1.5 border-t border-gray-100">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-sm border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                    @click="(e) => scrollSlider((e.currentTarget as HTMLElement).closest('.flex.justify-between')?.previousElementSibling as HTMLElement, 'left')"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-sm border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                    @click="(e) => scrollSlider((e.currentTarget as HTMLElement).closest('.flex.justify-between')?.previousElementSibling as HTMLElement, 'right')"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="modalOpen"
            class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80"
            @click.self="closeModal"
          >
            <button
              type="button"
              class="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center text-white text-2xl font-bold hover:text-red-400 transition-colors"
              aria-label="Закрыть"
              @click="closeModal"
            >
              &times;
            </button>
            <button
              v-if="modalIndex > 0"
              type="button"
              class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/80 transition-colors"
              aria-label="Назад"
              @click="modalPrev"
            >
              ←
            </button>
            <img
              :src="modalImageSrc"
              :alt="`Изображение ${modalIndex + 1}`"
              class="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
              @click.stop
            >
            <button
              v-if="modalIndex < modalImages.length - 1"
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/80 transition-colors"
              aria-label="Вперёд"
              @click="modalNext"
            >
              →
            </button>
          </div>
        </Transition>
      </Teleport>
    </B24SidebarLayout>
  </B24App>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
