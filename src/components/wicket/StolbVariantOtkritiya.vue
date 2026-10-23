<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

import { useCalculation } from '../../composables/useCalculation'
import {
  getAssortmentStolb,
  getOpeningOptions,
  getPolozhenieJumper,
  getAssortmentJumper,
  saveWicketData,
  recalculate,
} from '../../app/api/wicket'
import type { OpeningOption, SelectItem } from '../../app/api/wicket'
import { parseOpeningOrientation } from './openingOrientation'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
let disposed = false
onBeforeUnmount(() => { disposed = true })

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Столбы ──────────────────────────────────────────────────────────────────
const stolbOptions      = ref<SelectItem[]>([])
const nalichieStolbovName  = ref<'Со столбами' | 'Без столбов'>('Со столбами')
const stolbId          = ref<string>('')
const showStolbList     = computed(() => nalichieStolbovName.value === 'Со столбами')

// ─── Вариант открытия ────────────────────────────────────────────────────────
const openingOptionId = ref<number | null>(null)
const availableOpeningOptions = ref<OpeningOption[]>([])
const openingCatalogProblems = ref<Array<{ id: number; message: string }>>([])
const openingLoading = ref(true)
const openingLoadError = ref('')
const selectedOpening = computed(() => availableOpeningOptions.value.find(option => option.id === openingOptionId.value))
const openingProblem = computed(() => {
  if (openingLoading.value) return 'Варианты открытия загружаются.'
  if (openingLoadError.value) return openingLoadError.value
  if (openingOptionId.value === null || selectedOpening.value) return ''
  return calc.openingOrientationProblem.value?.message
    || openingCatalogProblems.value.find(problem => problem.id === openingOptionId.value)?.message
    || 'Выбранный вариант открытия недоступен. Выберите действующий вариант.'
})
const openingOptions = computed(() => {
  const items = availableOpeningOptions.value.map(option => ({ id: option.id, label: option.name, img: option.pathPhoto, available: true }))
  if (openingOptionId.value !== null && !selectedOpening.value) {
    items.push({ id: openingOptionId.value, label: calc.openingOptionName.value || 'Сохранённый вариант открытия', img: calc.openingOptionPathPhoto.value, available: false })
  }
  return items
})

function syncOpeningFields() {
  const option = selectedOpening.value
  calc.openingOptionId.value = openingOptionId.value
  calc.openingOptionName.value = option?.name ?? ''
  calc.openingOptionPathPhoto.value = option?.pathPhoto ?? ''
  calc.openingOrientation.value = option ? parseOpeningOrientation(option) : null
  calc.openingOrientationProblem.value = null
}

async function loadOpeningOptions() {
  try {
    const response = await getOpeningOptions()
    if (disposed) return
    availableOpeningOptions.value = response.options
    openingCatalogProblems.value = response.problems
    if (selectedOpening.value) syncOpeningFields()
  } catch {
    openingLoadError.value = 'Не удалось загрузить варианты открытия. Повторите загрузку страницы.'
  } finally {
    openingLoading.value = false
  }
}

// ─── Перемычка ───────────────────────────────────────────────────────────────
const showPeremichka         = ref(false)
const peremichkaOptions      = ref<SelectItem[]>([])
const peremichkaPolozheniyeId = ref<string>('')
const showSortament          = ref(false)
const sortamentOptions       = ref<SelectItem[]>([])
const assortmentJumperId      = ref<string>('')

// Формат для B24SelectMenu: { id, label }
const stolbSelectItems       = computed(() => stolbOptions.value.map(o => ({ id: String(o.id), label: o.name })))
const peremichkaSelectItems  = computed(() => peremichkaOptions.value.map(o => ({ id: String(o.id), label: o.name })))
const sortamentSelectItems   = computed(() => sortamentOptions.value.map(o => ({ id: String(o.id), label: o.name })))

// ─── Загрузка данных ─────────────────────────────────────────────────────────
async function loadStolbOptions() {
  try {
    const res = await getAssortmentStolb(calc.modelId.value)
    stolbOptions.value = res.assortmentPipe
    // Дефолтный выбор id=7 при первом открытии
    if (!stolbId.value) {
      const defaultItem = stolbOptions.value.find(i => i.id === 7)
      stolbId.value = String(defaultItem?.id ?? stolbOptions.value[0]?.id ?? '')
    }
  } catch (e) {
    console.warn('getAssortmentStolb:', e)
  }
}

let openingRequestVersion = 0
async function loadPolozhenieOptions(openingId: number): Promise<boolean> {
  const version = ++openingRequestVersion
  try {
    const res = await getPolozhenieJumper(calc.modelId.value, openingId)
    if (disposed || version !== openingRequestVersion || openingId !== openingOptionId.value) return false
    peremichkaOptions.value = res.availablePolozheniyeJumper
    if (!peremichkaPolozheniyeId.value) {
      peremichkaPolozheniyeId.value = String(peremichkaOptions.value[0]?.id ?? '')
    }
    return true
  } catch (e) {
    console.warn('getPolozhenieJumper:', e)
    return false
  }
}

