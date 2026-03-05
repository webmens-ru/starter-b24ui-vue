<script setup lang="ts">
import { onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

const fillSideOptions = [
  { label: 'Одна сторона', value: 'Одна сторона' },
  { label: 'Две стороны',  value: 'Две стороны' },
]

const materialOptions = [
  { label: 'Сайдинг',   value: 'Сайдинг' },
  { label: 'Профлист',  value: 'Профлист' },
]

function onFillSideChange() {
  if (calc.fill_side.value === 'Одна сторона') {
    calc.material_yard_glob.value = null
  } else {
    calc.material_yard_glob.value = calc.material_facade_glob.value
  }
  save()
}

async function save() {
  const params = [
    { name: 'Сторона заполнения',          value: calc.fill_side.value },
    { name: 'Материал заполнения (фасад)', value: calc.material_facade_glob.value },
  ]
  if (calc.fill_side.value === 'Две стороны') {
    params.push({ name: 'Материал заполнения (двор)', value: calc.material_yard_glob.value ?? '' })
  }
  calc.updateOrCreateBlock('Заполнение', params)

  await saveWicketData({
    calculation_number:       calc.number.value,
    fill_side:                calc.fill_side.value,
    material_facade_glob:     calc.material_facade_glob.value,
    material_yard_glob:       calc.material_yard_glob.value,
    model_id:                 calc.modelId.value,
    material_supplier_facade: null,
    form_facade:              null,
    thickness_facade:         null,
    type_of_coating_facade:   null,
    color_facade:             null,
    price_facade:             null,
    delivery_time_facade:     null,
    in_stock_facade:          null,
    material_supplier_yard:   null,
    form_yard:                null,
    thickness_yard:           null,
    type_of_coating_yard:     null,
    color_yard:               null,
    price_yard:               null,
    delivery_time_yard:       null,
    in_stock_yard:            null,
  })

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
      console.error('Ошибка пересчёта цены:', e)
    }
  }
}

onMounted(async () => {
  calc.setActivePage('page2')
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold flex-1 text-center">Заполнение</span>
      <B24Button label="Далее"  color="air-secondary" @click="emit('next')" />
    </div>

    <!-- Группы карточек -->
    <div class="flex flex-col gap-6 mt-4">

      <!-- Сторона заполнения -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Сторона заполнения</h2>
        <div class="option-grid">
          <label
            v-for="opt in fillSideOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.fill_side.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="onFillSideChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Материал заполнения (фасад) -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (фасад)</h2>
        <div class="option-grid">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.material_facade_glob.value"
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

      <!-- Материал заполнения (двор) — только при "Две стороны" -->
      <div v-if="calc.fill_side.value === 'Две стороны'">
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (двор)</h2>
        <div class="option-grid">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.material_yard_glob.value"
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
