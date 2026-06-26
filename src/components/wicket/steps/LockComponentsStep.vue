<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getLockComponents, saveWicketData, recalculate } from '../../../app/api/wicket'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()

const calc = useCalculation()

const items = ref<Array<{ id: number; marking: string; weight?: number; price?: number; priceInstall?: number; imageUrls?: string[] }>>([])
const selectedIds = ref<number[]>([])
const installed = ref<string>('Устанавливает изготовитель')
const loading = ref(false)

const installedOptions = [
  { value: 'Устанавливает изготовитель', label: 'Устанавливает изготовитель' },
  { value: 'Устанавливает заказчик', label: 'Устанавливает заказчик' },
]

const lightboxImages = ref<string[]>([])
const lightboxTitle = ref('')
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const lightboxCurrent = computed(() => lightboxImages.value[lightboxIndex.value] ?? null)
const lightboxHasMultiple = computed(() => lightboxImages.value.length > 1)

function openLightbox(images: string[], title: string) {
  lightboxImages.value = images
  lightboxTitle.value = title
  lightboxIndex.value = 0
  lightboxOpen.value = true
}

function closeLightbox() { lightboxOpen.value = false }
function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + lightboxImages.value.length) % lightboxImages.value.length
}
function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length
}

function toggleMulti(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) { selectedIds.value.splice(idx, 1) } else { selectedIds.value.push(id) }
}

function isMultiSelected(id: number) { return selectedIds.value.includes(id) }

async function loadItems() {
  loading.value = true
  try {
    const result = await getLockComponents(calc.modelId.value)
    items.value = result.items ?? []
  } catch (e) {
    console.warn('getLockComponents недоступен:', e)
    items.value = []
  } finally {
    loading.value = false
  }
}

async function save() {
  const marking = selectedIds.value
    .map(id => items.value.find(i => i.id === id)?.marking)
    .filter(Boolean)
    .join(', ')

  calc.updateOrCreateBlock('Комплектующие замка', [
    { name: 'Комплектующие', value: marking || 'Не выбрано' },
    { name: 'Устанавливает', value: installed.value },
  ])

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      lockComponentIds: JSON.stringify(selectedIds.value),
      lockComponentsInstalled: installed.value,
    })
  } catch (e) { console.warn('saveWicketData:', e) }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType: calc.productType.value,
        model: calc.model.value,
        modelId: calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) { console.warn('recalculate:', e) }
  }
}

watch(selectedIds, () => save(), { deep: true })

onMounted(async () => {
  calc.setActivePage('page_lock_components')
  await loadItems()
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Комплектующие замка</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="option-grid">
      <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
        <input v-model="installed" type="radio" :value="opt.value" class="sr-only" />
        <div class="card-content"><span class="block text-sm font-semibold text-center">{{ opt.label }}</span></div></label>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-400">Загрузка...</div>

    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead class="sticky top-0 z-[9] bg-gray-100">
          <tr>
            <th class="border border-gray-300 px-2 py-1 text-left w-12">Выбрать</th>
            <th class="border border-gray-300 px-2 py-1 text-left w-16">Фото</th>
            <th class="border border-gray-300 px-2 py-1 text-left">Маркировка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id"
              :class="isMultiSelected(it.id) ? 'bg-blue-100' : 'hover:bg-gray-50'">
            <td class="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox"
                     :checked="isMultiSelected(it.id)"
                     class="accent-blue-600"
                     @change="toggleMulti(it.id)" />
            </td>
            <td class="border border-gray-300 px-2 py-1">
              <div v-if="it.imageUrls?.length"
                   class="cursor-pointer"
                   @click.stop="openLightbox(it.imageUrls, it.marking)">
                <img :src="it.imageUrls[0]" :alt="it.marking" class="h-10 w-10 object-contain" />
              </div>
              <div v-else class="h-10 w-10 bg-gray-100 rounded" />
            </td>
            <td class="border border-gray-300 px-2 py-1">{{ it.marking }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="3" class="text-center py-4 text-gray-400">Нет доступных комплектующих</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="lightboxOpen" class="lightbox-overlay" @click.self="closeLightbox">
        <button type="button" class="lightbox-close" @click="closeLightbox">&times;</button>
        <div class="lightbox-content">
          <button v-if="lightboxHasMultiple" type="button" class="lightbox-nav lightbox-prev" @click="lightboxPrev">&#8249;</button>
          <img v-if="lightboxCurrent" :src="lightboxCurrent" :alt="lightboxTitle" class="lightbox-img" />
          <button v-if="lightboxHasMultiple" type="button" class="lightbox-nav lightbox-next" @click="lightboxNext">&#8250;</button>
        </div>
        <div v-if="lightboxHasMultiple" class="lightbox-dots">
          <button v-for="(_, i) in lightboxImages" :key="i" type="button"
                  class="lightbox-dot" :class="{ active: i === lightboxIndex }"
                  @click="lightboxIndex = i" />
        </div>
        <div class="lightbox-title">{{ lightboxTitle }}</div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.lightbox-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(0,0,0,.85); gap: 12px;
}
.lightbox-close {
  position: absolute; top: 12px; right: 16px;
  background: none; border: none; color: #fff; font-size: 32px; cursor: pointer; line-height: 1;
}
.lightbox-content { position: relative; display: flex; align-items: center; max-width: 90vw; max-height: 80vh; }
.lightbox-img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; }
.lightbox-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; border: none; border-radius: 50%;
  background: rgba(255,255,255,.25); color: #fff; font-size: 24px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.lightbox-nav:hover { background: rgba(255,255,255,.45); }
.lightbox-prev { left: -50px; }
.lightbox-next { right: -50px; }
.lightbox-dots { display: flex; gap: 8px; }
.lightbox-dot {
  width: 8px; height: 8px; padding: 0; border: none; border-radius: 50%;
  background: rgba(255,255,255,.4); cursor: pointer;
}
.lightbox-dot.active { background: #fff; }
.lightbox-title { color: #fff; font-size: 14px; }
</style>

<style scoped>
.option-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 4px; }
@media (min-width: 640px) { .option-grid { grid-template-columns: repeat(2, 1fr); min-width: 350px; max-width: 600px; margin-inline: auto; } }
.lock-card { cursor: pointer; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.lock-card:hover { border-color: #93c5fd; }
.lock-card:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); background: #eff6ff; }
.card-content { padding: 12px; }
</style>