async function loadSortamentOptions() {
  try {
    const res = await getAssortmentJumper(calc.modelId.value)
    sortamentOptions.value = res.assortmentJumper
    // Дефолтный выбор id=11 при первом открытии
    if (!assortmentJumperId.value) {
      const defaultItem = sortamentOptions.value.find(i => i.id === 11)
      assortmentJumperId.value = String(defaultItem?.id ?? sortamentOptions.value[0]?.id ?? '')
    }
  } catch (e) {
    console.warn('getAssortmentJumper:', e)
  }
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onNalichieChange() {
  await save()
}

async function onStolbChange() {
  await save()
}

async function onOpeningOptionChange() {
  if (openingOptionId.value === null || openingProblem.value) return
  syncOpeningFields()
  showPeremichka.value = true
  showSortament.value  = false
  assortmentJumperId.value = ''
  peremichkaOptions.value    = []
  sortamentOptions.value     = []
  calc.peremichkaPolozheniyeId.value   = ''
  calc.peremichkaPolozheniyeName.value = ''
  calc.assortmentJumperId.value         = null
  calc.peremichkaSortamentName.value   = null
  peremichkaPolozheniyeId.value = ''
  if (!await loadPolozhenieOptions(openingOptionId.value)) return
  await save()
}

async function onPolozhenieChange() {
  showSortament.value = peremichkaPolozheniyeId.value !== '1'
  sortamentOptions.value = []
  assortmentJumperId.value = ''
  if (showSortament.value) {
    await loadSortamentOptions()
  }
  await save()
}

async function onSortamentChange() {
  await save()
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.nalichieStolbovName.value = nalichieStolbovName.value
  calc.hasStolby.value   = nalichieStolbovName.value === 'Со столбами' ? 1 : 0

  if (nalichieStolbovName.value === 'Со столбами') {
    calc.stolbId.value   = stolbId.value
    const item = stolbOptions.value.find(i => String(i.id) === stolbId.value)
    calc.stolbName.value = item?.name ?? ''
  } else {
    calc.stolbId.value   = ''
    calc.stolbName.value = ''
  }

  syncOpeningFields()

  calc.peremichkaPolozheniyeId.value = peremichkaPolozheniyeId.value
  const polItem = peremichkaOptions.value.find(i => String(i.id) === peremichkaPolozheniyeId.value)
  calc.peremichkaPolozheniyeName.value = polItem?.name ?? ''

  if (calc.peremichkaPolozheniyeName.value && calc.peremichkaPolozheniyeName.value !== 'Без перемычки') {
    calc.assortmentJumperId.value = assortmentJumperId.value || null
    const sortItem = sortamentOptions.value.find(i => String(i.id) === assortmentJumperId.value)
    calc.peremichkaSortamentName.value = sortItem?.name ?? null
  } else {
    calc.assortmentJumperId.value       = null
    calc.peremichkaSortamentName.value = null
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Наличие столбов', value: calc.nalichieStolbovName.value },
  ]
  if (nalichieStolbovName.value === 'Со столбами' && calc.stolbName.value) {
    params.push({ name: 'Сортамент столбов', value: calc.stolbName.value })
  }
  if (calc.openingOptionName.value) {
    params.push({ name: 'Вариант открытия', value: calc.openingOptionName.value })
  }
  if (calc.peremichkaPolozheniyeName.value) {
    params.push({ name: 'Положение перемычки', value: calc.peremichkaPolozheniyeName.value })
  }
  if (calc.peremichkaSortamentName.value) {
    params.push({ name: 'Сортамент перемычки', value: calc.peremichkaSortamentName.value })
  }
  calc.updateOrCreateBlock('Столбы / вариант открытия / перемычка', params)
}

async function save(): Promise<boolean> {
  if (disposed) return false
  if (openingProblem.value) {
    openModal(openingProblem.value)
    return false
  }
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      nalichieStolbovName:     calc.nalichieStolbovName.value,
      hasStolby:               calc.hasStolby.value,
      stolbName:                calc.stolbName.value,
      stolbId:                  calc.stolbId.value,
      openingOptionName:       calc.openingOptionName.value,
      openingOptionId:         calc.openingOptionId.value,
      openingOptionPathPhoto: calc.openingOptionPathPhoto.value,
      peremichkaPolozheniyeName: calc.peremichkaPolozheniyeName.value,
      peremichkaPolozheniyeId:   calc.peremichkaPolozheniyeId.value,
      peremichkaSortamentName:   calc.peremichkaSortamentName.value,
      assortmentJumperId:        calc.assortmentJumperId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
    openModal('Не удалось сохранить выбранный вариант открытия. Повторите попытку.')
    return false
  }

  if (!disposed && calc.priceRetail.value && selectedOpening.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
  return true
}

// ─── Кнопка «Далее» ──────────────────────────────────────────────────────────
async function validateAndSave(): Promise<boolean> {
  if (openingProblem.value) {
    openModal(openingProblem.value)
    return false
  }
  if (openingOptionId.value === null) {
    openModal('Выберите вариант открытия')
    return false
  }
  return await save()
}

const leaveAttempt = createStepLeaveAttempt(validateAndSave, () => emit('next'))
const { validateBeforeLeave, next: handleNext } = leaveAttempt

defineExpose({ validateBeforeLeave })

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page5')

  // Восстанавливаем сохранённые значения
  // Важно: восстанавливаем через hasStolby (1/0), а не через nalichieStolbovName,
  // потому что бэкенд возвращает 'Есть'/'Нет', а компонент использует 'Со столбами'/'Без столбов'
  if (calc.hasStolby.value === 1) {
    nalichieStolbovName.value = 'Со столбами'
  } else if (calc.hasStolby.value === 0) {
    nalichieStolbovName.value = 'Без столбов'
  }
  if (calc.openingOptionId.value !== null) {
    openingOptionId.value = calc.openingOptionId.value
  }

  await Promise.all([loadStolbOptions(), loadOpeningOptions()])

  // Восстанавливаем stolbId после загрузки списка
  if (calc.stolbId.value) {
    stolbId.value = String(calc.stolbId.value)
  }

  if (selectedOpening.value && !openingProblem.value) {
    showPeremichka.value = true
    await loadPolozhenieOptions(selectedOpening.value.id)
    if (calc.peremichkaPolozheniyeId.value) {
      peremichkaPolozheniyeId.value = String(calc.peremichkaPolozheniyeId.value)
    }
    if (peremichkaPolozheniyeId.value && peremichkaPolozheniyeId.value !== '1') {
      showSortament.value = true
      await loadSortamentOptions()
      if (calc.assortmentJumperId.value) {
        assortmentJumperId.value = String(calc.assortmentJumperId.value)
      }
    }
  }

})
</script>

