<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions, saveWicketData, recalculate } from '../../../app/api/wicket'
import { inheritedYardLaying, applyYardSnapshot } from './fenceLayingState'
import type { FenceGapOption } from '../../../app/api/wicket.types'

const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
const mode = ref<'butt' | 'gap' | null>(null)
const selectedId = ref<number | null>(null)
const options = ref<FenceGapOption[]>([])
const loading = ref(false)
const yardCleared = ref(false)
const saving = ref(false)
const error = ref('')
let backRequested = false
let disposed = false
const owner = calc.getCurrentProductRowContext()
const isCurrent = () => !disposed && calc.orderId.value === owner.orderId && calc.productRowId.value === owner.productRowId && String(calc.modelId.value) === String(owner.modelId)
onBeforeUnmount(() => { disposed = true })
const selected = computed(() => options.value.find(option => option.id === selectedId.value))
const positiveOptions = computed(() => options.value.filter(option => option.gapMm > 0))
const valid = computed(() => !!selected.value && (mode.value === 'butt' ? selected.value.gapMm === 0 : mode.value === 'gap' && selected.value.gapMm > 0))

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const loadedOptions = await getFenceGapOptions({
      ...calc.getFullSavePayload(),
      side: 'facade',
      includeButt: true,
      widthFenceFacade: calc.thicknessFacade.value,
      widthFenceYard: calc.thicknessYard.value,
    })
    if (!isCurrent()) return
    options.value = loadedOptions
    const savedGap = calc.gapName.value
    mode.value = calc.layingFacadeCode.value ?? (savedGap == null ? null : savedGap === 0 ? 'butt' : 'gap')
    const restored = savedGap == null ? undefined : options.value.find(option => option.gapMm === savedGap)
    selectedId.value = restored?.id ?? null
    if (restored) {
      calc.gapId.value = restored.id
      calc.numberOfSticks.value = restored.quantity
    }
  } catch {
    options.value = []
    error.value = 'Не удалось загрузить варианты укладки. Повторите загрузку.'
  } finally {
    loading.value = false
  }
}

async function persist(): Promise<boolean> {
  if (loading.value || saving.value || !valid.value || !selected.value) return false
  saving.value = true
  error.value = ''
  const option = selected.value
  const payload = { layingFacadeCode: mode.value, gapId: option.gapMm === 0 ? null : option.id, gapName: option.gapMm, numberOfSticks: option.quantity }
  try {
    const yardSnapshot = await inheritedYardLaying(calc, mode.value, option.gapMm)
    if (!isCurrent()) return false
    await saveWicketData({ ...calc.getBaseSavePayload(), applySharedFenceLaying: true, ...yardSnapshot, ...payload })
    if (!isCurrent()) return false
    applyYardSnapshot(calc, yardSnapshot)
    yardCleared.value = yardSnapshot.idYard === null
    calc.layingFacadeCode.value = mode.value
    calc.gapId.value = option.gapMm === 0 ? null : option.id
    calc.gapName.value = option.gapMm
    calc.numberOfSticks.value = option.quantity
    calc.updateOrCreateBlock('fenceLayingFacade', [
      { paramCode: 'layingMode', name: 'Способ укладки', value: mode.value === 'butt' ? 'Встык' : 'С зазором' },
      { paramCode: 'gapMm', name: 'Зазор, мм', value: String(option.gapMm) },
      { paramCode: 'picketCount', name: 'Количество штакетин', value: String(option.quantity) },
    ], 'Укладка (фасад)')
  } catch {
    error.value = 'Не удалось сохранить способ укладки. Нажмите «Далее», чтобы повторить.'
    return false
  } finally {
    saving.value = false
  }
  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({ ...calc.getCurrentProductRowContext(), productType: calc.productType.value, model: calc.model.value, modelId: calc.modelId.value })
      if (isCurrent()) calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch {
      // Saving succeeded; the wizard also refreshes pricing after navigation.
    }
  }
  return true
}

async function changeMode(value: 'butt' | 'gap'): Promise<void> {
  mode.value = value
  selectedId.value = value === 'butt' ? options.value.find(option => option.gapMm === 0)?.id ?? null : null
  if (valid.value) await persist()
}
async function changeGap(event: Event): Promise<void> {
  selectedId.value = Number((event.target as HTMLSelectElement).value) || null
  if (valid.value) await persist()
}
async function validateBeforeLeave(): Promise<boolean> {
  if (loading.value || saving.value) return false
  if (backRequested) { backRequested = false; return true }
  if (!valid.value) return false
  // Persist restored legacy selections once this step is completed as well.
  return persist()
}
function back(): void {
  backRequested = true
  emit('back')
}
async function next(): Promise<void> {
  if (valid.value && await validateBeforeLeave()) emit('next')
}
defineExpose({ validateBeforeLeave })
onMounted(() => {
  calc.setActivePage('page2_facade_fence_laying')
  void load()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" :disabled="saving" @click="back" />
      <span class="text-3xl font-bold flex-1 text-center">Фасад — способ укладки</span>
      <B24Button label="Далее" color="air-secondary" :disabled="loading || saving || !valid" @click="next" />
    </div>
    <p v-if="yardCleared" role="status" class="text-center text-sm">Выберите материал двора заново: его ширина должна совпадать с фасадом.</p>
    <p v-if="loading">Загрузка вариантов укладки…</p>
    <div v-if="error" role="alert" class="rounded border border-red-300 bg-red-50 p-3 text-red-700">
      {{ error }}
      <button v-if="!options.length" class="underline ml-2" @click="load">Повторить загрузку</button>
    </div>
    <fieldset :disabled="loading || saving" class="min-w-0 space-y-4">
      <legend class="w-full text-center text-xl font-semibold mb-3">Способ укладки</legend>
      <div class="option-grid">
        <label class="lock-card">
          <input type="radio" class="sr-only" name="fenceLaying" data-testid="laying-butt" :checked="mode === 'butt'" :disabled="!options.some(option => option.gapMm === 0)" @change="changeMode('butt')" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">Встык</span></div>
        </label>
        <label class="lock-card">
          <input type="radio" class="sr-only" name="fenceLaying" data-testid="laying-gap" :checked="mode === 'gap'" :disabled="!positiveOptions.length" @change="changeMode('gap')" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">С зазором</span></div>
        </label>
      </div>
      <label v-if="mode === 'gap'" class="laying-details flex flex-col gap-2">
        <span class="font-semibold">Зазор между штакетинами</span>
        <select class="rounded border border-gray-300 bg-white px-3 py-2" data-testid="type3-gap-select" :value="selectedId ?? ''" @change="changeGap">
          <option value="">Выберите зазор</option>
          <option v-for="option in positiveOptions" :key="option.id" :value="option.id">{{ option.label }} — {{ option.quantity }} шт.</option>
        </select>
      </label>
      <p v-if="valid" class="text-center">Количество штакетин: <strong>{{ selected?.quantity }} шт.</strong></p>
      <p v-if="!loading && !error && !options.length">Для текущих размеров нет допустимых вариантов укладки.</p>
    </fieldset>
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

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
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
}

.lock-card:has(input:focus-visible) {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}
.lock-card:has(input:disabled),
fieldset:disabled .lock-card {
  cursor: default;
  opacity: 0.6;
}
.laying-details {
  max-width: 600px;
  margin-inline: auto;
}
</style>
