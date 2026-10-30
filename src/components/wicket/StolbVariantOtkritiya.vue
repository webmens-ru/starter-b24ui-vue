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
import type { JumperOption, OpeningOption, PipeOption } from '../../app/api/wicket'
import { parsePipeProfileDescriptor, type PipeProfileDescriptor, type PipeProfileProblem } from '../../app/api/pipeProfiles'
import { parseOpeningOrientation } from './openingOrientation'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
const context = { orderId: calc.orderId.value, productRowId: calc.productRowId.value, modelId: calc.modelId.value }
let disposed = false
let editVersion = 0
function isCurrent() {
  return !disposed && calc.orderId.value === context.orderId
    && calc.productRowId.value === context.productRowId && calc.modelId.value === context.modelId
}
onBeforeUnmount(() => { disposed = true })

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')
const saveError = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Столбы ──────────────────────────────────────────────────────────────────
const stolbOptions      = ref<PipeOption[]>([])
const postsChoice = ref<0 | 1 | null>(null)
const stolbId          = ref<string>('')
const showStolbList = computed(() => postsChoice.value === 1)
const stolbLoading = ref(true)
const stolbError = ref('')

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
    if (!isCurrent()) return
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
const showPeremichka = computed(() => openingOptionId.value !== null)
const peremichkaOptions = ref<JumperOption[]>([])
const peremichkaPolozheniyeId = ref<string>('')
const selectedJumper = computed(() => peremichkaOptions.value.find(option => String(option.id) === peremichkaPolozheniyeId.value))
const showSortament = computed(() => selectedJumper.value?.hasJumper === true)
const jumperLoading = ref(false)
const jumperError = ref('')
const sortamentLoading = ref(false)
const sortamentError = ref('')
const jumperProblem = computed(() => {
  if (jumperLoading.value) return 'Положения перемычки загружаются.'
  if (jumperError.value) return jumperError.value
  if (selectedJumper.value?.placement === 'behind' && !selectedOpening.value?.opensOutward) return 'Перемычка за створкой доступна только при открывании наружу.'
  if (!peremichkaPolozheniyeId.value || selectedJumper.value) return ''
  return calc.jumperPlacementProblem.value?.message || 'Сохранённая перемычка недоступна. Выберите действующее положение.'
})
const sortamentOptions       = ref<PipeOption[]>([])
const assortmentJumperId      = ref<string>('')

// Формат для B24SelectMenu: { id, label }
function pipeItems(options: PipeOption[], id: string, name: string) {
  const items = options.map(o => ({ id: String(o.id), label: o.name, disabled: o.disabled }))
  if (id && !options.some(o => String(o.id) === id)) {
    items.push({ id, label: name || 'Сохранённая труба', disabled: true })
  }
  return items
}
const stolbSelectItems = computed(() => pipeItems(stolbOptions.value, stolbId.value, calc.stolbName.value))
const peremichkaSelectItems = computed(() => {
  const items = peremichkaOptions.value.map(o => ({ id: String(o.id), label: o.name, disabled: false }))
  if (peremichkaPolozheniyeId.value && !selectedJumper.value) {
    items.push({ id: peremichkaPolozheniyeId.value, label: calc.peremichkaPolozheniyeName.value || 'Сохранённая перемычка', disabled: true })
  }
  return items
})
const sortamentSelectItems = computed(() => pipeItems(sortamentOptions.value, assortmentJumperId.value, calc.peremichkaSortamentName.value ?? ''))

function pipeDescriptor(options: PipeOption[], id: string, savedProblem: PipeProfileProblem | null): PipeProfileDescriptor {
  if (!id) return { profile: null, profileProblem: { code: 'missing', message: 'Выберите необходимую трубу.' } }
  const item = options.find(o => String(o.id) === id)
  if (!item) return { profile: null, profileProblem: savedProblem ?? { code: 'unavailable', message: 'Выбранная труба недоступна. Выберите действующую.' } }
  return parsePipeProfileDescriptor(item.disabled ? null : item.profile, item.profileProblem)
}
const postDescriptor = computed(() => pipeDescriptor(stolbOptions.value, stolbId.value, calc.postProfileProblem.value))
const jumperDescriptor = computed(() => pipeDescriptor(sortamentOptions.value, assortmentJumperId.value, calc.jumperProfileProblem.value))
const postProfileProblem = computed(() => postsChoice.value === 1 && !stolbLoading.value && !stolbError.value ? postDescriptor.value.profileProblem?.message ?? '' : '')
const jumperProfileProblem = computed(() => showSortament.value && !sortamentLoading.value && !sortamentError.value ? jumperDescriptor.value.profileProblem?.message ?? '' : '')