<template>
  <div class="flex flex-col gap-4">

    <B24Modal
      v-model:open="showModal"
      :title="modalTitle"
      :description="modalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Столбы / Вариант открытия / Перемычка</span>
      <B24Button label="Далее"  color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Наличие столбов -->
      <div class="flex flex-col items-start gap-3 w-full">
        <div class="stolb-grid">
          <label class="lock-card">
            <input
              v-model="nalichieStolbovName"
              type="radio"
              value="Со столбами"
              class="sr-only"
              @change="onNalichieChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Со столбами</span>
            </div>
          </label>
          <label class="lock-card">
            <input
              v-model="nalichieStolbovName"
              type="radio"
              value="Без столбов"
              class="sr-only"
              @change="onNalichieChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Без столбов</span>
            </div>
          </label>
        </div>
        <div v-show="showStolbList" class="stolb-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Столб:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="stolbId"
              value-key="id"
              :items="stolbSelectItems"
              placeholder="Выберите столб"
              class="w-full"
              @update:model-value="onStolbChange"
            />
          </div>
        </div>
      </div>

      <!-- Вариант открытия -->
      <p v-if="openingProblem" role="alert" class="text-red-600">{{ openingProblem }}</p>
      <div class="opening-grid">
        <label
          v-for="opt in openingOptions"
          :key="opt.id"
          class="lock-card"
        >
          <input
            v-model="openingOptionId"
            type="radio"
            :value="opt.id"
            :disabled="openingLoading || !opt.available"
            class="sr-only"
            @change="onOpeningOptionChange"
          />
          <div class="card-content">
            <img
              v-if="opt.img"
              :src="opt.img"
              :alt="opt.label"
              class="w-full h-[140px] object-contain mb-2"
            />
            <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
          </div>
        </label>
      </div>

      <!-- Перемычка -->
      <div v-show="showPeremichka" class="flex flex-col items-start gap-2 w-full">
        <div class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Перемычка:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="peremichkaPolozheniyeId"
              value-key="id"
              :items="peremichkaSelectItems"
              placeholder="Выберите перемычку"
              class="w-full"
              @update:model-value="onPolozhenieChange"
            />
          </div>
        </div>
        <div v-show="showSortament" class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Труба:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="assortmentJumperId"
              value-key="id"
              :items="sortamentSelectItems"
              placeholder="Выберите трубу"
              class="w-full"
              @update:model-value="onSortamentChange"
            />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stolb-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 4px;
  width: 100%;
}

@media (min-width: 640px) {
  .stolb-grid {
    grid-template-columns: repeat(2, 1fr);
    min-width: 350px;
    max-width: 600px;
  }
}

.stolb-select-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}


.peremichka-select-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.opening-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 4px;
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
  background: #eff6ff;
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
