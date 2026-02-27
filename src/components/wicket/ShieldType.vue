<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { getColorShield, saveWicketData, recalculate } from '../../app/api/wicket'
import type { SelectItem } from '../../app/api/wicket'

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
const colorOptions    = ref<SelectItem[]>([])
const color_shield_id = ref<string>('')

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
const imageFolder = computed(() => {
  const id = calc.opening_option_id.value
  return id === 1 || id === 4 ? 'right' : 'left'
})

const shieldOptions = computed(() => [
  { value: 'Тип_1', label: 'Тип 1', img: `/web/img/wicket/shield-type/${imageFolder.value}/shield_type1_${imageFolder.value}.jpg` },
  { value: 'Тип_2', label: 'Тип 2', img: `/web/img/wicket/shield-type/${imageFolder.value}/shield_type2_${imageFolder.value}.jpg` },
  { value: 'Тип_3', label: 'Тип 3', img: `/web/img/wicket/shield-type/${imageFolder.value}/shield_type3_${imageFolder.value}.jpg` },
  { value: 'Тип_4', label: 'Тип 4', img: `/web/img/wicket/shield-type/${imageFolder.value}/shield_type4_${imageFolder.value}.jpg` },
])

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

async function onColorChange() {
  const name = colorOptions.value.find(i => String(i.id) === color_shield_id.value)?.name ?? ''
  await save()
  openModal(`Внесены изменения: Цвет щита '${name}'`, 'Изменения сохранены')
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.shield_type.value       = shield_type.value
  calc.color_shield_id.value   = color_shield_id.value
  const colorItem = colorOptions.value.find(i => String(i.id) === color_shield_id.value)
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
      calculation_number: calc.number.value,
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
    color_shield_id.value = String(calc.color_shield_id.value)
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
      <span class="text-2xl font-bold text-center">Щит</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Цвет щита -->
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-bold text-base whitespace-nowrap">Цвет щита:</span>
        <div class="flex-1 min-w-[150px]">
          <select
            v-model="color_shield_id"
            class="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            @change="onColorChange"
          >
            <option
              v-for="item in colorOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
        </div>
      </div>

      <!-- Типы щита -->
      <div class="flex flex-wrap justify-center gap-4">
        <div
          v-for="opt in shieldOptions"
          :key="opt.value"
          class="flex flex-col items-center w-[120px]"
        >
          <label class="flex flex-col items-center gap-1 cursor-pointer">
            <div class="flex items-center gap-1">
              <input
                v-model="shield_type"
                type="radio"
                :value="opt.value"
                class="accent-blue-600"
                @change="onShieldTypeChange"
              />
              <span class="text-sm font-semibold">{{ opt.label }}</span>
            </div>
            <img
              :src="opt.img"
              :alt="opt.label"
              class="mt-1 border border-gray-300 rounded"
              style="max-width: 100px; max-height: 200px; height: auto;"
            />
          </label>
        </div>
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
          class="border rounded px-2 py-1 text-sm w-[120px]"
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
          class="border rounded px-2 py-1 text-sm w-[120px]"
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
            class="border rounded px-2 py-1 text-sm w-[120px]"
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