function syncPostProfile() {
  const post = postsChoice.value === 1 ? postDescriptor.value : { profile: null, profileProblem: null }
  calc.postProfile.value = post.profile
  calc.postProfileProblem.value = post.profileProblem
}

function syncJumperProfile() {
  const jumper = showSortament.value ? jumperDescriptor.value : { profile: null, profileProblem: null }
  calc.jumperProfile.value = jumper.profile
  calc.jumperProfileProblem.value = jumper.profileProblem
}

function syncPipeProfiles() {
  syncPostProfile()
  syncJumperProfile()
}

// ─── Загрузка данных ─────────────────────────────────────────────────────────
async function loadStolbOptions() {
  try {
    const res = await getAssortmentStolb(calc.modelId.value)
    if (!isCurrent()) return
    stolbOptions.value = res.assortmentPipe
  } catch (e) {
    if (isCurrent()) stolbError.value = 'Не удалось загрузить сортамент столбов.'
  } finally {
    if (isCurrent()) stolbLoading.value = false
  }
}

let openingRequestVersion = 0
async function loadPolozhenieOptions(openingId: number): Promise<boolean> {
  const version = ++openingRequestVersion
  jumperLoading.value = true
  jumperError.value = ''
  try {
    const res = await getPolozhenieJumper(calc.modelId.value, openingId)
    if (!isCurrent() || version !== openingRequestVersion || openingId !== openingOptionId.value) return false
    peremichkaOptions.value = res.availablePolozheniyeJumper
    return true
  } catch (e) {
    if (isCurrent() && version === openingRequestVersion) jumperError.value = 'Не удалось загрузить положения перемычки.'
    return false
  } finally {
    if (isCurrent() && version === openingRequestVersion) jumperLoading.value = false
  }
}

