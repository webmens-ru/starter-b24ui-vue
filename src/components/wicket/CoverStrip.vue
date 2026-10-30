<script setup lang="ts">
import { formatMaterialPrice } from './shared/materialPrice'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCoverStrips, recalculate, saveWicketData } from '../../app/api/wicket'
import type { CoverStripCatalogItem, CoverStripSelection } from '../../app/api/wicket.types'
import { useCalculation } from '../../composables/useCalculation'
import { coverStripError, coverStripStructureError, coverStripParameters, coverStripWire, isCoverStripAvailable, newCoverStripDraft } from './coverStripState'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
const items = ref<CoverStripCatalogItem[]>([])
const selectMenuUi = {
  content: 'z-[1100] w-[var(--reka-combobox-trigger-width)] max-w-[calc(100vw-2rem)]',
  viewport: 'w-full',
  item: 'h-auto min-h-[36px] py-2',
  itemLabel: 'whitespace-normal break-words text-clip',
}
const loading = ref(true)
const loadFailed = ref(false)
const error = ref('')
const rows = calc.coverStripDrafts
const contextKey = () => `${calc.orderId.value}:${calc.productRowId.value}:${calc.modelId.value}`
const initialContext = contextKey()
let mounted = true
const current = () => mounted && contextKey() === initialContext
onUnmounted(() => { mounted = false })
const clone = (value: CoverStripSelection[]) => value.map(row => ({ ...row, parameters: row.parameters.map(p => ({ ...p })) }))
let persisted = clone(calc.coverStrips.value)
let persistedDescriptions = [...calc.coverStripDescriptions.value]
let revision = 0
let queue: Promise<boolean> = Promise.resolve(true)
const itemFor = (id: number | null) => items.value.find(item => item.materialItemId === id)
const materialOptions = computed(() => items.value.map(item => ({ id: item.materialItemId, label: `${materialLabel(item)} — ${formatMaterialPrice(item.price)}/шт.` })))
function markAvailability() {
  for (const row of rows.value) row.unavailable = !isCoverStripAvailable(row, items.value)
}
const structuralValidation = computed(() => coverStripStructureError(rows.value))
const validation = computed(() => coverStripError(rows.value))
const frameDescription = computed(() => {
  const frame = calc.coverStripFrameColor.value
  if (frame?.mode === 'fixed') return frame.colorName || 'Цвет выбран'
  if (frame?.mode === 'custom') return frame.note ? `Индивидуальный цвет: ${frame.note}` : 'Индивидуальный цвет'
  return 'Цвет каркаса не задан'
})
function materialLabel(item: CoverStripCatalogItem): string {
  const size = [item.attributes.width, item.attributes.secondWidth, item.attributes.height]
    .filter(value => typeof value === 'number' && value > 0).join('×')
  return size ? `${item.name}; ${size} мм` : item.name
}
function descriptions(): string[] {
  return rows.value.map((row, index) => {
    const item = itemFor(row.materialItemId)
    if (!item) return calc.coverStripDescriptions.value[index] ?? `Нащельник #${row.materialItemId}`
    return [materialLabel(item), ...coverStripParameters(item).map(def => def.values.find(v => row.parameters.some(p => p.attributeId === def.attributeId && p.colorId === v.id))?.label ?? '')].filter(Boolean).join('; ')
  })
}
function syncSummary() {
  if (!calc.coverStrips.value.length) {
    calc.data.value = calc.data.value.filter(block => block.blockCode !== 'coverStrips')
    return
  }
  calc.updateOrCreateBlock('coverStrips', calc.coverStripDescriptions.value.map((value, index) => ({ paramCode: `coverStrip${index + 1}`, name: `Нащельник ${index + 1}`, value })), 'Нащельники')
}
function save(): Promise<boolean> {
  const operation = queue.then(async () => {
    if (!current()) return false
    if (loading.value || loadFailed.value) { error.value = 'Не удалось загрузить справочник нащельников. Повторите попытку.'; return false }
    markAvailability()
    if (structuralValidation.value) { error.value = structuralValidation.value; return false }
    const wire = coverStripWire(rows.value)
    const labels = descriptions()
    const attemptedRevision = revision
    const attemptedRows = clone(rows.value as CoverStripSelection[])
    const applyResponse = calc.beginCoverStripMutation()
    let saved = false
    try {
      const response = await saveWicketData({ ...calc.getBaseSavePayload(), coverStrips: wire })
      saved = true
      if (!current() || !applyResponse(response)) return false
      const canonical = response?.coverStrips ?? attemptedRows
      persisted = clone(canonical)
      persistedDescriptions = [...labels]
      calc.coverStrips.value = clone(canonical)
      if (revision === attemptedRevision) { rows.value = clone(canonical); markAvailability() }
      calc.coverStripDescriptions.value = [...labels]
      syncSummary()
      if (calc.priceRetail.value && !canonical.some(row => row.requiresColorConfirmation)) {
        const result = await recalculate({ ...calc.getCurrentProductRowContext() })
        if (!current() || !applyResponse(undefined)) return false
        calc.updatePriceBlock(result.priceDealer, result.priceRetail)
      }
      error.value = ''
      return true
    } catch {
      if (!current() || !applyResponse(undefined)) return false
      if (!saved) {
        calc.coverStrips.value = clone(persisted)
        if (revision === attemptedRevision) rows.value = clone(persisted)
        calc.coverStripDescriptions.value = [...persistedDescriptions]
        markAvailability()
        syncSummary()
        revision++
      }
      error.value = saved ? 'Нащельники сохранены, но не удалось обновить стоимость. Повторите попытку.' : 'Не удалось сохранить нащельники. Повторите попытку.'
      return false
    }
  })
  queue = operation
  return operation
}
function changed() {
  revision++
  error.value = ''
  markAvailability()
  if (!structuralValidation.value) void save()
}
function add() {
  if (rows.value.length >= 4) return
  rows.value.push({ materialItemId: null, parameters: [] })
  changed()
}
function remove(index: number) { rows.value.splice(index, 1); changed() }
function none() { rows.value = []; changed() }
function materialChanged(index: number, value: unknown) {
  const id = Number(value)
  if (rows.value[index]?.materialItemId === id) return
  const item = itemFor(id)
  rows.value[index] = item ? newCoverStripDraft(item) : { materialItemId: null, parameters: [] }
  if (item) acceptCurrentFrame(index)
  changed()
}
function colorChanged(index: number, attributeId: number, value: unknown) {
  const parameter = rows.value[index]?.parameters.find(p => p.attributeId === attributeId)
  const colorId = Number(value) || null
  if (parameter && parameter.colorId !== colorId) {
    parameter.colorId = colorId
    acceptCurrentFrame(index)
  }
  changed()
}
function acceptCurrentFrame(index: number) {
  const row = rows.value[index]
  if (row && calc.coverStripFrameColor.value) {
    row.frameColorToken = calc.coverStripFrameColor.value.token
    row.requiresColorConfirmation = false
  }
}
function confirmColor(index: number) {
  if (!rows.value[index] || rows.value[index].unavailable || !calc.coverStripFrameColor.value) return
  acceptCurrentFrame(index)
  changed()
}
async function validateAndSave(): Promise<boolean> {
  error.value = validation.value
  if (error.value) return false
  let attempted: number
  do { attempted = revision; if (!await save()) return false } while (attempted !== revision)
  error.value = validation.value
  return !error.value
}
const { validateBeforeLeave, next } = createStepLeaveAttempt(validateAndSave, () => emit('next'))
defineExpose({ validateBeforeLeave })
onMounted(async () => {
  calc.setActivePage('page_cover_strip')
  try {
    const result = await getCoverStrips()
    if (!current()) return
    items.value = result.items.filter(item => coverStripParameters(item).length > 0 && coverStripParameters(item).every(def => def.values.length > 0))
    markAvailability()
  } catch { if (current()) loadFailed.value = true } finally { if (current()) loading.value = false }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <h2 class="text-2xl font-bold flex-1 text-center">Нащельник</h2>
      <B24Button label="Далее" color="air-secondary" @click="next" />
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="loading">Загрузка...</p>
    <p v-else-if="loadFailed" role="alert">Не удалось загрузить справочник нащельников. Повторите открытие шага.</p>
    <template v-else>
      <p data-frame-color class="text-sm text-gray-700">Текущий цвет каркаса: {{ frameDescription }}</p>
      <div class="flex flex-wrap gap-3 items-center">
        <B24Button label="Не требуется" :color="!rows.length ? 'air-primary' : 'air-secondary'" :aria-pressed="!rows.length" @click="none" />
        <B24Button label="Добавить нащельник" color="air-secondary" :disabled="rows.length >= 4" @click="add" />
      </div>
      <p class="text-sm text-gray-600">Одна карточка — один нащельник. Можно добавить до четырёх, в том числе одинаковых.</p>
      <section v-for="(row, index) in rows" :key="index" class="cover-strip-card flex flex-col gap-4">
        <div class="flex justify-between items-center"><h3 class="font-semibold">Нащельник {{ index + 1 }}</h3><B24Button label="Удалить" color="air-secondary" size="sm" @click="remove(index)" /></div>
        <p v-if="row.unavailable" role="alert">{{ calc.coverStripDescriptions.value[index] ?? `Нащельник #${row.materialItemId}` }}. Сохранённый материал или цвет недоступен. Замените выбор.</p>
        <div v-if="row.requiresColorConfirmation" role="status" class="flex flex-col items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p>Цвет каркаса изменился. Выберите другой цвет нащельника или подтвердите прежний.</p>
          <B24Button label="Оставить прежний цвет" color="air-secondary" size="sm" :disabled="row.unavailable || !calc.coverStripFrameColor.value" @click="confirmColor(index)" />
        </div>
        <div class="flex flex-col gap-2">
          <label :for="`cover-strip-material-${index}`" class="font-semibold">Материал</label>
          <B24SelectMenu :b24ui="selectMenuUi" :content="{ align: 'start' }"
            :id="`cover-strip-material-${index}`" data-material
            :model-value="row.materialItemId ?? undefined" :items="materialOptions" value-key="id"
            placeholder="Выберите материал" @update:model-value="materialChanged(index, $event)"
          />
        </div>
        <div v-for="definition in itemFor(row.materialItemId)?.orderParameters.filter(def => def.code === 'color' && def.dataType === 'color') ?? []" :key="definition.attributeId" class="flex flex-col gap-2">
          <label :for="`cover-strip-color-${index}-${definition.attributeId}`" class="font-semibold">{{ definition.name }}</label>
          <B24SelectMenu :b24ui="selectMenuUi" :content="{ align: 'start' }"
            :id="`cover-strip-color-${index}-${definition.attributeId}`" data-color
            :model-value="row.parameters.find(p => p.attributeId === definition.attributeId)?.colorId ?? undefined"
            :items="definition.values" value-key="id" placeholder="Выберите цвет"
            @update:model-value="colorChanged(index, definition.attributeId, $event)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cover-strip-card {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
}
</style>
