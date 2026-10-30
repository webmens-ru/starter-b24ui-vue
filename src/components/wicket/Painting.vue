<script setup lang="ts">
import { participantRoleLabel, participantRoleOptions } from '../../app/participantRoles'
import { withoutSummaryBlock } from '../../app/summaryCodes'
import PaintingProviders from './PaintingProviders.vue'
import ProviderChoice from './ProviderChoice.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, recalculate, saveWicketData } from '../../app/api/wicket'
import type { PaintItem, PaintCategoryItem } from '../../app/api/wicket.types'
import { selectPaintColor } from './paintSelection'
import { createStepLeaveAttempt } from './stepLeaveAttempt'
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const contextKey = () => `${calc.orderId.value}:${calc.productRowId.value}:${calc.modelId.value}`
const initialContext = contextKey()
let mounted = true
const current = () => mounted && contextKey() === initialContext
onUnmounted(() => { mounted = false })
const paints = ref<PaintItem[]>([])
const categories = ref<PaintCategoryItem[]>([])
const category = ref<number | null>(null)
const draftPaintId = ref<number | null>(calc.paintId.value)
const draftColorId = ref<number | null>(calc.paintColorId.value)
const loading = ref(true)
const saving = ref(false)
let pendingSave: Promise<boolean> | null = null
const draftNote = ref(calc.colorShieldNote.value)
const submitted = ref(false)
const error = ref('')
const catalogError = ref('')
const selectedPaint = computed(() => paints.value.find(item => item.id === draftPaintId.value))
const selectedColor = computed(() => selectedPaint.value?.colors.find(item => item.id === draftColorId.value))
const customerPainting = computed(() => calc.doesPaintingFrameCode.value === 'customer')
const individual = computed(() => selectedPaint.value?.isFixedColor === false)
const requiresNote = computed(() => selectedPaint.value?.requiresColorNote === true)
const primers = computed(() => selectedPaint.value?.primers ?? [])
const paintItems = computed(() => {
  const groups = new Map<number | null, PaintItem[]>()
  for (const item of paints.value) {
    if (category.value != null && item.paintCategoryId !== category.value) continue
    const group = groups.get(item.paintTypeId)
    if (group) group.push(item)
    else groups.set(item.paintTypeId, [item])
  }
  return [...groups.entries()].flatMap(([typeId, items]) => [
    { type: 'label' as const, label: typeId == null ? 'Без типа' : items[0]?.paintTypeName ?? 'Тип краски' },
    ...items.map(item => ({ id: String(item.id), label: item.name })),
  ])
})
const colorItems = computed(() => (selectedPaint.value?.colors ?? []).map(item => ({ id: String(item.id), label: item.name })))
const primerItems = computed(() => [{ id: 'none', label: 'Без грунтовки' }, ...primers.value.map(item => ({ id: String(item.id), label: item.name }))])
const primerProviders = participantRoleOptions('provide')
const unchangedUnavailable = computed(() => calc.paintSelectionUnavailable.value && calc.paintSelection.value?.isPaintAvailable === true && draftPaintId.value === calc.paintId.value && draftColorId.value === calc.paintColorId.value)
function numberId(value: string | number | null): number | null { return value == null || value === '' ? null : Number(value) }
async function onCategoryChange(id: number): Promise<void> {
  if (saving.value) return
  category.value = id
  if (selectedPaint.value?.paintCategoryId !== id) { draftPaintId.value = null; draftColorId.value = null }
}
async function onPaintChange(value: string | number | null): Promise<void> {
  if (saving.value) return
  draftPaintId.value = numberId(value)
  if (selectedPaint.value?.isFixedColor && !selectedPaint.value.requiresColorNote) draftNote.value = ''
  draftColorId.value = selectPaintColor(selectedPaint.value?.colors ?? [], draftColorId.value)
  if (selectedPaint.value && (!selectedPaint.value.isFixedColor || draftColorId.value != null)) await save()
}
async function onColorChange(value: string | number | null): Promise<void> { if (saving.value) return; draftColorId.value = numberId(value); await save() }
async function onPrimerChange(value: string | number | null): Promise<void> {
  if (saving.value) return
  calc.primerId.value = value === 'none' ? null : numberId(value)
  await save()
}
function syncSummary(): void {
  const params = [
    { paramCode: 'paintProduct', name: 'Краска', value: calc.paintName.value },
    { paramCode: 'color', name: 'Цвет рамы', value: calc.colorShieldName.value },
    { paramCode: 'paintProvider', name: 'Поставщик краски', value: participantRoleLabel('provide', calc.providesPaint.value) },
    { paramCode: 'paintingPerformer', name: 'Окраска каркаса', value: participantRoleLabel('perform', calc.doesPaintingFrame.value) },
  ]
  if (calc.colorShieldNote.value.trim()) params.push({ paramCode: 'paintNote', name: 'Примечание к цвету краски', value: calc.colorShieldNote.value.trim() })
  if (calc.primerName.value) params.push({ paramCode: 'primer', name: 'Грунтовка', value: calc.primerName.value }, { paramCode: 'primerProvider', name: 'Поставщик грунтовки', value: participantRoleLabel('provide', calc.providesPrimer.value) })
  calc.setCodedBlock('painting', 'Окраска', params)
}
function save(): Promise<boolean> {
  if (pendingSave) return pendingSave
  saving.value = true
  pendingSave = saveSelection().finally(() => {
    saving.value = false
    pendingSave = null
  })
  return pendingSave
}

