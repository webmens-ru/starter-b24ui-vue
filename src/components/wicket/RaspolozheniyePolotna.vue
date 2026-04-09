<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const IMG_BASE = 'https://test-lk.doorhan-krd.ru/img/wicket/type1'
const options = [
  { value: 'Вертикально',   img: `${IMG_BASE}/w_v_1.1.png` },
  { value: 'Горизонтально', img: `${IMG_BASE}/w_g_1.1.png` },
]

const selected = ref<string>('Вертикально')

async function save() {
  calc.raspolozheniyePolotna.value = selected.value

  calc.updateOrCreateBlock('Расположение полотна', [
    { name: 'Расположение полотна', value: calc.raspolozheniyePolotna.value },
  ])

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      raspolozheniyePolotna: calc.raspolozheniyePolotna.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.priceRetail.value) {
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

onMounted(async () => {
  calc.setActivePage('page6')
  if (calc.raspolozheniyePolotna.value) {
    selected.value = calc.raspolozheniyePolotna.value
  }
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Расположение полотна</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <!-- Варианты -->
    <div class="polotno-grid">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="lock-card"
      >
        <input
          v-model="selected"
          type="radio"
          :value="opt.value"
          class="sr-only"
          @change="save"
        />
        <div class="card-content">
          <img
            :src="opt.img"
            :alt="opt.value"
            class="w-full h-[140px] object-contain mb-2"
          />
          <span class="block text-sm font-semibold text-center">{{ opt.value }}</span>
        </div>
      </label>
    </div>

  </div>
</template>

<style scoped>
.polotno-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
