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
      order_id: Number(calc.number.value),
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
      <span class="text-2xl font-bold flex-1 text-center">Дополнительная ручка (скоба)</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Будет / Не будет -->
      <div class="option-grid">
        <label class="lock-card">
          <input v-model="is_there_pen" type="radio" value="Будет" class="sr-only" @change="save" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">Будет</span>
          </div>
        </label>
        <label class="lock-card">
          <input v-model="is_there_pen" type="radio" value="Не будет" class="sr-only" @change="save" />
          <div class="card-content">
            <span class="block text-sm font-semibold text-center">Не будет</span>
          </div>
        </label>
      </div>

      <!-- Детали (только при "Будет") -->
      <template v-if="showDetails">

        <!-- Кто предоставляет -->
        <div class="option-grid">
          <label v-for="opt in providedOptions" :key="opt.value" class="lock-card">
            <input v-model="pen_provided" type="radio" :value="opt.value" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Кто устанавливает -->
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="pen_installed" type="radio" :value="opt.value" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

        <!-- Цвет ручки -->
        <div class="color-grid">
          <label v-for="opt in colorOptions" :key="opt.value" class="lock-card">
            <input v-model="pen_color" type="radio" :value="opt.value" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>

      </template>

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

.color-grid {
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
    margin-inline: auto;
  }

  .color-grid {
    grid-template-columns: repeat(3, 1fr);
    min-width: 350px;
    max-width: 600px;
    margin-inline: auto;
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
