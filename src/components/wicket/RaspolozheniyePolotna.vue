<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const options = [
  { value: 'Вертикально',   img: '/web/k2.jpg' },
  { value: 'Горизонтально', img: '/web/k3.jpg' },
]

const selected = ref<string>('Вертикально')

async function save() {
  calc.raspolozheniye_polotna.value = selected.value

  calc.updateOrCreateBlock('Расположение полотна', [
    { name: 'Расположение полотна', value: calc.raspolozheniye_polotna.value },
  ])

  try {
    await saveWicketData({
      calculation_number:     calc.number.value,
      raspolozheniye_polotna: calc.raspolozheniye_polotna.value,
      model_id:               calc.modelId.value,
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
  calc.setActivePage('page6')
  if (calc.raspolozheniye_polotna.value) {
    selected.value = calc.raspolozheniye_polotna.value
  }
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Расположение полотна</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <!-- Варианты -->
    <div class="flex flex-wrap justify-center gap-10 mt-2">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="flex flex-col items-center"
      >
        <label class="flex flex-col items-center gap-1 cursor-pointer">
          <div class="flex items-center gap-1">
            <input
              v-model="selected"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm font-semibold">{{ opt.value }}</span>
          </div>
          <img
            :src="opt.img"
            :alt="opt.value"
            class="mt-2 border border-gray-300 rounded"
            style="max-width: 200px; max-height: 200px; height: auto;"
          />
        </label>
      </div>
    </div>

  </div>
</template>
