<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData } from '../../../app/api/wicket'
const props = defineProps<{ side: 'facade' | 'yard' }>()
const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
const field = computed(() => props.side === 'yard' ? calc.fenceEdgeYardId : calc.fenceEdgeFacadeId)
const options = computed(() => calc.fenceEdgeOptions.value.filter(edge => Number(calc.raspolozheniyePolotna.value === 'horizontal' ? edge.isHorizontal : edge.isVertical) === 1))
const selected = ref<number | null>(field.value.value == null ? null : Number(field.value.value))
const saving = ref(false)
const error = ref('')
let disposed = false
let backRequested = false
onBeforeUnmount(() => { disposed = true })
onMounted(() => calc.setActivePage(props.side === 'yard' ? 'page2_yard_fence_edge' : 'page2_facade_fence_edge'))
const owner = calc.getCurrentProductRowContext()
const current = () => !disposed && calc.orderId.value === owner.orderId && calc.productRowId.value === owner.productRowId && String(calc.modelId.value) === String(owner.modelId)
async function persist(): Promise<boolean> {
  if (saving.value || !current()) return false
  if (!options.value.length) return true
  if (!options.value.some(option => Number(option.id) === selected.value)) {
    error.value = 'Выберите край штакетника.'
    return false
  }
  if (Number(field.value.value) === selected.value) return true
  saving.value = true
  error.value = ''
  try {
    await saveWicketData({ ...calc.getBaseSavePayload(), [props.side === 'yard' ? 'fenceEdgeYardId' : 'fenceEdgeFacadeId']: selected.value })
    if (!current()) return false
    field.value.value = selected.value
    return true
  } catch {
    if (current()) error.value = 'Не удалось сохранить край штакетника. Повторите попытку.'
    return false
  } finally {
    saving.value = false
  }
}
async function next(): Promise<void> { if (await persist()) emit('next') }
function back(): void { backRequested = true; emit('back') }
defineExpose({ validateBeforeLeave: () => {
  if (backRequested) { backRequested = false; return true }
  return persist()
} })
</script>

<template>
  <div>
    <div class="sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 mb-5">
      <B24Button label="Назад" color="air-secondary" :disabled="saving" @click="back" />
      <h2 class="text-3xl font-bold flex-1 text-center">{{ side === 'yard' ? 'Двор' : 'Фасад' }} — край штакетника</h2>
      <B24Button label="Далее" color="air-secondary" :disabled="saving" @click="next" />
    </div>
    <div class="max-w-[600px] mx-auto">
      <p v-if="error" role="alert" class="text-red-600 mb-4">{{ error }}</p>
      <p v-if="!options.length">Для выбранного направления нет доступных вариантов края.</p>
      <p v-else-if="selected != null && !options.some(option => Number(option.id) === selected)" role="status">Сохранённый край недоступен для нового выбора. Выберите другой вариант.</p>
      <div class="grid grid-cols-2 gap-3">
        <label v-for="option in options" :key="option.id" class="edge-choice" :class="{ selected: selected === Number(option.id) }">
          <input v-model="selected" type="radio" :value="Number(option.id)" :disabled="saving" :name="`edge-${side}`">
          <img v-if="option.maskFile" :src="option.maskFile" alt="" class="edge-preview">
          <span>{{ option.name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
<style scoped>
.edge-choice { display:flex; flex-direction:column; align-items:center; gap:12px; padding:16px; background:white; border:2px solid #e3e5eb; border-radius:12px; cursor:pointer; font-weight:600; }
.edge-choice.selected { border-color:#3b82f6; background:#eff6ff; box-shadow:0 0 0 3px #dbeafe; }
.edge-choice input { position:absolute; opacity:0; }
.edge-choice:focus-within { outline:2px solid #2563eb; outline-offset:3px; }
.edge-preview { width:130px; height:40px; object-fit:contain; background:#9ca3af; }
</style>
