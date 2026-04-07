<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getLocks, getPensByLock, saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'

interface LockItem {
  id: number
  marking: string
  image_urls: string[]
}

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

const lockItems = ref<LockItem[]>([])
const penItems = ref<PenItem[]>([])
const loading = ref(true)
const loadingPens = ref(false)
/** Выбранный комплект замка (id из get-list) */
const selectedLockId = ref<number | null>(null)
const selectedPenId = ref<number | null>(null)
const selectedColor = ref<string>('Черная')

/** Цвета для выпадающего списка — из выбранной ручки или дефолтные */
const colorSelectItems = computed(() => {
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  return colors.map(c => ({ id: c, label: c }))
})

function updateLockBlock() {
  const block = calc.data.value.find(b => b.blockName === 'Замок')
  const params: { name: string; value: string }[] = [
    { name: 'Тип замка', value: (calc.type_lock.value || lockItems.value.find(l => l.id === calc.lock_set_id.value)?.marking) ?? '' },
  ]
  if (calc.lock_pen_id.value != null) {
    const pen = penItems.value.find(p => p.id === calc.lock_pen_id.value)
    if (pen) params.push({ name: 'Ручка', value: pen.marking })
  }
  if (calc.lock_pen_color.value) {
    params.push({ name: 'Цвет ручки', value: calc.lock_pen_color.value })
  }
  if (block) {
    block.params = params
  } else {
    calc.updateOrCreateBlock('Замок', params)
  }
  document.dispatchEvent(new Event('dataUpdated'))
}

async function loadLocks() {
  loading.value = true
  try {
    const res = await getLocks()
    lockItems.value = res.items
  } catch (e) {
    console.warn('getLocks:', e)
    lockItems.value = []
  } finally {
    loading.value = false
  }
}

async function loadPensForLock(lockSetId: number | null) {
  if (!lockSetId) {
    penItems.value = []
    selectedPenId.value = null
    return
  }
  loadingPens.value = true
  try {
    const res = await getPensByLock(lockSetId)
    penItems.value = res.items
    if (res.items.length > 0 && !res.items.some(p => p.id === selectedPenId.value)) {
      selectedPenId.value = res.items[0].id
    } else if (res.items.length === 0) {
      selectedPenId.value = null
    }
  } catch (e) {
    console.warn('getPensByLock:', e)
    penItems.value = []
    selectedPenId.value = null
  } finally {
    loadingPens.value = false
  }
}

watch(selectedLockId, async (id) => {
  const lock = lockItems.value.find(l => l.id === id)
  calc.lock_set_id.value = id
  calc.type_lock.value = lock?.marking ?? ''
  await loadPensForLock(id)
  if (penItems.value.length === 0) {
    calc.lock_pen_id.value = null
    calc.lock_pen_color.value = ''
  } else if (selectedPenId.value && penItems.value.some(p => p.id === selectedPenId.value)) {
    calc.lock_pen_id.value = selectedPenId.value
    calc.lock_pen_color.value = selectedColor.value
  } else {
    selectedPenId.value = penItems.value[0].id
    calc.lock_pen_id.value = penItems.value[0].id
    calc.lock_pen_color.value = selectedColor.value
  }
  updateLockBlock()
  await save()
})

watch(selectedPenId, (id) => {
  calc.lock_pen_id.value = id
  const pen = penItems.value.find(p => p.id === id)
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  if (!colors.includes(selectedColor.value)) {
    selectedColor.value = colors[0]
  }
  updateLockBlock()
  save()
})

watch(selectedColor, (color) => {
  calc.lock_pen_color.value = color
  updateLockBlock()
  save()
})

