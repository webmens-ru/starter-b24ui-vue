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
      <span class="text-3xl font-bold">Заполнение</span>
      <B24Button label="Далее"  color="air-secondary" @click="emit('next')" />
    </div>

    <!-- Группы радио-кнопок -->
    <div class="flex flex-col gap-6 mt-4">

      <!-- Сторона заполнения -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Сторона заполнения</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in fillSideOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.fill_side.value"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="onFillSideChange"
            />
            {{ opt.label }}
          </label>
        </div>
      </div>

      <!-- Материал заполнения (фасад) -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (фасад)</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.material_facade_glob.value"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            {{ opt.label }}
          </label>
        </div>
      </div>

      <!-- Материал заполнения (двор) — только при "Две стороны" -->
      <div v-if="calc.fill_side.value === 'Две стороны'">
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (двор)</h2>
        <div class="flex justify-center gap-6 flex-wrap">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="calc.material_yard_glob.value"
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
