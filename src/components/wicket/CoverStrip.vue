<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCoverStrips, recalculate, saveWicketData } from '../../app/api/wicket'
import type { CoverStripCatalogItem, CoverStripSelection } from '../../app/api/wicket.types'
import { useCalculation } from '../../composables/useCalculation'
import { coverStripError, coverStripParameters, coverStripWire, isCoverStripAvailable, newCoverStripDraft } from './coverStripState'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

const emit = defineEmits<{ next: []; back: [] }>()
const calc = useCalculation()
const items = ref<CoverStripCatalogItem[]>([])
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
function markAvailability() {
  for (const row of rows.value) row.unavailable = !isCoverStripAvailable(row, items.value)
}
const validation = computed(() => coverStripError(rows.value))
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
    if (validation.value) { error.value = validation.value; return false }
    const wire = coverStripWire(rows.value)
    const labels = descriptions()
    let saved = false
    try {
      await saveWicketData({ ...calc.getBaseSavePayload(), coverStrips: wire })
      saved = true
      if (!current()) return false
      persisted = clone(wire)
      persistedDescriptions = [...labels]
      calc.coverStrips.value = clone(wire)
      calc.coverStripDescriptions.value = [...labels]
      syncSummary()
      if (calc.priceRetail.value) {
        const result = await recalculate({ ...calc.getCurrentProductRowContext() })
        if (!current()) return false
        calc.updatePriceBlock(result.priceDealer, result.priceRetail)
      }
      error.value = ''
      return true
    } catch {
      if (!current()) return false
      if (!saved) {
        calc.coverStrips.value = clone(persisted)
        rows.value = clone(persisted)
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
  if (!validation.value) void save()
}
function add() {
  if (rows.value.length >= 4) return
  rows.value.push({ materialItemId: null, parameters: [] })
  changed()
}
function remove(index: number) { rows.value.splice(index, 1); changed() }
function none() { rows.value = []; changed() }
function materialChanged(index: number, event: Event) {
  const id = Number((event.target as HTMLSelectElement).value)
  const item = itemFor(id)
  rows.value[index] = item ? newCoverStripDraft(item) : { materialItemId: null, parameters: [] }
  changed()
}
function colorChanged(index: number, attributeId: number, event: Event) {
  const parameter = rows.value[index]?.parameters.find(p => p.attributeId === attributeId)
  if (parameter) parameter.colorId = Number((event.target as HTMLSelectElement).value) || null
  changed()
}
async function validateAndSave(): Promise<boolean> {
  error.value = validation.value
  if (error.value) return false
  let attempted: number
  do { attempted = revision; if (!await save()) return false } while (attempted !== revision)
  return true
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
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
      <button type="button" class="px-4 py-2 rounded border" @click="emit('back')">Назад</button>
      <h2 class="text-2xl font-bold">Нащельник</h2>
      <button type="button" class="px-4 py-2 rounded border" @click="next">Далее</button>
    </div>
    <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
    <p v-if="loading">Загрузка...</p>
    <p v-else-if="loadFailed" role="alert">Не удалось загрузить справочник нащельников. Повторите открытие шага.</p>
    <template v-else>
      <div class="flex gap-3 items-center">
        <button type="button" class="px-4 py-2 rounded border" :aria-pressed="!rows.length" @click="none">Не требуется</button>
        <button type="button" class="px-4 py-2 rounded border" :disabled="rows.length >= 4" @click="add">Добавить нащельник</button>
      </div>
      <p class="text-sm text-gray-600">Одна карточка — один нащельник. Можно добавить до четырёх, в том числе одинаковых.</p>
      <section v-for="(row, index) in rows" :key="index" class="rounded border p-4 flex flex-col gap-3">
        <div class="flex justify-between items-center"><h3 class="font-semibold">Нащельник {{ index + 1 }}</h3><button type="button" class="px-3 py-1 rounded border" @click="remove(index)">Удалить</button></div>
        <p v-if="row.unavailable" role="alert">{{ calc.coverStripDescriptions.value[index] ?? `Нащельник #${row.materialItemId}` }}. Сохранённый материал или цвет недоступен. Замените выбор.</p>
        <label class="flex flex-col gap-1">Материал
          <select data-material class="rounded border p-2" :value="row.materialItemId ?? ''" @change="materialChanged(index, $event)">
            <option value="">Выберите материал</option>
            <option v-if="row.materialItemId && !itemFor(row.materialItemId)" :value="row.materialItemId" disabled>Сохранённый материал недоступен</option>
            <option v-for="item in items" :key="item.materialItemId" :value="item.materialItemId">{{ materialLabel(item) }}</option>
          </select>
        </label>
        <label v-for="definition in itemFor(row.materialItemId)?.orderParameters.filter(def => def.code === 'color' && def.dataType === 'color') ?? []" :key="definition.attributeId" class="flex flex-col gap-1">{{ definition.name }}
          <select data-color class="rounded border p-2" :value="row.parameters.find(p => p.attributeId === definition.attributeId)?.colorId ?? ''" @change="colorChanged(index, definition.attributeId, $event)">
            <option value="">Выберите цвет</option>
            <option v-for="color in definition.values" :key="color.id" :value="color.id">{{ color.label }}</option>
          </select>
        </label>
      </section>
    </template>
  </div>
</template>
