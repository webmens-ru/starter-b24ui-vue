<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import * as yup from 'yup'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Поля формы ──────────────────────────────────────────────────────────────
const width      = ref<string>('')
const height     = ref<string>('')
const clearance  = ref<string>('')
const sostoyaniye = ref<string>('Готов')

// ─── Ошибки ──────────────────────────────────────────────────────────────────
const errWidth     = ref('')
const errHeight    = ref('')
const errClearance = ref('')

// ─── Yup схема ───────────────────────────────────────────────────────────────
const schema = yup.object({
  width:     yup.number().typeError('Только числа').required('Обязательное поле').min(600,  'От 600 до 2000 мм').max(2000, 'От 600 до 2000 мм'),
  height:    yup.number().typeError('Только числа').required('Обязательное поле').min(1000, 'От 1000 до 3000 мм').max(3000, 'От 1000 до 3000 мм'),
  clearance: yup.number().typeError('Только числа').required('Обязательное поле').min(10,   'От 10 до 100 мм').max(100,  'От 10 до 100 мм'),
})

type FieldName = 'width' | 'height' | 'clearance'
const errRefs: Record<FieldName, typeof errWidth> = { width: errWidth, height: errHeight, clearance: errClearance }

async function validateField(field: FieldName, raw: string | number) {
  const str = String(raw ?? '').trim()
  const val = str === '' ? undefined : Number(str)
  try {
    await schema.validateAt(field, { [field]: val })
    errRefs[field].value = ''
  } catch (e: any) {
    errRefs[field].value = e.message
  }
}

async function validateAll(): Promise<boolean> {
  const rawW = String(width.value ?? '').trim()
  const rawH = String(height.value ?? '').trim()
  const rawC = String(clearance.value ?? '').trim()
  const values = {
    width:     rawW === '' ? undefined : Number(rawW),
    height:    rawH === '' ? undefined : Number(rawH),
    clearance: rawC === '' ? undefined : Number(rawC),
  }
  try {
    await schema.validate(values, { abortEarly: false })
    errWidth.value = errHeight.value = errClearance.value = ''
    return true
  } catch (e: any) {
    errWidth.value = errHeight.value = errClearance.value = ''
    for (const err of e.inner as yup.ValidationError[]) {
      if (err.path && err.path in errRefs) errRefs[err.path as FieldName].value = err.message
    }
    return false
  }
}

// ─── Debounce ────────────────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => save(), 1000)
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.widthProyema.value      = width.value
  calc.heightProyema.value     = height.value
  calc.clearanceProyema.value  = clearance.value
  calc.sostoyaniyeProyema.value = sostoyaniye.value
}

function buildBlock() {
  calc.updateOrCreateBlock('Проем', [
    { name: 'Ширина',            value: calc.widthProyema.value },
    { name: 'Высота',            value: calc.heightProyema.value },
    { name: 'Просвет',           value: calc.clearanceProyema.value },
    { name: 'Состояние проема',  value: calc.sostoyaniyeProyema.value },
  ])
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      width_proyema:       calc.widthProyema.value,
      height_proyema:      calc.heightProyema.value,
      clearance_proyema:   calc.clearanceProyema.value,
      sostoyaniyeProyema: calc.sostoyaniyeProyema.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  // Для модели 3 (штакетник) пересчёт не выполняется
  if (String(calc.modelId.value) !== '3' && calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

async function handleNext() {
  if (!(await validateAll())) return
  await save() // Сохраняем в calc и API перед переходом — debounce может не успеть сработать
  emit('next')
}

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page7')

  const w = calc.widthProyema.value
  const h = calc.heightProyema.value
  const c = calc.clearanceProyema.value
  const s = calc.sostoyaniyeProyema.value
  if (w != null && w !== '') width.value = String(w)
  if (h != null && h !== '') height.value = String(h)
  if (c != null && c !== '') clearance.value = String(c)
  if (s) sostoyaniye.value = String(s)

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Проём</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5" style="padding-inline: 4px;">

      <!-- Готовность проема -->
      <div class="flex flex-col gap-3 items-start w-full">
        <span class="text-lg font-semibold">Готовность проема на момент заказа</span>
        <div class="option-grid">
          <label class="lock-card">
            <input
              v-model="sostoyaniye"
              type="radio"
              value="Готов"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Готов</span>
            </div>
          </label>
          <label class="lock-card">
            <input
              v-model="sostoyaniye"
              type="radio"
              value="Не готов"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">На стадии строительства</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Размеры -->
      <div class="flex flex-col gap-4">
        <!-- Ширина -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="width">Ширина в мм</label>
          <input
            id="width"
            v-model="width"
            type="text"
            placeholder="Введите ширину (600–2000)"
            class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="errWidth ? 'border-red-500' : 'border-gray-300'"
            @blur="validateField('width', width)"
            @input="errWidth ? validateField('width', width) : debouncedSave()"
          />
          <span v-if="errWidth" class="text-xs text-red-500">{{ errWidth }}</span>
        </div>

        <!-- Высота -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="height">Высота в мм</label>
          <input
            id="height"
            v-model="height"
            type="text"
            placeholder="Введите высоту (1000–3000)"
            class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="errHeight ? 'border-red-500' : 'border-gray-300'"
            @blur="validateField('height', height)"
            @input="errHeight ? validateField('height', height) : debouncedSave()"
          />
          <span v-if="errHeight" class="text-xs text-red-500">{{ errHeight }}</span>
        </div>

        <!-- Просвет -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="clearance">Просвет в мм</label>
          <input
            id="clearance"
            v-model="clearance"
            type="text"
            placeholder="Введите просвет (10–100)"
            class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="errClearance ? 'border-red-500' : 'border-gray-300'"
            @blur="validateField('clearance', clearance)"
            @input="errClearance ? validateField('clearance', clearance) : debouncedSave()"
          />
          <span v-if="errClearance" class="text-xs text-red-500">{{ errClearance }}</span>
        </div>
      </div>

    </div>
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
</style>