let sortamentRequestVersion = 0
async function loadSortamentOptions(): Promise<boolean> {
  const version = ++sortamentRequestVersion
  const selectedId = peremichkaPolozheniyeId.value
  sortamentLoading.value = true
  sortamentError.value = ''
  try {
    const res = await getAssortmentJumper(calc.modelId.value)
    if (!isCurrent() || version !== sortamentRequestVersion || selectedId !== peremichkaPolozheniyeId.value) return false
    sortamentOptions.value = res.assortmentJumper
    return true
  } catch (e) {
    if (isCurrent() && version === sortamentRequestVersion) sortamentError.value = 'Не удалось загрузить сортамент перемычки.'
    return false
  } finally {
    if (isCurrent() && version === sortamentRequestVersion) sortamentLoading.value = false
  }
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onNalichieChange() {
  if (!isCurrent()) return
  ++editVersion
  calc.postsPresenceProblem.value = null
  syncPostFields()
  await save()
}

async function onStolbChange() {
  if (!isCurrent()) return
  ++editVersion
  syncPostFields()
  await save()
}

async function onOpeningOptionChange() {
  if (!isCurrent() || openingOptionId.value === null || openingProblem.value) return
  const version = ++editVersion
  syncOpeningFields()
  ++sortamentRequestVersion
  sortamentLoading.value = false
  sortamentError.value = ''
  assortmentJumperId.value = ''
  peremichkaOptions.value    = []
  sortamentOptions.value     = []
  calc.peremichkaPolozheniyeId.value   = ''
  calc.peremichkaPolozheniyeName.value = ''
  calc.jumperPlacement.value = null
  calc.jumperPlacementProblem.value = null
  calc.assortmentJumperId.value         = null
  calc.jumperProfile.value = null
  calc.jumperProfileProblem.value = null
  calc.peremichkaSortamentName.value   = null
  peremichkaPolozheniyeId.value = ''
  if (!await loadPolozhenieOptions(openingOptionId.value)) return
  await save(version)
}

async function onPolozhenieChange() {
  if (!isCurrent()) return
  const version = ++editVersion
  ++sortamentRequestVersion
  sortamentLoading.value = false
  sortamentError.value = ''
  sortamentOptions.value = []
  assortmentJumperId.value = ''
  syncJumperFields()
  if (showSortament.value) {
    if (!await loadSortamentOptions()) return
  }
  await save(version)
}

async function onSortamentChange() {
  if (!isCurrent()) return
  ++editVersion
  syncJumperFields()
  await save()
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncPostFields() {
  calc.hasStolby.value = postsChoice.value
  calc.nalichieStolbovName.value = postsChoice.value === 1 ? 'Со столбами' : postsChoice.value === 0 ? 'Без столбов' : ''

  if (postsChoice.value === 1) {
    const previousName = String(calc.stolbId.value) === stolbId.value ? calc.stolbName.value : ''
    calc.stolbId.value   = stolbId.value
    const item = stolbOptions.value.find(i => String(i.id) === stolbId.value)
    calc.stolbName.value = item?.name ?? previousName
  } else {
    calc.stolbId.value   = ''
    calc.stolbName.value = ''
  }

  syncPostProfile()
}

function syncJumperFields() {
  calc.peremichkaPolozheniyeId.value = peremichkaPolozheniyeId.value
  const polItem = peremichkaOptions.value.find(i => String(i.id) === peremichkaPolozheniyeId.value)
  calc.peremichkaPolozheniyeName.value = polItem?.name ?? ''
  calc.jumperPlacement.value = polItem?.placement ?? null
  calc.jumperPlacementProblem.value = null

  if (polItem?.hasJumper) {
    const previousName = String(calc.assortmentJumperId.value) === assortmentJumperId.value ? calc.peremichkaSortamentName.value : null
    calc.assortmentJumperId.value = assortmentJumperId.value || null
    const sortItem = sortamentOptions.value.find(i => String(i.id) === assortmentJumperId.value)
    calc.peremichkaSortamentName.value = sortItem?.name ?? previousName
  } else {
    calc.assortmentJumperId.value       = null
    calc.peremichkaSortamentName.value = null
  }
  syncJumperProfile()
}

function syncCalcFields() {
  syncPostFields()
  syncOpeningFields()
  syncJumperFields()
}

function buildBlock() {
  const params: { paramCode?: string; name: string; value: string }[] = [
    { paramCode: 'postsPresence', name: 'Наличие столбов', value: calc.nalichieStolbovName.value },
  ]
  if (postsChoice.value === 1 && calc.stolbName.value) {
    params.push({ paramCode: 'postProfile', name: 'Сортамент столбов', value: calc.stolbName.value })
  }
  if (calc.openingOptionName.value) {
    params.push({ paramCode: 'openingOption', name: 'Вариант открытия', value: calc.openingOptionName.value })
  }
  if (calc.peremichkaPolozheniyeName.value) {
    params.push({ paramCode: 'jumperPlacement', name: 'Положение перемычки', value: calc.peremichkaPolozheniyeName.value })
  }
  if (calc.peremichkaSortamentName.value) {
    params.push({ paramCode: 'jumperProfile', name: 'Сортамент перемычки', value: calc.peremichkaSortamentName.value })
  }
  calc.updateOrCreateBlock('postsOpeningJumper', params, 'Столбы / вариант открытия / перемычка')
}

function selectionProblem(): string {
  return openingProblem.value || (openingOptionId.value === null ? '' : jumperProblem.value)
    || (postsChoice.value === 1 ? (stolbLoading.value ? 'Сортамент столбов загружается.' : stolbError.value) : '')
    || (showSortament.value ? (sortamentLoading.value ? 'Сортамент перемычки загружается.' : sortamentError.value) : '')
    || calc.postsPresenceProblem.value?.message || ''
}

function isComplete(): boolean {
  return postsChoice.value !== null && !!selectedOpening.value && !!selectedJumper.value
    && (postsChoice.value === 0 || postDescriptor.value.profile !== null)
    && (!showSortament.value || jumperDescriptor.value.profile !== null)
}

async function save(version = editVersion): Promise<boolean> {
  if (!isCurrent() || version !== editVersion) return false
  saveError.value = ''
  const problem = selectionProblem()
  if (problem) {
    openModal(problem)
    return false
  }
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      ...(calc.hasStolby.value === null ? {} : { hasStolby: calc.hasStolby.value }),
      stolbId:                  calc.stolbId.value || null,
      openingOptionId:         calc.openingOptionId.value,
      peremichkaPolozheniyeId:   calc.peremichkaPolozheniyeId.value || null,
      assortmentJumperId:        calc.assortmentJumperId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
    if (isCurrent() && version === editVersion) saveError.value = 'Не удалось сохранить выбранную конфигурацию. Повторите попытку.'
    return false
  }

  if (!isCurrent() || version !== editVersion) return false
  if (calc.priceRetail.value && isComplete()) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      if (isCurrent() && version === editVersion) calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
  return isCurrent() && version === editVersion
}

// ─── Кнопка «Далее» ──────────────────────────────────────────────────────────
async function validateAndSave(): Promise<boolean> {
  if (!isCurrent()) return false
  const problem = selectionProblem() || postProfileProblem.value || jumperProfileProblem.value
  if (problem) {
    openModal(problem)
    return false
  }
  if (openingOptionId.value === null) {
    openModal('Выберите вариант открытия')
    return false
  }
  if (postsChoice.value === null) {
    openModal('Выберите наличие столбов')
    return false
  }
  if (!isComplete()) {
    openModal('Выберите действующее положение перемычки и необходимый сортамент.')
    return false
  }
  return await save()
}

const leaveAttempt = createStepLeaveAttempt(validateAndSave, () => emit('next'))
const { validateBeforeLeave, next: handleNext } = leaveAttempt

defineExpose({ validateBeforeLeave })

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  const mountingVersion = editVersion
  calc.setActivePage('page5')

  // Восстанавливаем сохранённые значения
  // Важно: восстанавливаем через hasStolby (1/0), а не через nalichieStolbovName,
  // потому что бэкенд возвращает 'Есть'/'Нет', а компонент использует 'Со столбами'/'Без столбов'
  postsChoice.value = calc.hasStolby.value
  stolbId.value = String(calc.stolbId.value || '')
  peremichkaPolozheniyeId.value = String(calc.peremichkaPolozheniyeId.value || '')
  assortmentJumperId.value = String(calc.assortmentJumperId.value || '')
  if (calc.openingOptionId.value !== null) {
    openingOptionId.value = calc.openingOptionId.value
  }

  await Promise.all([loadStolbOptions(), loadOpeningOptions()])
  if (!isCurrent() || mountingVersion !== editVersion) return

  if (selectedOpening.value && !openingProblem.value) {
    if (!await loadPolozhenieOptions(selectedOpening.value.id)) return
    if (showSortament.value) {
      await loadSortamentOptions()
    }
  }
  if (!isCurrent() || mountingVersion !== editVersion) return
  syncPipeProfiles()
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

    <p v-if="saveError" data-testid="posts-save-error" role="alert" class="text-sm text-red-600">{{ saveError }}</p>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Наличие столбов -->
      <div class="flex flex-col items-start gap-3 w-full">
        <div class="stolb-grid">
          <label class="lock-card">
            <input
              v-model="postsChoice"
              type="radio"
              :value="1"
              class="sr-only"
              @change="onNalichieChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Со столбами</span>
            </div>
          </label>
          <label class="lock-card">
            <input
              v-model="postsChoice"
              type="radio"
              :value="0"
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
      <p v-if="postProfileProblem" role="alert" class="text-red-600">{{ postProfileProblem }}</p>
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
      <p v-if="calc.postsPresenceProblem.value" role="alert" class="text-red-600">{{ calc.postsPresenceProblem.value.message }}</p>
      <p v-if="jumperProblem" role="alert" class="text-red-600">{{ jumperProblem }}</p>
      <p v-if="showSortament && sortamentError" role="alert" class="text-red-600">{{ sortamentError }}</p>
      <p v-if="jumperProfileProblem" role="alert" class="text-red-600">{{ jumperProfileProblem }}</p>
      <div v-show="showPeremichka" class="flex flex-col items-start gap-2 w-full">
        <div class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Перемычка:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="peremichkaPolozheniyeId"
              value-key="id"
              :items="peremichkaSelectItems"
              placeholder="Выберите перемычку"
              :disabled="jumperLoading || !!openingProblem"
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
