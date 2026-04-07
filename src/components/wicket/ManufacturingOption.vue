<script setup lang="ts">
import { onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
}>()

const calc = useCalculation()

const materialOptions = [
  { label: 'Предоставляет изготовитель', value: 'Предоставляет изготовитель' },
  { label: 'Предоставляет заказчик',     value: 'Предоставляет заказчик' },
]
const paintOptions = materialOptions
const paintingOptions = [
  { label: 'Выполняет изготовитель', value: 'Выполняет изготовитель' },
  { label: 'Выполняет заказчик',     value: 'Выполняет заказчик' },
]

async function save() {
  calc.updateOrCreateBlock('Вариант изготовления', [
    { name: 'Материал заполнения', value: calc.provides_material.value },
    { name: 'Краска',              value: calc.provides_paint.value },
    { name: 'Окраска каркаса',     value: calc.does_painting_frame.value },
    { name: 'Сборка',              value: calc.does_assembly.value },
  ])

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      provides_material:   calc.provides_material.value,
      provides_paint:      calc.provides_paint.value,
      does_painting_frame: calc.does_painting_frame.value,
      does_assembly:       calc.does_assembly.value,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
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
      console.warn('recalculate недоступен:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page1')
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопка "Далее" -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <div class="w-[68px]" />
      <span class="text-3xl font-bold flex-1 text-center">Вариант изготовления</span>
      <B24Button
        label="Далее"
        color="air-secondary"
        @click="emit('next')"
      />
    </div>

    <!-- Группы карточек -->
    <div class="flex flex-col gap-6 mt-4">

      <!-- Материал заполнения -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения</h2>
        <div class="option-grid">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.provides_material.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Краска -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Краска</h2>
        <div class="option-grid">
          <label
            v-for="opt in paintOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.provides_paint.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Окраска каркаса -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Окраска каркаса</h2>
        <div class="option-grid">
          <label
            v-for="opt in paintingOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.does_painting_frame.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="save"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
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
    margin-inline: auto;
  }
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
  background: #eff6ff;
}

.card-content {
  padding: 12px;
}
</style>
