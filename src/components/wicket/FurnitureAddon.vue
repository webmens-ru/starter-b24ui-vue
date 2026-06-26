<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'

interface AddonConfig {
  key: 'doorCloser' | 'bumper' | 'skud'
  title: string
  page: string
  saveKeys: { isThere: string; id: string; provided: string; installed: string; ids?: string }
}
const props = defineProps<{ config: AddonConfig }>()
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()

const calc = useCalculation()
const items = computed(() => calc.addonItems.value[props.config.key])
const isMulti = computed(() => props.config.key === 'skud')

const isThereName = ref<string>(isMulti.value ? 'Будет' : (calc.addons.value[props.config.key].isThere === 1 ? 'Будет' : 'Не будет'))
const provided = ref<string>(calc.addons.value[props.config.key].provided || 'Предоставляет изготовитель')
const installed = ref<string>(calc.addons.value[props.config.key].installed || 'Устанавливает изготовитель')
const selectedId = ref<number | null>(calc.addons.value[props.config.key].itemId)
const selectedIds = ref<number[]>([...calc.addons.value[props.config.key].itemIds])

const showDetails = computed(() => isMulti.value || isThereName.value === 'Будет')
const showSelection = computed(() => isMulti.value || provided.value === 'Предоставляет изготовитель')
const showProvided = computed(() => !isMulti.value)
const showIsThere = computed(() => !isMulti.value)

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

function closeLightbox() {
  lightboxOpen.value = false
}

function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + lightboxImages.value.length) % lightboxImages.value.length
}

function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length
}

const providedOptions = [
  { value: 'Предоставляет изготовитель', label: 'Предоставляет изготовитель' },
  { value: 'Предоставляет заказчик', label: 'Предоставляет заказчик' },
]
const installedOptions = [
  { value: 'Устанавливает изготовитель', label: 'Устанавливает изготовитель' },
  { value: 'Устанавливает заказчик', label: 'Устанавливает заказчик' },
]

function toggleMulti(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function isMultiSelected(id: number) {
  return selectedIds.value.includes(id)
}

function sync() {
  const st = calc.addons.value[props.config.key]
  st.isThere = isThereName.value === 'Будет' ? 1 : 0
  if (showDetails.value) {
    st.provided = isMulti.value ? 'Предоставляет изготовитель' : provided.value
    st.installed = installed.value
    if (isMulti.value) {
      st.itemIds = [...selectedIds.value]
      st.itemId = selectedIds.value[0] ?? null
      st.marking = selectedIds.value
        .map(id => items.value.find(i => i.id === id)?.marking)
        .filter(Boolean)
        .join(', ')
    } else if (showSelection.value) {
      st.itemId = selectedId.value
      st.marking = items.value.find(i => i.id === selectedId.value)?.marking ?? ''
    } else {
      st.itemId = null; st.marking = ''
    }
  } else {
    st.provided = ''; st.installed = ''; st.itemId = null; st.marking = ''
    if (isMulti.value) st.itemIds = []
  }
}

function buildBlock() {
  const st = calc.addons.value[props.config.key]
  const params: { name: string; value: string }[] = [{ name: props.config.title, value: isThereName.value }]
  if (showDetails.value) {
    if (showProvided.value) {
      params.push({ name: 'Предоставляет', value: st.provided })
    }
    params.push({ name: 'Устанавливает', value: st.installed })
    if (isMulti.value && st.itemIds.length > 0) {
      const labels = st.itemIds
        .map(id => items.value.find(i => i.id === id)?.marking)
        .filter(Boolean)
      if (labels.length > 0) {
        params.push({ name: 'Модели', value: labels.join(', ') })
      }
    } else if (!isMulti.value && showSelection.value && st.itemId != null && st.marking) {
      params.push({ name: 'Модель', value: st.marking })
    }
  }
  calc.updateOrCreateBlock(props.config.title, params)
}

async function save() {
  sync(); buildBlock()
  const st = calc.addons.value[props.config.key]
  const k = props.config.saveKeys
  try {
    const payload: Record<string, unknown> = {
      ...calc.getBaseSavePayload(),
      [k.isThere]: st.isThere,
      [k.provided]: st.provided || null,
      [k.installed]: st.installed || null,
      [k.id]: st.itemId,
    }
    if (isMulti.value && k.ids) {
      payload[k.ids] = JSON.stringify(st.itemIds)
    }
    await saveWicketData(payload)
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

watch(selectedId, () => { if (!isMulti.value) save() })
watch(selectedIds, () => { if (isMulti.value) save() }, { deep: true })
watch(isThereName, () => save())
watch([provided, installed], () => save())

onMounted(async () => {
  calc.setActivePage(props.config.page)
  if (!isMulti.value && showSelection.value && items.value.length && !items.value.some(i => i.id === selectedId.value)) {
    selectedId.value = items.value[0].id
  }
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">{{ config.title }}</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">
      <div v-if="showIsThere" class="option-grid">
        <label class="lock-card"><input v-model="isThereName" type="radio" value="Будет" class="sr-only" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">Будет</span></div></label>
        <label class="lock-card"><input v-model="isThereName" type="radio" value="Не будет" class="sr-only" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">Не будет</span></div></label>
      </div>

      <template v-if="showDetails">
        <div v-if="showProvided" class="option-grid">
          <label v-for="opt in providedOptions" :key="opt.value" class="lock-card">
            <input v-model="provided" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content"><span class="block text-sm font-semibold text-center">{{ opt.label }}</span></div></label>
        </div>
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="installed" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content"><span class="block text-sm font-semibold text-center">{{ opt.label }}</span></div></label>
        </div>

        <template v-if="showSelection">
          <div>
            <h2 class="text-lg font-semibold mb-2 text-center">{{ isMulti ? 'Модели' : 'Модель' }}</h2>

            <template v-if="isMulti">
              <div class="overflow-x-auto">
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
                      <td colspan="3" class="text-center py-4 text-gray-400">Нет доступных моделей</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <template v-else>
              <div v-if="items.length" class="pen-cards-row">
                <label v-for="it in items" :key="it.id" class="lock-viewer-card pen-card">
                  <input v-model="selectedId" type="radio" :value="it.id" class="sr-only" />
                  <div class="card-content">
                    <ImageViewer v-if="it.imageUrls?.length" :title="it.marking" :images="it.imageUrls" image-height="100px" />
                    <div v-else class="pen-placeholder" aria-hidden="true" />
                    <span class="block text-sm font-semibold text-center mt-2">{{ it.marking }}</span>
                  </div>
                </label>
              </div>
              <div v-else class="px-2 py-4 text-sm text-gray-500 text-center">Нет доступных моделей</div>
            </template>
          </div>
        </template>
      </template>
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

<style scoped>
.option-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 4px; }
@media (min-width: 640px) { .option-grid { grid-template-columns: repeat(2, 1fr); min-width: 350px; max-width: 600px; margin-inline: auto; } }
.pen-cards-row { display: grid; grid-template-columns: 1fr; gap: 16px 24px; padding: 4px; width: 100%; min-width: 0; }
@media (min-width: 900px) { .pen-cards-row { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); max-width: 1424px; margin: 0 auto; } }
.pen-placeholder { width: 100%; height: 100px; background: #f3f4f6; border-radius: 8px; margin-bottom: 8px; }
.lock-card, .lock-viewer-card { cursor: pointer; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.lock-card:hover, .lock-viewer-card:hover { border-color: #93c5fd; }
.lock-card:has(input:checked), .lock-viewer-card:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); background: #eff6ff; }
.card-content { padding: 12px; }
</style>

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
