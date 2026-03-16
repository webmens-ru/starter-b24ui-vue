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
      order_id: Number(calc.number.value),
      type_lock:          calc.type_lock.value,
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
      <span class="text-2xl font-bold flex-1 text-center">Тип замка</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="locks-grid">
      <label
        v-for="opt in lockOptions"
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
            :alt="opt.label"
            class="w-full h-[120px] object-contain mb-2"
          />
          <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
        </div>
      </label>
    </div>

  </div>
</template>

<style scoped>
.locks-grid {
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
