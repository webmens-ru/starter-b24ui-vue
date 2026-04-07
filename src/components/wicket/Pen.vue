<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getAdditionalPens, saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'

interface PenItem {
  id: number
  marking: string
  colors: string[]
  image_urls?: string[]
}

const DEFAULT_COLORS = ['Черная', 'Коричневая', 'Белая']

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const penItems = ref<PenItem[]>([])
const loading = ref(true)
const is_there_pen = ref<string>('Не будет')
const pen_provided = ref<string>('Предоставляет изготовитель')
const pen_installed = ref<string>('Устанавливает изготовитель')
const selectedPenId = ref<number | null>(null)
const selectedColor = ref<string>('Черная')

const showDetails = computed(() => is_there_pen.value === 'Будет')

/** Блок выбора ручки показываем только если её предоставляет изготовитель */
const showPenSelection = computed(() => pen_provided.value === 'Предоставляет изготовитель')

/** Цвета для выпадающего списка — из выбранной ручки или дефолтные */
const colorSelectItems = computed(() => {
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  return colors.map(c => ({ id: c, label: c }))
})

const providedOptions = [
  { value: 'Предоставляет изготовитель', label: 'Предоставляет изготовитель' },
  { value: 'Предоставляет заказчик', label: 'Предоставляет заказчик' },
]
const installedOptions = [
  { value: 'Устанавливает изготовитель', label: 'Устанавливает изготовитель' },
  { value: 'Устанавливает заказчик', label: 'Устанавливает заказчик' },
]

function syncCalcFields() {
  calc.is_there_pen_name.value = is_there_pen.value
  calc.is_there_pen_id.value = is_there_pen.value === 'Будет' ? 1 : 0

  if (showDetails.value) {
    calc.pen_provided.value = pen_provided.value
    calc.pen_installed.value = pen_installed.value
    if (showPenSelection.value) {
      calc.additional_pen_id.value = selectedPenId.value
      calc.additional_pen_color.value = selectedColor.value
      calc.pen_color.value = selectedColor.value
      const pen = penItems.value.find(p => p.id === selectedPenId.value)
      calc.additional_pen_marking.value = pen?.marking ?? ''
    } else {
      calc.additional_pen_id.value = null
      calc.additional_pen_color.value = ''
      calc.additional_pen_marking.value = ''
      calc.pen_color.value = ''
    }
  } else {
    calc.pen_provided.value = ''
    calc.pen_installed.value = ''
    calc.additional_pen_id.value = null
    calc.additional_pen_color.value = ''
    calc.additional_pen_marking.value = ''
    calc.pen_color.value = 'Черная'
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Дополнительная ручка', value: calc.is_there_pen_name.value },
  ]
  if (showDetails.value) {
    params.push({ name: 'Ручку предоставляет', value: calc.pen_provided.value })
    params.push({ name: 'Ручку устанавливает', value: calc.pen_installed.value })
    if (showPenSelection.value) {
      if (calc.additional_pen_id.value != null && calc.additional_pen_marking.value) {
        params.push({ name: 'Модель ручки', value: calc.additional_pen_marking.value })
      }
      params.push({ name: 'Цвет ручки', value: calc.additional_pen_color.value || calc.pen_color.value })
    }
  }
  calc.updateOrCreateBlock('Дополнительная ручка (скоба)', params)
}

async function loadAdditionalPens() {
  loading.value = true
  try {
    const res = await getAdditionalPens()
    penItems.value = res.items
    if (res.items.length > 0 && !res.items.some(p => p.id === selectedPenId.value)) {
      selectedPenId.value = res.items[0].id
    } else if (res.items.length === 0) {
      selectedPenId.value = null
    }
  } catch (e) {
    console.warn('getAdditionalPens:', e)
    penItems.value = []
    selectedPenId.value = null
  } finally {
    loading.value = false
  }
}

watch(selectedPenId, (id) => {
  calc.additional_pen_id.value = id
  const pen = penItems.value.find(p => p.id === id)
  calc.additional_pen_marking.value = pen?.marking ?? ''
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  if (!colors.includes(selectedColor.value)) {
    selectedColor.value = colors[0]
  }
  calc.additional_pen_color.value = selectedColor.value
  syncCalcFields()
  buildBlock()
  save()
})

watch(selectedColor, (color) => {
  calc.additional_pen_color.value = color
  syncCalcFields()
  buildBlock()
  save()
})

watch(is_there_pen, () => {
  syncCalcFields()
  buildBlock()
  save()
})

watch([pen_provided, pen_installed], () => {
  syncCalcFields()
  buildBlock()
  save()
})

