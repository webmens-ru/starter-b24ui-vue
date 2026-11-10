<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions, saveWicketData, recalculate } from '../../../app/api/wicket'
import { legacyYardSnapshot, applyYardSnapshot } from './fenceLayingState'
import type { FenceGapOption } from '../../../app/api/wicket.types'

const props = defineProps<{ side: 'facade' | 'yard' }>()
const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
const isYard = computed(() => props.side === 'yard')
const mode = ref<'butt' | 'gap' | null>(null)
const selectedId = ref<number | null>(null)
const options = ref<FenceGapOption[]>([])
const loading = ref(false)
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
      side: props.side,
      includeButt: true,
      widthFenceFacade: calc.thicknessFacade.value,
      widthFenceYard: calc.thicknessYard.value,
    })
    if (!isCurrent()) return
    options.value = loadedOptions
    const savedGap = isYard.value
      ? calc.layingYardCode.value === null ? calc.gapName.value : calc.gapYardMm.value
      : calc.gapName.value
    mode.value = (isYard.value ? calc.layingYardCode.value : calc.layingFacadeCode.value)
      ?? (savedGap == null ? null : savedGap === 0 ? 'butt' : 'gap')
    const restored = savedGap == null ? undefined : options.value.find(option => option.gapMm === savedGap)
    selectedId.value = restored?.id ?? null
    if (restored) {
      if (isYard.value) calc.numberOfSticksYard.value = restored.quantity
      else {
        calc.gapId.value = restored.id
        calc.numberOfSticks.value = restored.quantity
      }
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
  const payload = isYard.value
    ? { layingYardCode: mode.value, gapYardMm: option.gapMm, numberOfSticksYard: option.quantity }
    : { layingFacadeCode: mode.value, gapId: option.gapMm === 0 ? null : option.id, gapName: option.gapMm, numberOfSticks: option.quantity }
  try {
    const yardSnapshot = isYard.value ? undefined : await legacyYardSnapshot(calc)
    if (!isCurrent()) return false
    await saveWicketData({ ...calc.getBaseSavePayload(), ...yardSnapshot, ...payload })
    if (!isCurrent()) return false
    applyYardSnapshot(calc, yardSnapshot)
    if (isYard.value) {
      calc.layingYardCode.value = mode.value
      calc.gapYardMm.value = option.gapMm
      calc.numberOfSticksYard.value = option.quantity
    } else {
      calc.layingFacadeCode.value = mode.value
      calc.gapId.value = option.gapMm === 0 ? null : option.id
      calc.gapName.value = option.gapMm
      calc.numberOfSticks.value = option.quantity
    }
    calc.updateOrCreateBlock(isYard.value ? 'fenceLayingYard' : 'fenceLayingFacade', [
      { paramCode: 'layingMode', name: 'Способ укладки', value: mode.value === 'butt' ? 'Встык' : 'С зазором' },
      { paramCode: 'gapMm', name: 'Зазор, мм', value: String(option.gapMm) },
      { paramCode: 'picketCount', name: 'Количество штакетин', value: String(option.quantity) },
    ], isYard.value ? 'Укладка (двор)' : 'Укладка (фасад)')
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
  calc.setActivePage(isYard.value ? 'page2_yard_fence_laying' : 'page2_facade_fence_laying')
  void load()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 pb-2 flex items-center justify-between gap-2">
      <B24Button label="Назад" color="air-secondary" :disabled="saving" @click="back" />
      <span class="text-2xl font-bold text-center">{{ isYard ? 'Двор' : 'Фасад' }} — способ укладки</span>
      <B24Button label="Далее" color="air-secondary" :disabled="loading || saving || !valid" @click="next" />
    </div>
    <p v-if="loading">Загрузка вариантов укладки…</p>
    <div v-if="error" role="alert" class="rounded border border-red-300 bg-red-50 p-3 text-red-700">
      {{ error }}
      <button v-if="!options.length" class="underline ml-2" @click="load">Повторить загрузку</button>
    </div>
    <fieldset :disabled="loading || saving" class="flex flex-col gap-4">
      <legend class="font-semibold mb-3">Способ укладки</legend>
      <div class="flex flex-wrap gap-4">
        <label class="rounded border border-gray-300 bg-white p-4 flex items-center gap-2">
          <input type="radio" name="fenceLaying" data-testid="laying-butt" :checked="mode === 'butt'" :disabled="!options.some(option => option.gapMm === 0)" @change="changeMode('butt')" />
          Встык
        </label>
        <label class="rounded border border-gray-300 bg-white p-4 flex items-center gap-2">
          <input type="radio" name="fenceLaying" data-testid="laying-gap" :checked="mode === 'gap'" :disabled="!positiveOptions.length" @change="changeMode('gap')" />
          С зазором
        </label>
      </div>
      <label v-if="mode === 'gap'" class="flex flex-col gap-2">
        <span class="font-semibold">Зазор между штакетинами</span>
        <select class="rounded border border-gray-300 bg-white px-3 py-2" data-testid="type3-gap-select" :value="selectedId ?? ''" @change="changeGap">
          <option value="">Выберите зазор</option>
          <option v-for="option in positiveOptions" :key="option.id" :value="option.id">{{ option.label }} — {{ option.quantity }} шт.</option>
        </select>
      </label>
      <p v-if="valid">Количество штакетин: <strong>{{ selected?.quantity }} шт.</strong></p>
      <p v-if="!loading && !error && !options.length">Для текущих размеров нет допустимых вариантов укладки.</p>
    </fieldset>
  </div>
</template>
