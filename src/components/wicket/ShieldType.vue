<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

declare const window: Window & { _HOSTNAME_: string }
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, saveWicketData, recalculate } from '../../app/api/wicket'
import type { ColorShieldItem } from '../../app/api/wicket'

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

// ─── Цвет щита ───────────────────────────────────────────────────────────────
const colorOptions    = ref<ColorShieldItem[]>([])
const color_shield_id = ref<string | number>('')

// ─── Тип щита ────────────────────────────────────────────────────────────────
const shield_type = ref<string>('Тип_1')

const TYPES_WITH_HEIGHT_TOP   = ['Тип_3']
const TYPES_WITH_HEIGHT_LOWER = ['Тип_2', 'Тип_3']
const TYPES_WITH_SIDE_PART    = ['Тип_4']

const showHeightTop   = computed(() => TYPES_WITH_HEIGHT_TOP.includes(shield_type.value))
const showHeightLower = computed(() => TYPES_WITH_HEIGHT_LOWER.includes(shield_type.value))
const showSidePart    = computed(() => TYPES_WITH_SIDE_PART.includes(shield_type.value))

// ─── Размеры ─────────────────────────────────────────────────────────────────
const height_top_part   = ref<string>('0')
const height_lower_part = ref<string>('0')
const width_side_part   = ref<string>('0')
const grille_location   = ref<string>('Возле петель')

// ─── Ошибки валидации ────────────────────────────────────────────────────────
const errHeightTop   = ref(false)
const errHeightLower = ref(false)
const errWidthSide   = ref(false)

// ─── Изображения щитов ───────────────────────────────────────────────────────
// g - горизонтально, v - вертикально; right→g, left→v
const panelOrientation = computed(() => {
  const id = calc.opening_option_id.value
  return id === 1 || id === 4 ? 'g' : 'v'
})

const IMG_BASE = 'https://test-lk.doorhan-krd.ru/img/wicket/type1'

const shieldOptions = computed(() => {
  const orient = panelOrientation.value
  // z - замок, p - петля (только для Тип_4)
  const type4Suffix = grille_location.value === 'Возле замка' ? 'z' : 'p'
  return [
    { value: 'Тип_1', label: 'Тип 1', img: `${IMG_BASE}/w_${orient}_1.1.png` },
    { value: 'Тип_2', label: 'Тип 2', img: `${IMG_BASE}/w_${orient}_1.2.png` },
    { value: 'Тип_3', label: 'Тип 3', img: `${IMG_BASE}/w_${orient}_1.3.png` },
    { value: 'Тип_4', label: 'Тип 4', img: `${IMG_BASE}/w_${orient}_1.4_${type4Suffix}.png` },
  ]
})

// Группировка: Стандартная краска / Не стандартная (для B24SelectMenu)
const colorSelectItems = computed(() => {
  const standard = colorOptions.value.filter(i => (i.isStandard ?? 1) === 1)
  const custom   = colorOptions.value.filter(i => (i.isStandard ?? 1) === 0)
  const rows: Array<{ type?: 'label' | 'separator'; label?: string; id?: string | number }> = []
  if (standard.length) {
    rows.push({ type: 'label', label: 'Стандартная краска' })
    rows.push(...standard.map(i => ({ id: i.id, label: i.name })))
  }
  if (custom.length) {
    if (rows.length) rows.push({ type: 'separator' })
    rows.push({ type: 'label', label: 'Не стандартная краска' })
    rows.push(...custom.map(i => ({ id: i.id, label: i.name })))
  }
  return rows
})

// ─── Загрузка цветов ─────────────────────────────────────────────────────────
async function loadColorShield() {
  try {
    const res = await getColorShield(calc.modelId.value)
    colorOptions.value = res.arr_color_shield
    if (!color_shield_id.value && colorOptions.value.length) {
      color_shield_id.value = String(colorOptions.value[0].id)
    }
  } catch (e) {
    console.warn('getColorShield:', e)
    openModal('Не удалось загрузить данные для выпадающего списка color-shield.')
  }
}