function applySavedSelection() {
  if (!lockItems.value.length) return
  const savedLockSetId = calc.lock_set_id.value
  const lockMatch = lockItems.value.find(l => l.id === savedLockSetId)
  selectedLockId.value = lockMatch ? lockMatch.id : lockItems.value[0].id

  const savedPenId = calc.lock_pen_id.value
  if (savedPenId != null && penItems.value.some(p => p.id === savedPenId)) {
    selectedPenId.value = savedPenId
  } else if (penItems.value.length > 0) {
    selectedPenId.value = penItems.value[0].id
  }

  const savedColor = calc.lock_pen_color.value
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  const colors = pen?.colors?.length ? pen.colors : DEFAULT_COLORS
  if (savedColor && colors.includes(savedColor)) {
    selectedColor.value = savedColor
  } else if (colors.length) {
    selectedColor.value = colors[0]
  }
}

async function save() {
  updateLockBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      lock_set_id:     calc.lock_set_id.value,
      lock_pen_id:     calc.lock_pen_id.value,
      lock_pen_color:  calc.lock_pen_color.value || null,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.price_retail.value) {
    try {
      const result = await recalculate({
        order_id:     Number(calc.number.value),
        product_type: calc.productType.value,
        model:        calc.model.value,
        model_id:     calc.modelId.value,
      })
      calc.updatePriceBlock(result.price_dealer, result.price_retail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page_lock_type')
  await loadLocks()
  const savedLockSetId = calc.lock_set_id.value
  if (savedLockSetId != null && lockItems.value.some(l => l.id === savedLockSetId)) {
    selectedLockId.value = savedLockSetId
  } else if (lockItems.value.length > 0) {
    selectedLockId.value = lockItems.value[0].id
  }
  await loadPensForLock(selectedLockId.value)
  applySavedSelection()
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Комплект замка</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <!-- 1. Выбор комплекта замка -->
    <div>
      <h2 class="text-lg font-semibold mb-2 text-center">Тип замка</h2>
      <div v-if="loading" class="px-2 py-4 text-sm text-gray-400 text-center">Загрузка...</div>
      <div v-else class="locks-viewer-grid">
        <label
          v-for="lock in lockItems"
          :key="lock.id"
          class="lock-viewer-card"
        >
          <input
            v-model="selectedLockId"
            type="radio"
            :value="lock.id"
            class="sr-only"
          />
          <div class="card-content">
            <ImageViewer
              :title="lock.marking"
              :images="lock.image_urls ?? []"
              image-height="160px"
            />
            <span class="block text-sm font-semibold text-center mt-2">{{ lock.marking }}</span>
          </div>
        </label>
      </div>
    </div>

    <!-- 2. Выбор ручки (после выбора комплекта замка) — карточки по аналогии с сеткой -->
    <div v-if="selectedLockId != null">
      <h2 class="text-lg font-semibold mb-2 text-center">Ручка</h2>
      <div v-if="loadingPens" class="px-2 py-4 text-sm text-gray-400 text-center">Загрузка...</div>
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
      <div v-else class="px-2 py-4 text-sm text-gray-500 text-center">Нет доступных ручек для выбранного замка</div>
    </div>

    <!-- 3. Выбор цвета (после выбора ручки) — выпадающий список из цветов выбранной ручки -->
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

  </div>
</template>

<style scoped>
.locks-viewer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px 24px;
  padding: 4px;
  width: 100%;
  min-width: 0;
}

@media (min-width: 900px) {
  .locks-viewer-grid {
    grid-template-columns: repeat(2, minmax(345px, 1fr));
    max-width: 1424px; /* 2 × 700px + gap 24px */
    margin: 0 auto;
  }
}

.lock-viewer-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  width: 100%;
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  padding: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

.lock-viewer-card:hover {
  border-color: #93c5fd;
}

.lock-viewer-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #eff6ff;
}

/* Карточки ручек — сетка как у типа замка, чтобы одна карточка не была узкой */
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

.pen-card.card-selected {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  background: #eff6ff !important;
}

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lock-card:hover {
  border-color: #93c5fd;
}

.lock-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.card-content {
  padding: 12px;
  background: transparent;
  transition: background 0.15s ease;
}

.lock-card:has(input[type="radio"]:checked) .card-content {
  background: #eff6ff;
}
</style>
