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
      calculation_number:  calc.number.value,
      provides_material:   calc.provides_material.value,
      provides_paint:      calc.provides_paint.value,
      does_painting_frame: calc.does_painting_frame.value,
      does_assembly:       calc.does_assembly.value,
      model_id:            calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData недоступен:', e)
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
    <div class="flex items-center justify-between flex-wrap gap-2">
      <span class="text-3xl font-bold">Вариант изготовления</span>
      <B24Button
        label="Далее"
        color="air-secondary"
        @click="emit('next')"
      />
    </div>

    <!-- Группы радио-кнопок -->
    <div class="flex flex-col gap-6 mt-4">

      <!-- Материал заполнения -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.provides_material.value"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            {{ opt.label }}
          </label>
        </div>
      </div>

      <!-- Краска -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Краска</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in paintOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.provides_paint.value"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            {{ opt.label }}
          </label>
        </div>
      </div>

      <!-- Окраска каркаса -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Окраска каркаса</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in paintingOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.does_painting_frame.value"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            {{ opt.label }}
          </label>
        </div>
      </div>

    </div>
  </div>
</template>
