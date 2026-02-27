<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Поля формы ──────────────────────────────────────────────────────────────
const width      = ref<string>('')
const height     = ref<string>('')
const clearance  = ref<string>('')
const sostoyaniye = ref<string>('Готов')

// ─── Ошибки ──────────────────────────────────────────────────────────────────
const errWidth     = ref(false)
const errHeight    = ref(false)
const errClearance = ref(false)

// ─── Debounce ────────────────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => save(), 1000)
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.width_proyema.value      = width.value
  calc.height_proyema.value     = height.value
  calc.clearance_proyema.value  = clearance.value
  calc.sostoyaniye_proyema.value = sostoyaniye.value
}

function buildBlock() {
  calc.updateOrCreateBlock('Проем', [
    { name: 'Ширина',            value: calc.width_proyema.value },
    { name: 'Высота',            value: calc.height_proyema.value },
    { name: 'Просвет',           value: calc.clearance_proyema.value },
    { name: 'Состояние проема',  value: calc.sostoyaniye_proyema.value },
  ])
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      calculation_number:  calc.number.value,
      width_proyema:       calc.width_proyema.value,
      height_proyema:      calc.height_proyema.value,
      clearance_proyema:   calc.clearance_proyema.value,
      sostoyaniye_proyema: calc.sostoyaniye_proyema.value,
      model_id:            calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  // Для модели 3 (штакетник) пересчёт не выполняется
  if (String(calc.modelId.value) !== '3' && calc.price_retail.value) {
    try {
      const result = await recalculate({
        calculation_number: calc.number.value,
        product_type:       calc.productType.value,
        model:              calc.model.value,
        model_id:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.price_dealer, result.price_retail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

// ─── Валидация ───────────────────────────────────────────────────────────────
function validateField(
  value: string,
  min: number,
  max: number,
  label: string,
  errRef: { value: boolean }
): string {
  const v = value.trim()
  errRef.value = false

  if (!v) {
    errRef.value = true
    return `Заполните поле: ${label}`
  }
  if (!/^\d+$/.test(v)) {
    errRef.value = true
    return `${label} должна содержать только числа`
  }
  const n = parseInt(v, 10)
  if (n < min || n > max) {
    errRef.value = true
    return `${label} должна быть от ${min} до ${max} мм`
  }
  return ''
}

function validate(): boolean {
  errWidth.value     = false
  errHeight.value    = false
  errClearance.value = false

  const msgs: string[] = []

  const mW = validateField(width.value,     600,  2000, 'Ширина',  errWidth)
  const mH = validateField(height.value,   1000,  3000, 'Высота',  errHeight)
  const mC = validateField(clearance.value,  10,   100, 'Просвет', errClearance)

  if (mW) msgs.push(mW)
  if (mH) msgs.push(mH)
  if (mC) msgs.push(mC)

  if (msgs.length) {
    openModal(msgs.join('\n'))
    return false
  }
  return true
}

function handleNext() {
  if (!validate()) return
  emit('next')
}

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page7')

  if (calc.width_proyema.value)      width.value      = calc.width_proyema.value
  if (calc.height_proyema.value)     height.value     = calc.height_proyema.value
  if (calc.clearance_proyema.value)  clearance.value  = calc.clearance_proyema.value
  if (calc.sostoyaniye_proyema.value) sostoyaniye.value = calc.sostoyaniye_proyema.value

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <B24Modal
      v-model:open="showModal"
      :title="modalTitle"
      :description="modalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Проём</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Размеры проема -->
      <div class="max-w-sm mx-auto w-full flex flex-col gap-4">
        <h2 class="text-center text-lg font-semibold">Размеры проема</h2>

        <!-- Ширина -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="width">Ширина в мм</label>
          <input
            id="width"
            v-model="width"
            type="text"
            placeholder="Введите ширину"
            class="border rounded px-3 py-2 text-sm"
            :class="errWidth ? 'border-red-500' : 'border-gray-300'"
            @input="debouncedSave"
          />
        </div>

        <!-- Высота -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="height">Высота в мм</label>
          <input
            id="height"
            v-model="height"
            type="text"
            placeholder="Введите высоту"
            class="border rounded px-3 py-2 text-sm"
            :class="errHeight ? 'border-red-500' : 'border-gray-300'"
            @input="debouncedSave"
          />
        </div>

        <!-- Просвет -->
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-sm" for="clearance">Просвет в мм</label>
          <input
            id="clearance"
            v-model="clearance"
            type="text"
            placeholder="Введите просвет"
            class="border rounded px-3 py-2 text-sm"
            :class="errClearance ? 'border-red-500' : 'border-gray-300'"
            @input="debouncedSave"
          />
        </div>
      </div>

      <!-- Готовность проема -->
      <div class="flex flex-col gap-3">
        <h2 class="text-center text-lg font-semibold">Готовность проема на момент заказа</h2>
        <div class="flex justify-center gap-16 flex-wrap">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="sostoyaniye"
              type="radio"
              value="Готов"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm font-semibold">Готов</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="sostoyaniye"
              type="radio"
              value="Не готов"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm font-semibold">На стадии строительства</span>
          </label>
        </div>
      </div>

    </div>
  </div>
</template>
