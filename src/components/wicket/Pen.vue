<script setup lang="ts">
import { participantRoleLabel, isParticipantRole } from '../../app/participantRoles'
import { isOptionPresence, optionPresenceLabel, optionPresenceOptions, parseOptionPresence, type OptionPresenceSelection } from '../../app/optionPresence'
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getAdditionalPens, saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

interface PenItem {
  id: number
  marking: string
  canUseFrameColor: boolean
  colors: { id: number; name: string }[]
  imageUrls?: string[]
}

type ColorChoice = number | 'frame' | null

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const penItems = ref<PenItem[]>([])
const loading = ref(true)
const presence = ref<OptionPresenceSelection>(0)
const presenceOptions = optionPresenceOptions('optional')
const penProvided = ref<string>('manufacturer')
const penInstalled = ref<string>('manufacturer')
const selectedPenId = ref<number | null>(null)
const selectedColor = ref<ColorChoice>(null)
const colorError = ref('')
let isRestoringSelection = false
const selectedColorModel = computed<number | 'frame' | undefined>({
  get: () => selectedColor.value ?? undefined,
  set: value => { selectedColor.value = value ?? null },
})

const showDetails = computed(() => presence.value === 1)

/** Блок выбора ручки показываем только если её предоставляет изготовитель */
const showPenSelection = computed(() => penProvided.value === 'manufacturer')

/** Цвета для выпадающего списка — из выбранной ручки */
const colorSelectItems = computed(() => {
  const pen = penItems.value.find(p => p.id === selectedPenId.value)
  if (!pen) return []
  return [
    ...(pen.canUseFrameColor ? [{ id: 'frame' as const, label: 'Цвет каркаса' }] : []),
    ...pen.colors.map(c => ({ id: c.id, label: c.name })),
  ]
})

const providedOptions = [
  { value: 'manufacturer', label: 'Предоставляет изготовитель' },
  { value: 'customer', label: 'Предоставляет заказчик' },
]
const installedOptions = [
  { value: 'manufacturer', label: 'Устанавливает изготовитель' },
  { value: 'customer', label: 'Устанавливает заказчик' },
]

function canSyncSelection(): boolean {
  return isOptionPresence(presence.value) && (presence.value === 0
    || (isParticipantRole(penProvided.value) && isParticipantRole(penInstalled.value)))
}

function syncCalcFields() {
  if (!canSyncSelection()) return
  calc.isTherePenName.value = optionPresenceLabel(presence.value, 'optional')
  calc.isTherePen.value = presence.value

  if (showDetails.value) {
    calc.penProvided.value = penProvided.value
    calc.penInstalled.value = penInstalled.value
    if (showPenSelection.value) {
      calc.additionalPenId.value = selectedPenId.value
      const pen = penItems.value.find(p => p.id === selectedPenId.value)
      const isFrameColor = selectedColor.value === 'frame'
      const colorObj = typeof selectedColor.value === 'number'
        ? pen?.colors.find(c => c.id === selectedColor.value)
        : undefined
      const colorName = isFrameColor ? 'Цвет каркаса' : (colorObj?.name ?? '')
      calc.penColorId.value = colorObj?.id ?? null
      calc.additionalPenColor.value = colorName
      calc.penColor.value = colorName
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
    { name: 'Дополнительная ручка', value: optionPresenceLabel(calc.isTherePen.value, 'optional') },
  ]
  if (showDetails.value) {
    params.push({ name: 'Ручку предоставляет', value: participantRoleLabel('provide', calc.penProvided.value) })
    params.push({ name: 'Ручку устанавливает', value: participantRoleLabel('install', calc.penInstalled.value) })
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
  if (isRestoringSelection || !canSyncSelection()) return
  calc.additionalPenId.value = id
  const pen = penItems.value.find(p => p.id === id)
  calc.additionalPenMarking.value = pen?.marking ?? ''
  const colors = pen?.colors ?? []
  const currentColorIsAvailable = selectedColor.value === 'frame'
    ? Boolean(pen?.canUseFrameColor)
    : colors.some(c => c.id === selectedColor.value)
  if (!currentColorIsAvailable) {
    selectedColor.value = pen?.canUseFrameColor ? 'frame' : (colors[0]?.id ?? null)
  }
  colorError.value = ''
  syncCalcFields()
  buildBlock()
  save()
})

watch(selectedColor, () => {
  if (isRestoringSelection || !canSyncSelection()) return
  colorError.value = ''
  syncCalcFields()
  buildBlock()
  save()
})

watch(presence, () => {
  if (isRestoringSelection || !canSyncSelection()) return
  colorError.value = ''
  syncCalcFields()
  buildBlock()
  save()
})

watch([penProvided, penInstalled], () => {
  if (isRestoringSelection || !canSyncSelection()) return
  colorError.value = ''
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
  } else if (savedColorId == null && pen?.canUseFrameColor) {
    selectedColor.value = 'frame'
  } else if (colors.length) {
    selectedColor.value = colors[0].id
  } else {
    selectedColor.value = null
  }
}

async function validateAndSave(): Promise<boolean> {
  if (!isOptionPresence(presence.value)) {
    colorError.value = 'Выберите наличие дополнительной ручки'
    return false
  }
  if (!canSyncSelection()) {
    colorError.value = 'Выберите поставщика и исполнителя ручки'
    return false
  }
  if (showDetails.value && showPenSelection.value && selectedPenId.value != null && selectedColor.value == null) {
    colorError.value = 'Для выбранной ручки не настроен доступный цвет'
    return false
  }
  colorError.value = ''
  await save()
  return true
}

const leaveAttempt = createStepLeaveAttempt(validateAndSave, () => emit('next'))
const { validateBeforeLeave, next: continueToNext } = leaveAttempt

defineExpose({ validateBeforeLeave })

async function save() {
  if (!canSyncSelection()) return
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      isTherePen: calc.isTherePen.value,
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
        productRowId: calc.getCurrentProductRowContext().productRowId,
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
  isRestoringSelection = true

  presence.value = parseOptionPresence(calc.isTherePen.value)
  penProvided.value = calc.penProvided.value
  penInstalled.value = calc.penInstalled.value
  selectedPenId.value = calc.additionalPenId.value
  selectedColor.value = calc.penColorId.value

  await loadAdditionalPens()
  if (showDetails.value && penItems.value.length) {
    applySavedSelection()
  }

  isRestoringSelection = false
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Дополнительная ручка (скоба)</span>
      <B24Button label="Далее" color="air-secondary" @click="continueToNext" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Будет / Не будет -->
      <div class="option-grid">
        <label v-for="option in presenceOptions" :key="option.value" class="lock-card">
          <input v-model="presence" name="pen-presence" type="radio" :value="option.value" class="sr-only" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">{{ option.label }}</span>
          </div>
        </label>
      </div>

      <p v-if="colorError" class="text-sm text-red-600" role="alert">{{ colorError }}</p>

      <!-- Детали (только при "Будет") -->
      <template v-if="showDetails">

        <!-- Кто предоставляет -->
        <div class="option-grid">
          <label v-for="opt in providedOptions" :key="opt.value" class="lock-card">
            <input v-model="penProvided" name="penProvided" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Кто устанавливает -->
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="penInstalled" name="penInstalled" type="radio" :value="opt.value" class="sr-only" />
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
                v-model="selectedColorModel"
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
