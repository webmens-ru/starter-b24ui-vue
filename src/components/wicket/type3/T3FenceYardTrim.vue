<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { getFenceGapOptions, saveWicketData, recalculate } from '../../../app/api/wicket'
import { applyYardSnapshot } from './fenceLayingState'
const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
import type { FacadeButtTrim, FacadeButtTrimSide } from '../../../app/api/wicket.types'
const butt = computed(() => calc.layingFacadeCode.value === 'butt')
const trim = ref<FacadeButtTrim | null>(null)
const trimSide = ref<FacadeButtTrimSide | null>(calc.yardButtTrimSide.value)
const sides = computed(() => calc.raspolozheniyePolotna.value === 'horizontal' ? [{ code: 'top' as const, label: 'Сверху' }, { code: 'bottom' as const, label: 'Снизу' }] : [{ code: 'hinge' as const, label: 'Со стороны петель' }, { code: 'lock' as const, label: 'Со стороны замка' }])
const buttValid = computed(() => !!trim.value && trim.value.mode !== 'unavailable' && (!trim.value.requiresSide || sides.value.some(side => side.code === trimSide.value)))
const choice = ref<'none' | 'edge' | null>(calc.yardTrimCode.value ?? 'edge')
const available = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
let disposed = false
let backRequested = false
const owner = calc.getCurrentProductRowContext()
const isCurrent = () => !disposed && calc.orderId.value === owner.orderId && calc.productRowId.value === owner.productRowId && String(calc.modelId.value) === String(owner.modelId)
onBeforeUnmount(() => { disposed = true })
async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side: 'yard', includeButt: true, yardTrimCode: 'none', widthFenceFacade: calc.thicknessFacade.value, widthFenceYard: calc.thicknessYard.value })
    if (isCurrent()) {
      const selected = options.find(option => option.gapMm === calc.gapName.value)
      available.value = selected?.yardEdgeTrimAvailable === true
      trim.value = selected?.buttTrim ?? null
      if (butt.value) { calc.yardButtTrim.value = trim.value; if (!buttValid.value) error.value = trim.value?.mode === 'unavailable' || !trim.value ? 'Подрезка недоступна для текущих размеров.' : '' }
    }
  } catch { error.value = 'Не удалось проверить подрезку. Повторите загрузку.' }
  finally { loading.value = false }
  if (isCurrent() && !butt.value && !error.value && available.value && calc.yardTrimCode.value === null) await persist()
}
async function persist(): Promise<boolean> {
  if (loading.value || saving.value || (butt.value ? !buttValid.value : choice.value === null || (choice.value === 'edge' && !available.value))) return false
  saving.value = true
  error.value = ''
  const code = choice.value
  const previous = { yardTrimCode: calc.yardTrimCode.value, yardButtTrimCode: calc.yardButtTrimCode.value, yardButtTrimSide: calc.yardButtTrimSide.value, yardButtTrim: calc.yardButtTrim.value, numberOfSticksYard: calc.numberOfSticksYard.value, layingYardCode: calc.layingYardCode.value, gapYardMm: calc.gapYardMm.value }
  let staged = false
  try {
    const options = await getFenceGapOptions({ ...calc.getFullSavePayload(), side: 'yard', includeButt: true, yardTrimCode: code, ...(butt.value ? { yardButtTrimCode: trim.value!.mode, yardButtTrimSide: trim.value!.requiresSide ? trimSide.value : null } : {}), widthFenceFacade: calc.thicknessFacade.value, widthFenceYard: calc.thicknessYard.value })
    if (!isCurrent()) return false
    const selected = options.find(option => option.gapMm === calc.gapName.value)
    if (!selected) throw new Error('Нет укладки')
    staged = true
    if (butt.value) {
      calc.yardButtTrimCode.value = trim.value!.mode === 'unavailable' ? null : trim.value!.mode
      calc.yardButtTrimSide.value = trim.value!.requiresSide ? trimSide.value : null
      calc.yardButtTrim.value = trim.value
      calc.numberOfSticksYard.value = selected.quantity
      calc.yardTrimCode.value = null
    } else {
    applyYardSnapshot(calc, { layingYardCode: calc.layingYardCode.value, gapYardMm: calc.gapName.value, numberOfSticksYard: selected.quantity, yardTrimCode: code })
    }
    await saveWicketData({ ...calc.getBaseSavePayload(), applySharedFenceLaying: true, yardTrimCode: butt.value ? null : code, ...(butt.value ? { yardButtTrimCode: trim.value!.mode === 'unavailable' ? null : trim.value!.mode, yardButtTrimSide: trim.value!.requiresSide ? trimSide.value : null } : {}) })
    if (!isCurrent()) return false
    if (butt.value) {
      calc.updateOrCreateBlock('yardFenceTrim', [{ paramCode: 'yardButtTrimCode', name: 'Подрезка планок', value: trim.value!.mode === 'none' ? 'Без подрезки' : trim.value!.mode === 'both' ? 'Две крайние планки' : 'Одна крайняя планка' }], 'Подрезка планок (двор)')
    } else {
    calc.updateOrCreateBlock('yardFenceTrim', [{ paramCode: 'yardTrimCode', name: 'Подрезка планок', value: code === 'edge' ? 'С подрезкой' : 'Без подрезки' }], 'Подрезка планок (двор)')
    }
    if (calc.priceRetail.value) {
      try {
        const result = await recalculate({ ...calc.getCurrentProductRowContext(), productType: calc.productType.value, model: calc.model.value, modelId: calc.modelId.value })
        if (isCurrent()) calc.updatePriceBlock(result.priceDealer, result.priceRetail)
      } catch {
        // The choice is saved; navigation can retry pricing independently.
      }
    }
    return true
  } catch {
    if (staged && isCurrent()) {
      calc.yardTrimCode.value = previous.yardTrimCode
      calc.yardButtTrimCode.value = previous.yardButtTrimCode
      calc.yardButtTrimSide.value = previous.yardButtTrimSide
      calc.yardButtTrim.value = previous.yardButtTrim
      calc.numberOfSticksYard.value = previous.numberOfSticksYard
      calc.layingYardCode.value = previous.layingYardCode
      calc.gapYardMm.value = previous.gapYardMm
    }
    error.value = 'Не удалось сохранить подрезку. Нажмите «Далее», чтобы повторить.'; return false }
  finally { saving.value = false }
}
async function select(code: 'none' | 'edge'): Promise<void> { if (choice.value !== code) calc.invalidateFillingPreview('yard'); choice.value = code; await persist() }
function selectTrimSide(side: FacadeButtTrimSide): void {
  if (trimSide.value !== side) calc.invalidateFillingPreview('yard')
  trimSide.value = side
}
async function validateBeforeLeave(): Promise<boolean> {
  if (saving.value || loading.value) return false
  if (backRequested) { backRequested = false; return true }
  return persist()
}
function back(): void { backRequested = true; emit('back') }
async function next(): Promise<void> { if (await validateBeforeLeave()) emit('next') }
defineExpose({ validateBeforeLeave })
onMounted(() => { calc.setActivePage('page2_yard_fence_trim'); void load() })
</script>
<template>
  <div class="flex flex-col gap-4">
    <div class="sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" :disabled="saving" @click="back" />
      <span class="text-3xl font-bold flex-1 text-center">Двор — подрезка планок</span>
      <B24Button label="Далее" color="air-secondary" :disabled="loading || saving || (butt ? !buttValid : choice === null || (choice === 'edge' && !available))" @click="next" />
    </div>
    <p v-if="loading">Проверка размеров…</p>
    <div v-if="error" role="alert" class="rounded border border-red-300 bg-red-50 p-3 text-red-700">{{ error }} <button v-if="!saving" class="underline" @click="load">Повторить загрузку</button></div>
    <div v-if="butt && !loading" class="space-y-4 text-center">
      <p v-if="trim?.mode === 'none'">Планки укладываются без подрезки.</p>
      <p v-else-if="trim?.mode === 'both'">Две крайние планки одинаковой ширины: {{ trim.widthMm }} мм.</p>
      <p v-else-if="trim?.mode === 'single'">Одна крайняя планка шириной {{ trim.widthMm }} мм. Выберите сторону подрезки.</p>
      <div v-if="trim?.requiresSide" class="flex justify-center gap-4">
        <label v-for="side in sides" :key="side.code"><input :checked="trimSide === side.code" @change="selectTrimSide(side.code)" type="radio" name="yardButtSide" :value="side.code" :disabled="saving" /> {{ side.label }}</label>
      </div>
    </div>
    <fieldset v-if="!butt" :disabled="loading || saving" class="min-w-0 space-y-4">
      <legend class="w-full text-center text-xl font-semibold mb-3">Подрезка крайних планок</legend>
      <div class="option-grid">
        <label class="lock-card"><input type="radio" class="sr-only" name="yardTrim" data-testid="trim-none" :checked="choice === 'none'" @change="select('none')" /><div class="card-content"><span class="block text-sm font-semibold text-center">Без подрезки</span></div></label>
        <label class="lock-card"><input type="radio" class="sr-only" name="yardTrim" data-testid="trim-edge" :checked="choice === 'edge'" :disabled="!available" @change="select('edge')" /><div class="card-content"><span class="block text-sm font-semibold text-center">С подрезкой</span></div></label>
      </div>
      <p v-if="!loading && !available" class="text-center">Подрезка недоступна для текущих размеров.</p>
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
</style>