// ─── Debounce ────────────────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => save(), 500)
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onShieldTypeChange() {
  if (!showHeightTop.value)   height_top_part.value   = '0'
  if (!showHeightLower.value) height_lower_part.value = '0'
  if (!showSidePart.value) {
    width_side_part.value  = '0'
    grille_location.value  = 'Возле петель'
  }
  errHeightTop.value   = false
  errHeightLower.value = false
  errWidthSide.value   = false
  await save()
}

function onColorChange() {
  save().then(() => {
    const sid = String(color_shield_id.value ?? '')
    const name = colorOptions.value.find(i => String(i.id) === sid)?.name ?? ''
    openModal(`Внесены изменения: Цвет щита '${name}'`, 'Изменения сохранены')
  })
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.shield_type.value       = shield_type.value
  calc.color_shield_id.value   = String(color_shield_id.value ?? '')
  const colorItem = colorOptions.value.find(i => String(i.id) === String(color_shield_id.value))
  calc.color_shield_name.value = colorItem?.name ?? ''
  calc.height_top_part.value   = height_top_part.value
  calc.height_lower_part.value = height_lower_part.value
  calc.width_side_part.value   = width_side_part.value
  calc.grille_location.value   = grille_location.value
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Тип щита', value: calc.shield_type.value },
  ]
  if (calc.color_shield_name.value) {
    params.push({ name: 'Цвет щита', value: calc.color_shield_name.value })
  }
  if (showHeightTop.value && calc.height_top_part.value && calc.height_top_part.value !== '0') {
    params.push({ name: 'Высота верхней части', value: calc.height_top_part.value })
  }
  if (showHeightLower.value && calc.height_lower_part.value && calc.height_lower_part.value !== '0') {
    params.push({ name: 'Высота нижней части', value: calc.height_lower_part.value })
  }
  if (showSidePart.value && calc.width_side_part.value && calc.width_side_part.value !== '0') {
    params.push({ name: 'Ширина боковой части', value: calc.width_side_part.value })
  }
  if (showSidePart.value && calc.grille_location.value) {
    params.push({ name: 'Расположение решётки', value: calc.grille_location.value })
  }
  calc.updateOrCreateBlock('Тип щита', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      order_id: Number(calc.number.value),
      shield_type:        calc.shield_type.value,
      color_shield_name:  calc.color_shield_name.value,
      color_shield_id:    calc.color_shield_id.value,
      height_top_part:    calc.height_top_part.value,
      height_lower_part:  calc.height_lower_part.value,
      width_side_part:    calc.width_side_part.value,
      grille_location:    calc.grille_location.value,
      model_id:           calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.price_retail.value) {
    try {
      const result = await recalculate({
        order_id: Number(calc.number.value),
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
function validateDimension(value: string, label: string, errRef: { value: boolean }): string {
  const v = value.trim()
  if (!v || v === '0') {
    errRef.value = true
    return `Заполните поле: ${label}`
  }
  if (!/^\d+$/.test(v)) {
    errRef.value = true
    return `${label} должна быть числом`
  }
  const n = parseInt(v, 10)
  if (n < 100 || n > 300) {
    errRef.value = true
    return `${label} должна быть от 100 до 300 мм`
  }
  errRef.value = false
  return ''
}

function validate(): boolean {
  errHeightTop.value   = false
  errHeightLower.value = false
  errWidthSide.value   = false

  const msgs: string[] = []

  if (showHeightTop.value) {
    const m = validateDimension(height_top_part.value, 'Высота верхней части', errHeightTop)
    if (m) msgs.push(m)
  }
  if (showHeightLower.value) {
    const m = validateDimension(height_lower_part.value, 'Высота нижней части', errHeightLower)
    if (m) msgs.push(m)
  }
  if (showSidePart.value) {
    const m = validateDimension(width_side_part.value, 'Ширина боковой решётки', errWidthSide)
    if (m) msgs.push(m)
  }

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
  calc.setActivePage('page3')

  // Восстанавливаем сохранённые значения
  if (calc.shield_type.value)       shield_type.value       = calc.shield_type.value
  if (calc.height_top_part.value)   height_top_part.value   = calc.height_top_part.value
  if (calc.height_lower_part.value) height_lower_part.value = calc.height_lower_part.value
  if (calc.width_side_part.value)   width_side_part.value   = calc.width_side_part.value
  if (calc.grille_location.value)   grille_location.value   = calc.grille_location.value

  await loadColorShield()

  if (calc.color_shield_id.value) {
    color_shield_id.value = calc.color_shield_id.value
  }

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
      <span class="text-2xl font-bold flex-1 text-center">Щит</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto" style="max-height: 500px; padding-inline: 4px;">

      <!-- Цвет щита -->
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-bold text-base whitespace-nowrap">Цвет щита:</span>
        <div class="flex-1 min-w-[200px] max-w-[320px]">
          <B24SelectMenu
            v-model="color_shield_id"
            value-key="id"
            :items="colorSelectItems"
            placeholder="Выберите цвет"
            class="w-full"
            @update:model-value="onColorChange"
          />
        </div>
      </div>

      <!-- Типы щита -->
      <div class="shield-grid">
        <label
          v-for="opt in shieldOptions"
          :key="opt.value"
          class="lock-card"
        >
          <input
            v-model="shield_type"
            type="radio"
            :value="opt.value"
            class="sr-only"
            @change="onShieldTypeChange"
          />
          <div class="card-content">
            <img
              :src="opt.img"
              :alt="opt.label"
              class="w-full h-[120px] object-contain mb-2"
            />
            <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
          </div>
        </label>
      </div>

      <!-- Высота верхней части (Тип_3) -->
      <div v-if="showHeightTop" class="flex items-center gap-3 flex-wrap">
        <label class="font-semibold text-sm whitespace-nowrap" for="height_top_part">
          Высота верхней части (мм):
        </label>
        <input
          id="height_top_part"
          v-model="height_top_part"
          type="text"
          class="border rounded px-3 py-2.5 text-base w-[140px]"
          :class="errHeightTop ? 'border-red-500' : 'border-gray-300'"
          @input="debouncedSave"
        />
      </div>

      <!-- Высота нижней части (Тип_2, Тип_3) -->
      <div v-if="showHeightLower" class="flex items-center gap-3 flex-wrap">
        <label class="font-semibold text-sm whitespace-nowrap" for="height_lower_part">
          Высота нижней части (мм):
        </label>
        <input
          id="height_lower_part"
          v-model="height_lower_part"
          type="text"
          class="border rounded px-3 py-2.5 text-base w-[140px]"
          :class="errHeightLower ? 'border-red-500' : 'border-gray-300'"
          @input="debouncedSave"
        />
      </div>

      <!-- Ширина боковой решётки + расположение (Тип_4) -->
      <div v-if="showSidePart" class="flex flex-wrap items-center gap-5">
        <div class="flex items-center gap-3">
          <label class="font-semibold text-sm whitespace-nowrap" for="width_side_part">
            Ширина боковой решётки (мм):
          </label>
          <input
            id="width_side_part"
            v-model="width_side_part"
            type="text"
            class="border rounded px-3 py-2.5 text-base w-[140px]"
            :class="errWidthSide ? 'border-red-500' : 'border-gray-300'"
            @input="debouncedSave"
          />
        </div>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1 cursor-pointer text-sm">
            <input
              v-model="grille_location"
              type="radio"
              value="Возле петель"
              class="accent-blue-600"
              @change="save"
            />
            Возле петель
          </label>
          <label class="flex items-center gap-1 cursor-pointer text-sm">
            <input
              v-model="grille_location"
              type="radio"
              value="Возле замка"
              class="accent-blue-600"
              @change="save"
            />
            Возле замка
          </label>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.shield-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