function applySavedSelection() {
  if (!penItems.value.length) return
  const savedPenId = calc.additional_pen_id.value
  if (savedPenId != null && penItems.value.some(p => p.id === savedPenId)) {
    selectedPenId.value = savedPenId
  } else {
    selectedPenId.value = penItems.value[0].id
  }

  const savedColor = calc.additional_pen_color.value
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  if (savedColor && colors.includes(savedColor)) {
    selectedColor.value = savedColor
  } else if (colors.length) {
    selectedColor.value = colors[0]
  }
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      is_there_pen_id: calc.is_there_pen_id.value,
      is_there_pen_name: calc.is_there_pen_name.value,
      pen_provided: calc.pen_provided.value || null,
      pen_installed: calc.pen_installed.value || null,
      pen_color: calc.additional_pen_color.value || calc.pen_color.value || null,
      additional_pen_id: calc.additional_pen_id.value,
      additional_pen_color: calc.additional_pen_color.value || null,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.price_retail.value) {
    try {
      const result = await recalculate({
        order_id: Number(calc.number.value),
        product_type: calc.productType.value,
        model: calc.model.value,
        model_id: calc.modelId.value,
      })
      calc.updatePriceBlock(result.price_dealer, result.price_retail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page10')

  if (calc.is_there_pen_name.value) is_there_pen.value = calc.is_there_pen_name.value
  if (calc.pen_provided.value) pen_provided.value = calc.pen_provided.value
  if (calc.pen_installed.value) pen_installed.value = calc.pen_installed.value

  await loadAdditionalPens()
  if (showDetails.value && penItems.value.length) {
    applySavedSelection()
  }

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Дополнительная ручка (скоба)</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Будет / Не будет -->
      <div class="option-grid">
        <label class="lock-card">
          <input v-model="is_there_pen" type="radio" value="Будет" class="sr-only" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">Будет</span>
          </div>
        </label>
        <label class="lock-card">
          <input v-model="is_there_pen" type="radio" value="Не будет" class="sr-only" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">Не будет</span>
          </div>
        </label>
      </div>

      <!-- Детали (только при "Будет") -->
      <template v-if="showDetails">

        <!-- Кто предоставляет -->
        <div class="option-grid">
          <label v-for="opt in providedOptions" :key="opt.value" class="lock-card">
            <input v-model="pen_provided" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Кто устанавливает -->
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="pen_installed" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Выбор ручки из справочника (только если предоставляет изготовитель) -->
        <template v-if="showPenSelection">
          <div>
            <h2 class="text-lg font-semibold mb-2 text-center">Модель ручки</h2>
            <div v-if="loading" class="px-2 py-4 text-sm text-gray-400 text-center">Загрузка...</div>
            <div v-else-if="penItems.length" class="pen-cards-row">
              <label
                v-for="pen in penItems"
                :key="pen.id"
                class="lock-viewer-card pen-card"
              >
                <input
                  v-model="selectedPenId"
                  type="radio"
                  :value="pen.id"
                  class="sr-only"
                />
                <div class="card-content">
                  <ImageViewer
                    v-if="pen.image_urls?.length"
                    :title="pen.marking"
                    :images="pen.image_urls"
                    image-height="100px"
                  />
                  <div v-else class="pen-placeholder" aria-hidden="true" />
                  <span class="block text-sm font-semibold text-center mt-2">{{ pen.marking }}</span>
                </div>
              </label>
            </div>
            <div v-else class="px-2 py-4 text-sm text-gray-500 text-center">Нет доступных ручек</div>
          </div>

          <!-- Выбор цвета (из цветов выбранной ручки) -->
          <div v-if="selectedPenId" class="flex flex-col gap-2 items-start w-full">
            <h2 class="text-lg font-semibold mb-2">Цвет ручки</h2>
            <div class="select-full-width w-full">
              <B24SelectMenu
                v-model="selectedColor"
                value-key="id"
                :items="colorSelectItems"
                placeholder="Выберите цвет"
                class="w-full"
              />
            </div>
          </div>
        </template>

      </template>

    </div>
  </div>
</template>

<style scoped>
.option-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 4px;
}

@media (min-width: 640px) {
  .option-grid {
    grid-template-columns: repeat(2, 1fr);
    min-width: 350px;
    max-width: 600px;
    margin-inline: auto;
  }
}

.pen-cards-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px 24px;
  padding: 4px;
  width: 100%;
  min-width: 0;
}

@media (min-width: 900px) {
  .pen-cards-row {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    max-width: 1424px;
    margin: 0 auto;
  }
}

.pen-placeholder {
  width: 100%;
  height: 100px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 8px;
}

.lock-card,
.lock-viewer-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.lock-card:hover,
.lock-viewer-card:hover {
  border-color: #93c5fd;
}

.lock-card:has(input[type="radio"]:checked),
.lock-viewer-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #eff6ff;
}

.card-content {
  padding: 12px;
}
</style>
