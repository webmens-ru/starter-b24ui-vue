<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { participantRoleLabel } from '../../app/participantRoles'
import { useCalculation } from '../../composables/useCalculation'
import { getAdditionalPens, saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'
import { createStepLeaveAttempt } from './stepLeaveAttempt'

interface PenItem {
  materialItemId: number
  marking: string
  canUseFrameColor: boolean
  colors: { id: number; name: string }[]
  imageUrls?: string[]
}
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const penItems = ref<PenItem[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const error = ref('')
const configured = calc.additionalPenSidesConfigured.value === 1
const legacyPending = !configured && (calc.additionalPenId.value != null || calc.additionalPenMaterialItemId.value != null || calc.isTherePen.value === 1 || calc.isTherePen.value === null)
const sides = reactive([
  { code: 'street', label: 'Ручка с улицы', id: configured ? calc.additionalPenStreetMaterialItemId.value : null, touched: false, needsMapping: configured && calc.additionalPenStreetId.value != null && calc.additionalPenStreetMaterialItemId.value == null },
  { code: 'yard', label: 'Ручка со двора', id: configured ? calc.additionalPenYardMaterialItemId.value : null, touched: false, needsMapping: configured && calc.additionalPenYardId.value != null && calc.additionalPenYardMaterialItemId.value == null },
])
const hasPens = computed(() => sides.some(side => side.id != null))
const legacyDescription = computed(() => {
  const pen = penItems.value.find(item => item.materialItemId === calc.additionalPenMaterialItemId.value)
  const color = pen?.colors.find(item => item.id === calc.penColorId.value)?.name
    ?? (calc.penColorId.value == null && pen?.canUseFrameColor ? 'Цвет каркаса' : calc.additionalPenColor.value || calc.penColor.value)
  return [pen?.marking ?? calc.additionalPenMarking.value, color].filter(Boolean).join(', ')
})
const legacyResolved = computed(() => !legacyPending || hasPens.value || sides.every(side => side.touched))

function validationError(): string {
  if (loading.value || loadFailed.value) return 'Не удалось загрузить справочник ручек'
  if (!legacyResolved.value) return 'Выберите сторону для ранее выбранной ручки или укажите «Не требуется» с обеих сторон'
  for (const side of sides) {
    if (side.needsMapping && !side.touched) return 'Выберите доступную модель ручки заново или укажите «Не требуется»'
    if (side.id == null) continue
    const pen = penItems.value.find(item => item.materialItemId === side.id)
    if (!pen) return 'Выберите доступную модель ручки'
  }
  return ''
}
function syncFields() {
  calc.additionalPenSidesConfigured.value = 1
  calc.isTherePen.value = hasPens.value ? 1 : 0
  calc.isTherePenName.value = hasPens.value ? 'Будет' : 'Не будет'
  calc.penProvided.value = hasPens.value ? 'manufacturer' : ''
  calc.penInstalled.value = hasPens.value ? 'manufacturer' : ''
  calc.additionalPenId.value = null
  calc.additionalPenMaterialItemId.value = null
  calc.additionalPenStreetId.value = null
  calc.additionalPenYardId.value = null
  calc.penColorId.value = null
  calc.additionalPenColor.value = ''
  calc.additionalPenMarking.value = ''
  calc.penColor.value = ''
  const params = []
  for (const side of sides) {
    const pen = penItems.value.find(item => item.materialItemId === side.id)
    const colorId = null
    const colorName = side.id == null ? '' : 'Цвет каркаса'
    if (side.code === 'street') {
      calc.additionalPenStreetMaterialItemId.value = side.id
      calc.additionalPenStreetColorId.value = colorId
      calc.additionalPenStreetMarking.value = pen?.marking ?? ''
      calc.additionalPenStreetColorName.value = colorName
    } else {
      calc.additionalPenYardMaterialItemId.value = side.id
      calc.additionalPenYardColorId.value = colorId
      calc.additionalPenYardMarking.value = pen?.marking ?? ''
      calc.additionalPenYardColorName.value = colorName
    }
    params.push({ paramCode: `${side.code}PenModel`, name: side.label, value: pen?.marking ?? 'Не требуется' })
    if (pen) params.push({ paramCode: `${side.code}PenColor`, name: `Цвет: ${side.label}`, value: colorName })
  }
  if (hasPens.value) {
    params.push({ paramCode: 'penProvider', name: 'Ручку предоставляет', value: participantRoleLabel('provide', 'manufacturer') })
    params.push({ paramCode: 'penInstaller', name: 'Ручку устанавливает', value: participantRoleLabel('install', 'manufacturer') })
  }
  calc.updateOrCreateBlock('additionalPen', params, 'Дополнительные ручки')
}
function captureRef<T>(target: { value: T }): () => void {
  const value = target.value
  return () => { target.value = value }
}
function capturePersistedSelection(): () => void {
  const restoreFields = [
    captureRef(calc.additionalPenMaterialItemId),
    captureRef(calc.additionalPenStreetMaterialItemId),
    captureRef(calc.additionalPenYardMaterialItemId),
    captureRef(calc.additionalPenSidesConfigured),
    captureRef(calc.additionalPenStreetId),
    captureRef(calc.additionalPenStreetColorId),
    captureRef(calc.additionalPenYardId),
    captureRef(calc.additionalPenYardColorId),
    captureRef(calc.additionalPenStreetMarking),
    captureRef(calc.additionalPenYardMarking),
    captureRef(calc.additionalPenStreetColorName),
    captureRef(calc.additionalPenYardColorName),
    captureRef(calc.isTherePen),
    captureRef(calc.isTherePenName),
    captureRef(calc.penProvided),
    captureRef(calc.penInstalled),
    captureRef(calc.additionalPenId),
    captureRef(calc.penColorId),
    captureRef(calc.additionalPenColor),
    captureRef(calc.additionalPenMarking),
    captureRef(calc.penColor),
  ]
  const index = calc.data.value.findIndex(block => block.blockCode === 'additionalPen')
  const previous = calc.data.value[index]
  const previousBlock = previous ? { ...previous, params: previous.params.map(param => ({ ...param })) } : undefined
  return () => {
    restoreFields.forEach(restore => restore())
    const currentIndex = calc.data.value.findIndex(block => block.blockCode === 'additionalPen')
    if (currentIndex !== -1) calc.data.value.splice(currentIndex, 1)
    if (previousBlock) calc.data.value.splice(Math.min(index, calc.data.value.length), 0, previousBlock)
  }
}
let revision = 0
let saveQueue: Promise<boolean> = Promise.resolve(true)
// Each queued operation reads the entire latest selection after the preceding request finishes.
function save(): Promise<boolean> {
  const operation = saveQueue.then(async () => {
    const invalid = validationError()
    if (invalid) { error.value = invalid; return false }
    const restorePersistedSelection = capturePersistedSelection()
    let persisted = false
    syncFields()
    try {
      await saveWicketData({ ...calc.getBaseSavePayload(),
        additionalPenSidesConfigured: 1,
        additionalPenStreetMaterialItemId: calc.additionalPenStreetMaterialItemId.value,
        additionalPenStreetColorId: calc.additionalPenStreetColorId.value,
        additionalPenYardMaterialItemId: calc.additionalPenYardMaterialItemId.value,
        additionalPenYardColorId: calc.additionalPenYardColorId.value,
        isTherePen: calc.isTherePen.value,
        penProvided: calc.penProvided.value || null,
        penInstalled: calc.penInstalled.value || null,
        additionalPenMaterialItemId: null, penColorId: null })
      persisted = true
      if (calc.priceRetail.value) {
        const result = await recalculate({ orderId: Number(calc.number.value), productRowId: calc.getCurrentProductRowContext().productRowId, productType: calc.productType.value, model: calc.model.value, modelId: calc.modelId.value })
        calc.updatePriceBlock(result.priceDealer, result.priceRetail)
      }
      error.value = ''
      return true
    } catch {
      if (!persisted) restorePersistedSelection()
      error.value = persisted
        ? 'Ручки сохранены, но не удалось обновить стоимость. Повторите попытку.'
        : 'Не удалось сохранить ручки. Повторите попытку.'
      return false
    }
  })
  saveQueue = operation
  return operation
}
function changed() {
  revision++
  error.value = ''
  if (!validationError()) void save()
}
function selectPen(index: number, id: number | null) {
  const side = sides[index]!
  side.touched = true
  if (side.id !== id) {
    side.id = id
  }
  changed()
}
async function validateAndSave(): Promise<boolean> {
  error.value = validationError()
  if (error.value) return false
  let currentRevision: number
  do {
    currentRevision = revision
    if (!await save()) return false
    // Edits made during a request must also finish before navigation.
  } while (currentRevision !== revision)
  return true
}
const { validateBeforeLeave, next: continueToNext } = createStepLeaveAttempt(validateAndSave, () => emit('next'))
defineExpose({ validateBeforeLeave })
onMounted(async () => {
  calc.setActivePage('page10')
  try {
    penItems.value = (await getAdditionalPens(calc.modelId.value, 'welding')).items

  } catch { loadFailed.value = true } finally { loading.value = false }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Дополнительные ручки</span>
      <B24Button label="Далее" color="air-secondary" @click="continueToNext" />
    </div>
    <p v-if="legacyPending && !legacyResolved" role="status">Ранее выбрана одна ручка без указания стороны: {{ legacyDescription }}. Выберите сторону или укажите «Не требуется» с обеих сторон.</p>
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
    <p v-if="loading">Загрузка...</p>
    <p v-else-if="loadFailed" role="alert">Не удалось загрузить справочник ручек. Повторите открытие шага.</p>
    <template v-else>
      <section v-for="(side, index) in sides" :key="side.code" class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">{{ side.label }}</h2>
        <div class="pen-cards-row">
          <label class="pen-card"><input :name="`${side.code}-pen`" type="radio" class="sr-only" value="none" :checked="side.id == null && (!legacyPending || side.touched) && (!side.needsMapping || side.touched)" @change="selectPen(index, null)" /><span>Не требуется</span></label>
          <label v-for="pen in penItems" :key="pen.materialItemId" class="pen-card">
            <input :name="`${side.code}-pen`" type="radio" class="sr-only" :value="pen.materialItemId" :checked="side.id === pen.materialItemId" @change="selectPen(index, pen.materialItemId)" />
            <ImageViewer v-if="pen.imageUrls?.length" :title="pen.marking" :images="pen.imageUrls" enlarge image-height="100px" />
            <span>{{ pen.marking }}</span>
          </label>
        </div>
        <p v-if="side.id != null" class="text-sm text-gray-600">Окрашивается в цвет каркаса</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.pen-cards-row,.option-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
.pen-card { display:flex; flex-direction:column; align-items:center; gap:12px; padding:16px; cursor:pointer; border:2px solid #e5e7eb; border-radius:12px; background:white; }
.pen-card:has(input:focus-visible) { outline:2px solid #3b82f6; outline-offset:2px; }
.pen-card:has(input:checked) { border-color:#3b82f6; background:#eff6ff; }
</style>
