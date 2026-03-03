<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const is_there_pen = ref<string>('Не будет')
const pen_provided = ref<string>('Предоставляет изготовитель')
const pen_installed = ref<string>('Устанавливает изготовитель')
const pen_color    = ref<string>('Черная')

const showDetails = computed(() => is_there_pen.value === 'Будет')

const providedOptions = [
  { value: 'Предоставляет изготовитель', label: 'Предоставляет изготовитель' },
  { value: 'Предоставляет заказчик',     label: 'Предоставляет заказчик' },
]
const installedOptions = [
  { value: 'Устанавливает изготовитель', label: 'Устанавливает изготовитель' },
  { value: 'Устанавливает заказчик',     label: 'Устанавливает заказчик' },
]
const colorOptions = [
  { value: 'Черная',      label: 'Черная' },
  { value: 'Коричневая',  label: 'Коричневая' },
  { value: 'Белая',       label: 'Белая' },
]

function syncCalcFields() {
  calc.is_there_pen_name.value = is_there_pen.value
  calc.is_there_pen_id.value   = is_there_pen.value === 'Будет' ? 1 : 0

  if (showDetails.value) {
    calc.pen_provided.value  = pen_provided.value
    calc.pen_installed.value = pen_installed.value
    calc.pen_color.value     = pen_color.value
  } else {
    calc.pen_provided.value  = ''
    calc.pen_installed.value = ''
    calc.pen_color.value     = ''
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Дополнительная ручка', value: calc.is_there_pen_name.value },
  ]
  if (showDetails.value) {
    params.push({ name: 'Ручку предоставляет', value: calc.pen_provided.value })
    params.push({ name: 'Ручку устанавливает', value: calc.pen_installed.value })
    params.push({ name: 'Цвет ручки',          value: calc.pen_color.value })
  }
  calc.updateOrCreateBlock('Дополнительная ручка (скоба)', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      calculation_number: calc.number.value,
      is_there_pen_id:    calc.is_there_pen_id.value,
      is_there_pen_name:  calc.is_there_pen_name.value,
      pen_provided:       calc.pen_provided.value || null,
      pen_installed:      calc.pen_installed.value || null,
      pen_color:          calc.pen_color.value || null,
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

onMounted(async () => {
  calc.setActivePage('page10')

  if (calc.is_there_pen_name.value) is_there_pen.value  = calc.is_there_pen_name.value
  if (calc.pen_provided.value)      pen_provided.value  = calc.pen_provided.value
  if (calc.pen_installed.value)     pen_installed.value = calc.pen_installed.value
  if (calc.pen_color.value)         pen_color.value     = calc.pen_color.value

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Дополнительная ручка (скоба)</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Будет / Не будет -->
      <div class="flex justify-center gap-24 flex-wrap">
        <label class="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            v-model="is_there_pen"
            type="radio"
            value="Будет"
            class="accent-blue-600"
            @change="save"
          />
          Будет
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            v-model="is_there_pen"
            type="radio"
            value="Не будет"
            class="accent-blue-600"
            @change="save"
          />
          Не будет
        </label>
      </div>

      <!-- Детали (только при "Будет") -->
      <template v-if="showDetails">

        <!-- Кто предоставляет -->
        <div class="flex justify-center gap-12 flex-wrap">
          <label
            v-for="opt in providedOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="pen_provided"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm">{{ opt.label }}</span>
          </label>
        </div>

        <!-- Кто устанавливает -->
        <div class="flex justify-center gap-12 flex-wrap">
          <label
            v-for="opt in installedOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="pen_installed"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm">{{ opt.label }}</span>
          </label>
        </div>

        <!-- Цвет ручки -->
        <div class="flex justify-center gap-8 flex-wrap">
          <label
            v-for="opt in colorOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="pen_color"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm">{{ opt.label }}</span>
          </label>
        </div>

      </template>

    </div>
  </div>
</template>
