<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getAdditionalPens, saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'

interface PenItem {
  id: number
  marking: string
  colors: { id: number; name: string }[]
  imageUrls?: string[]
}

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const penItems = ref<PenItem[]>([])
const loading = ref(true)
const isTherePenName = ref<string>('Не будет')
const penProvided = ref<string>('Предоставляет изготовитель')
const penInstalled = ref<string>('Устанавливает изготовитель')
const selectedPenId = ref<number | null>(null)
const selectedColor = ref<number | null>(null)

const showDetails = computed(() => isTherePenName.value === 'Будет')

/** Блок выбора ручки показываем только если её предоставляет изготовитель */
const showPenSelection = computed(() => penProvided.value === 'Предоставляет изготовитель')

/** Цвета для выпадающего списка — из выбранной ручки */
const colorSelectItems = computed(() => {
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors ?? []
  return colors.map(c => ({ id: c.id, label: c.name }))
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
  calc.isTherePenName.value = isTherePenName.value
  calc.isTherePen.value = isTherePenName.value === 'Будет' ? 1 : 0

  if (showDetails.value) {
    calc.penProvided.value = penProvided.value
    calc.penInstalled.value = penInstalled.value
    if (showPenSelection.value) {
      calc.additionalPenId.value = selectedPenId.value
      const pen = penItems.value.find(p => p.id === selectedPenId.value)
      const colorObj = pen?.colors?.find(c => c.id === selectedColor.value)
      calc.penColorId.value = selectedColor.value ?? null
      calc.additionalPenColor.value = colorObj?.name ?? ''
      calc.penColor.value = colorObj?.name ?? ''
      calc.additionalPenMarking.value = pen?.marking ?? ''
    } else {
      calc.additionalPenId.value = null
      calc.additionalPenColor.value = ''
      calc.additionalPenMarking.value = ''
      calc.penColorId.value = null
      calc.penColor.value = ''
    }
  } else {
    calc.penProvided.value = ''
    calc.penInstalled.value = ''
    calc.additionalPenId.value = null
    calc.additionalPenColor.value = ''
    calc.additionalPenMarking.value = ''
    calc.penColorId.value = null
    calc.penColor.value = ''
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Дополнительная ручка', value: calc.isTherePenName.value },
  ]
  if (showDetails.value) {
    params.push({ name: 'Ручку предоставляет', value: calc.penProvided.value })
    params.push({ name: 'Ручку устанавливает', value: calc.penInstalled.value })
    if (showPenSelection.value) {
      if (calc.additionalPenId.value != null && calc.additionalPenMarking.value) {
        params.push({ name: 'Модель ручки', value: calc.additionalPenMarking.value })
      }
      params.push({ name: 'Цвет ручки', value: calc.additionalPenColor.value || calc.penColor.value })
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
  calc.additionalPenId.value = id
  const pen = penItems.value.find(p => p.id === id)
  calc.additionalPenMarking.value = pen?.marking ?? ''
  const colors = pen?.colors ?? []
  if (!colors.some(c => c.id === selectedColor.value)) {
    selectedColor.value = colors[0]?.id ?? null
  }
  calc.additionalPenColor.value = colors.find(c => c.id === selectedColor.value)?.name ?? ''
  syncCalcFields()
  buildBlock()
  save()
})

watch(selectedColor, (colorId) => {
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colorObj = pen?.colors?.find(c => c.id === colorId)
  calc.additionalPenColor.value = colorObj?.name ?? ''
  syncCalcFields()
  buildBlock()
  save()
})

watch(isTherePenName, () => {
  syncCalcFields()
  buildBlock()
  save()
})

watch([penProvided, penInstalled], () => {
  syncCalcFields()
  buildBlock()
  save()
})

function applySavedSelection() {
  if (!penItems.value.length) return
  const savedPenId = calc.additionalPenId.value
  if (savedPenId != null && penItems.value.some(p => p.id === savedPenId)) {
    selectedPenId.value = savedPenId
  } else {
    selectedPenId.value = penItems.value[0].id
  }

  const savedColorId = calc.penColorId.value
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors ?? []
  if (savedColorId != null && colors.some(c => c.id === savedColorId)) {
    selectedColor.value = savedColorId
  } else if (colors.length) {
    selectedColor.value = colors[0].id
  }
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      isTherePen: calc.isTherePen.value,
      isTherePenName: calc.isTherePenName.value,
      penProvided: calc.penProvided.value || null,
      penInstalled: calc.penInstalled.value || null,
      penColorId: calc.penColorId.value,
      additionalPenId: calc.additionalPenId.value,
      additionalPenColor: calc.additionalPenColor.value || null,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType: calc.productType.value,
        model: calc.model.value,
        modelId: calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page10')

  if (calc.isTherePenName.value) isTherePenName.value = calc.isTherePenName.value
  if (calc.penProvided.value) penProvided.value = calc.penProvided.value
  if (calc.penInstalled.value) penInstalled.value = calc.penInstalled.value

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
          <input v-model="isTherePenName" type="radio" value="Будет" class="sr-only" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">Будет</span>
          </div>
        </label>
        <label class="lock-card">
          <input v-model="isTherePenName" type="radio" value="Не будет" class="sr-only" />
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
            <input v-model="penProvided" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Кто устанавливает -->
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="penInstalled" type="radio" :value="opt.value" class="sr-only" />
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
                    v-if="pen.imageUrls?.length"
                    :title="pen.marking"
                    :images="pen.imageUrls"
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