async function saveSelection(): Promise<boolean> {
  if (!current()) return false
  const paint = selectedPaint.value
  const color = selectedColor.value
  if (!customerPainting.value && !unchangedUnavailable.value) {
    if (loading.value || !paint) { error.value = 'Выберите краску из списка.'; return false }
    if (paint.isFixedColor && !color) { error.value = 'Выберите цвет из списка.'; return false }
  }
  const preserve = customerPainting.value || unchangedUnavailable.value
  const acceptsNote = paint != null && (!paint.isFixedColor || paint.requiresColorNote)
  const editNote = !customerPainting.value && acceptsNote
  if (editNote && paint?.requiresColorNote && !draftNote.value.trim()) {
    error.value = 'Укажите примечание к цвету краски'
    return false
  }
  const note = editNote ? draftNote.value.trim() : preserve ? calc.colorShieldNote.value.trim() : ''
  const paintId = preserve ? calc.paintId.value : draftPaintId.value
  const paintColorId = preserve ? calc.paintColorId.value : paint?.isFixedColor ? draftColorId.value : null
  const primer = primers.value.find(item => item.id === calc.primerId.value)
  const primerId = preserve ? calc.primerId.value : primer?.id ?? null
  const applyResponse = calc.beginCoverStripMutation()
  try {
    const response = await saveWicketData({
      ...calc.getBaseSavePayload(),
      providesPaintCode: preserve ? calc.providesPaintCode.value : paint?.isCustomerSupplied ? 'customer' : 'manufacturer',
      providesPrimerCode: calc.providesPrimerCode.value,
      doesPaintingFrameCode: calc.doesPaintingFrameCode.value,
      doesAssembly: calc.doesAssembly.value,
      paintId, paintColorId, primerId,
      colorShieldNote: note,
    })
    if (!current() || !applyResponse(response)) return false
    calc.colorShieldNote.value = note
    if (!preserve && paint) {
      calc.paintName.value = paint.name
      calc.paintId.value = paintId
      calc.paintColorId.value = paintColorId
      calc.paintSelectionUnavailable.value = false
      calc.paintSelection.value = { isFixedColor: paint.isFixedColor, requiresColorNote: paint.requiresColorNote, isPaintAvailable: true }
      calc.colorShieldName.value = color?.name ?? ''
      calc.colorShieldHex.value = color?.hex ?? ''
      calc.providesPaint.value = paint.isCustomerSupplied ? 'customer' : 'manufacturer'
      calc.primerId.value = primerId
      calc.primerName.value = primer?.name ?? ''
    }
    syncSummary()
    error.value = ''
  } catch { if (current()) error.value = 'Не удалось сохранить окраску'; return false }
  if (calc.priceRetail.value && !calc.coverStrips.value.some(row => row.requiresColorConfirmation)) {
    try {
      const result = await recalculate({
        ...calc.getCurrentProductRowContext(),
        productType: calc.productType.value,
        model: calc.model.value,
      })
      if (!current() || !applyResponse(undefined)) return false
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch {
      if (!current() || !applyResponse(undefined)) return false
      calc.priceRetail.value = ''
      calc.priceDealer.value = ''
      calc.data.value = withoutSummaryBlock(calc.data.value, 'price')
    }
  }
  return true
}


async function validateAndSave(): Promise<boolean> { submitted.value = true; return await save() }
const { validateBeforeLeave, next } = createStepLeaveAttempt(validateAndSave, () => emit('next'))
defineExpose({ validateBeforeLeave })
async function load(): Promise<void> {
  loading.value = true
  catalogError.value = ''
  try {
    const response = await getColorShield(calc.modelId.value)
    if (!current()) return
    paints.value = response.colorShield
    if (selectedPaint.value && !calc.paintSelectionUnavailable.value) {
      draftColorId.value = selectPaintColor(selectedPaint.value.colors, draftColorId.value)
    }
    categories.value = response.paintCategories ?? []
    category.value = selectedPaint.value?.paintCategoryId ?? categories.value[0]?.id ?? null
  } catch { if (current()) catalogError.value = 'Не удалось загрузить краски' }
  finally { if (current()) loading.value = false }
}
onMounted(async () => { calc.setActivePage('page_painting'); await load() })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" :disabled="saving" @click="!saving && emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Окраска</span>
      <B24Button label="Далее" color="air-secondary" :disabled="saving || (loading && !customerPainting)" @click="next" />
    </div>
    <PaintingProviders :disabled="saving" @change="save" />
    <div v-if="error && customerPainting" role="alert" class="text-red-600">{{ error }}</div>
    <template v-if="!customerPainting">
      <div role="group" aria-label="Категория краски" class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-1">
        <button v-for="item in categories" :key="item.id" type="button" class="paint-category-card" :data-paint-category="item.id" :aria-pressed="category === item.id" :disabled="loading || saving" @click="onCategoryChange(item.id)">{{ item.name }}</button>
      </div>
      <p v-if="unchangedUnavailable" role="status">Сохранённый выбор недоступен: {{ calc.colorShieldName.value }}. Его можно сохранить без изменений или выбрать новую краску и цвет.</p>
      <p v-if="loading">Загрузка красок…</p>
      <p v-if="!loading && !paintItems.length" role="status">В этой категории пока нет доступных красок.</p>
      <div v-if="error || catalogError" role="alert" class="text-red-600 whitespace-pre-line">{{ error || catalogError }}<B24Button v-if="catalogError" label="Повторить загрузку" :disabled="saving" @click="load" /></div>
      <label class="flex flex-col gap-2"><span class="font-semibold">Краска</span>
        <B24SelectMenu data-testid="paint-product" :model-value="draftPaintId == null ? '' : String(draftPaintId)" :items="paintItems" value-key="id" placeholder="Выберите краску" :disabled="loading || saving" @update:model-value="onPaintChange" />
      </label>
      <label v-if="!individual" class="flex flex-col gap-2"><span class="font-semibold">Цвет рамы</span>
        <B24SelectMenu data-testid="paint-color" :model-value="draftColorId == null ? '' : String(draftColorId)" :items="colorItems" value-key="id" placeholder="Выберите цвет" :disabled="loading || saving || !selectedPaint" @update:model-value="onColorChange" />
      </label>
      <label v-if="individual || requiresNote" class="flex flex-col gap-2"><span class="font-semibold">Примечание к цвету краски <span v-if="requiresNote" class="text-red-600">*</span></span>
        <textarea class="w-full px-3 py-2 border rounded border-gray-300 bg-white" v-model="draftNote" :disabled="saving" :required="requiresNote" maxlength="1000" rows="3" :aria-invalid="submitted && requiresNote && !draftNote.trim()" @change="save" />
        <span v-if="submitted && requiresNote && !draftNote.trim()" role="alert">Укажите примечание к цвету краски</span>
      </label>
      <label v-if="selectedPaint" class="flex flex-col gap-2"><span class="font-semibold">Грунтовка (необязательно)</span>
        <B24SelectMenu data-testid="paint-primer" :model-value="calc.primerId.value == null ? 'none' : String(calc.primerId.value)" :items="primerItems" value-key="id" :disabled="saving || !primers.length" @update:model-value="onPrimerChange" />
        <span v-if="!primers.length">Для выбранной краски совместимые грунтовки не заданы.</span>
      </label>
      <ProviderChoice name="providesPrimer" v-if="calc.primerId.value != null" v-model="calc.providesPrimer.value" title="Поставщик грунтовки" :options="primerProviders" :disabled="loading || saving" @change="save" />
    </template>
  </div>
</template>
<style scoped>
.paint-category-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #000;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
.paint-category-card:hover { border-color: #93c5fd; }
.paint-category-card[aria-pressed="true"] {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 15%);
  background: #eff6ff;
}
.paint-category-card:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
.paint-category-card:disabled { cursor: wait; opacity: .6; }
</style>
