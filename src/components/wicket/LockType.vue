<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const lockOptions = [
  { value: 'Тип_1', label: 'Тип 1', img: '/web/k2.jpg' },
  { value: 'Тип_2', label: 'Тип 2', img: '/web/k3.jpg' },
  { value: 'Тип_3', label: 'Тип 3', img: '/web/k3.jpg' },
  { value: 'Тип_4', label: 'Тип 4', img: '/web/k3.jpg' },
  { value: 'Тип_5', label: 'Тип 5', img: '/web/k3.jpg' },
]

const selected = ref<string>('Тип_1')

// ─── Обновление блока "Замок" — только поле "Тип замка" ──────────────────────
function updateLockBlock() {
  calc.type_lock.value = selected.value

  const block = calc.data.value.find(b => b.blockName === 'Замок')
  if (block) {
    const param = block.params.find(p => p.name === 'Тип замка')
    if (param) {
      param.value = selected.value
    } else {
      block.params.push({ name: 'Тип замка', value: selected.value })
    }
  } else {
    calc.updateOrCreateBlock('Замок', [{ name: 'Тип замка', value: selected.value }])
  }
  // Уведомляем об изменении данных
  document.dispatchEvent(new Event('dataUpdated'))
}

async function save() {
  updateLockBlock()

  try {
    await saveWicketData({
      calculation_number: calc.number.value,
      type_lock:          calc.type_lock.value,
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
  calc.setActivePage('page_lock_type')
  if (calc.type_lock.value) selected.value = calc.type_lock.value
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Тип замка</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <!-- Горизонтальная прокрутка -->
    <div class="overflow-x-auto pb-2" style="touch-action: pan-x;">
      <div class="flex flex-nowrap gap-8 px-1">
        <div
          v-for="opt in lockOptions"
          :key="opt.value"
          class="flex flex-col items-center flex-shrink-0"
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
              <span class="text-sm font-semibold">{{ opt.label }}</span>
            </div>
            <img
              :src="opt.img"
              :alt="opt.label"
              class="mt-2 border border-gray-300 rounded"
              style="max-width: 200px; max-height: 200px; height: auto;"
            />
          </label>
        </div>
      </div>
    </div>

  </div>
</template>
