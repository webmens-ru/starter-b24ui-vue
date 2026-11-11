<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import { fillingOrientationLabel, fillingOrientationOptions, isFillingOrientation, type FillingOrientationSelection } from '../../app/fillingOrientations'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
const saving = ref(false)
const saveError = ref('')
const owner = calc.getCurrentProductRowContext()
let disposed = false
const isCurrent = () => !disposed && calc.orderId.value === owner.orderId && calc.productRowId.value === owner.productRowId && String(calc.modelId.value) === String(owner.modelId)
onBeforeUnmount(() => { disposed = true })
let savedOrientation = calc.raspolozheniyePolotna.value


const IMG_BASE = 'https://test-lk.doorhan-krd.ru/img/wicket/type1'
const options = fillingOrientationOptions().map(option => ({ ...option,
  img: `${IMG_BASE}/${option.value === 'vertical' ? 'w_v_1.1.png' : 'w_g_1.1.png'}`,
}))

const selected = ref<FillingOrientationSelection>(calc.raspolozheniyePolotna.value)

async function save(): Promise<boolean> {
  if (saving.value || !isCurrent() || !isFillingOrientation(selected.value)) return false
  const requested = selected.value
  const changed = requested !== savedOrientation
  if (changed) calc.markFillingForRecalculation()
  const clearLaying = changed && String(calc.modelId.value) === '3'
  const clearedLaying = { yardButtTrimCode: null, yardButtTrimSide: null, facadeButtTrimCode: null, facadeButtTrimSide: null, gapId: null, gapName: null, numberOfSticks: null, layingFacadeCode: null, layingYardCode: null, gapYardMm: null, numberOfSticksYard: null, yardTrimCode: null }
  saving.value = true
  saveError.value = ''
  calc.raspolozheniyePolotna.value = selected.value

  calc.updateOrCreateBlock('fillingOrientation', [
    { paramCode: 'fillingOrientation', name: 'Расположение полотна', value: fillingOrientationLabel(calc.raspolozheniyePolotna.value) },
  ], 'Расположение полотна')

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      fillingOrientationCode: requested,
      ...(clearLaying ? clearedLaying : {}),
    })
  } catch (e) {
    if (isCurrent()) saveError.value = 'Не удалось сохранить расположение полотна. Нажмите «Далее», чтобы повторить.'
    return false
  } finally {
    saving.value = false
  }
  if (!isCurrent()) return false
  savedOrientation = requested
  if (clearLaying) {
    calc.gapId.value = null
    calc.gapName.value = null
    calc.numberOfSticks.value = null
    calc.layingFacadeCode.value = null
    calc.layingYardCode.value = null
    calc.gapYardMm.value = null
    calc.numberOfSticksYard.value = null
    calc.yardButtTrimCode.value = null
    calc.yardButtTrimSide.value = null
    calc.yardButtTrim.value = null
    calc.facadeButtTrimCode.value = null
    calc.facadeButtTrimSide.value = null
    calc.facadeButtTrim.value = null
    calc.yardTrimCode.value = null
    calc.data.value = calc.data.value.filter(block => !['fenceLayingFacade', 'fenceLayingYard', 'yardFenceTrim'].includes(block.blockCode ?? ''))
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      if (isCurrent()) calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
  return true
}

async function handleNext(): Promise<void> {
  if (await save()) emit('next')
}
defineExpose({ validateBeforeLeave: save })

onMounted(async () => {
  calc.setActivePage('page6')
  selected.value = calc.raspolozheniyePolotna.value
  if (!isFillingOrientation(selected.value)) return
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Расположение полотна</span>
      <B24Button label="Далее" color="air-secondary" :disabled="saving || !isFillingOrientation(selected)" @click="handleNext" />
    </div>

    <p v-if="saveError" role="alert">{{ saveError }}</p>
    <p v-if="!isFillingOrientation(selected)" role="alert">Выберите расположение полотна.</p>
    <!-- Варианты -->
    <div class="polotno-grid">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="lock-card"
      >
        <input
          v-model="selected"
          :disabled="saving"
          type="radio"
          name="fillingOrientationCode"
          :value="opt.value"
          class="sr-only"
          @change="save"
        />
        <div class="card-content">
          <img
            :src="opt.img"
            :alt="opt.label"
            class="w-full h-[140px] object-contain mb-2"
          />
          <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
        </div>
      </label>
    </div>

  </div>
</template>

<style scoped>
.polotno-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
