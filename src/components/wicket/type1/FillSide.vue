<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../../app/api/wicket'

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

/** Калитка тип 1: первая сторона (фасад) — только сайдинг (см. бэкенд Type1). */
const isType1 = computed(() => String(calc.modelId.value) === '1')

const materialFacadeOptions = computed(() =>
  isType1.value ? [{ label: 'Сайдинг', value: 'Сайдинг' }] : materialOptions,
)

function clearFacadeSelection() {
  calc.idFacade.value = ''
  calc.materialSupplierFacade.value = ''
  calc.materialFacade.value = ''
  calc.formFacade.value = ''
  calc.thicknessFacade.value = ''
  calc.typeOfCoatingFacade.value = ''
  calc.colorFacade.value = ''
}

function clearYardSelection() {
  calc.idYard.value = ''
  calc.materialSupplierYard.value = ''
  calc.materialYard.value = ''
  calc.formYard.value = ''
  calc.thicknessYard.value = ''
  calc.typeOfCoatingYard.value = ''
  calc.colorYard.value = ''
}

function onFillSideChange() {
  if (calc.fillSide.value === 'Одна сторона') {
    calc.materialYardGlob.value = null
    clearYardSelection()
  } else {
    calc.materialYardGlob.value = calc.materialFacadeGlob.value
    clearYardSelection()
  }
  save()
}

function onMaterialFacadeChange() {
  clearFacadeSelection()
  if (calc.fillSide.value === 'Две стороны') {
    calc.materialYardGlob.value = calc.materialFacadeGlob.value
    clearYardSelection()
  }
  save()
}

/** Старые расчёты / API могли вернуть профлист на фасаде — для типа 1 недопустимо. */
function coerceType1FacadeToSiding(): void {
  if (!isType1.value || calc.materialFacadeGlob.value !== 'Профлист') {
    return
  }
  calc.materialFacadeGlob.value = 'Сайдинг'
  clearFacadeSelection()
  // Двор (вторая сторона) для типа 1 по-прежнему может быть профлистом — не трогаем materialYardGlob.
}

watch(isType1, () => {
  coerceType1FacadeToSiding()
})

function onMaterialYardChange() {
  clearYardSelection()
  save()
}

async function save() {
  const params = [
    { name: 'Сторона заполнения',          value: calc.fillSide.value },
    { name: 'Материал заполнения (фасад)', value: calc.materialFacadeGlob.value },
  ]
  if (calc.fillSide.value === 'Две стороны') {
    params.push({ name: 'Материал заполнения (двор)', value: calc.materialYardGlob.value ?? '' })
  }
  calc.updateOrCreateBlock('Заполнение', params)

  await saveWicketData({
    ...calc.getBaseSavePayload(),
    fillSide:                calc.fillSide.value,
    materialFacadeGlob:     calc.materialFacadeGlob.value,
    materialYardGlob:       calc.materialYardGlob.value,
    materialSupplierFacade: null,
    formFacade:              null,
    thicknessFacade:         null,
    typeOfCoatingFacade:   null,
    colorFacade:             null,
    priceFacade:             null,
    deliveryTimeFacade:     null,
    inStockFacade:          null,
    materialSupplierYard:   null,
    formYard:                null,
    thicknessYard:           null,
    typeOfCoatingYard:     null,
    colorYard:               null,
    priceYard:               null,
    deliveryTimeYard:       null,
    inStockYard:            null,
  })

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
      console.error('Ошибка пересчёта цены:', e)
    }
  }
}

onMounted(async () => {
  coerceType1FacadeToSiding()
  calc.setActivePage('page2')
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
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
              v-model="calc.fillSide.value"
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
            v-for="opt in materialFacadeOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.materialFacadeGlob.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="onMaterialFacadeChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Материал заполнения (двор) — только при "Две стороны" -->
      <div v-if="calc.fillSide.value === 'Две стороны'">
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (двор)</h2>
        <div class="option-grid">
          <label
            v-for="opt in materialOptions"
            :key="opt.value"
            class="lock-card"
          >
            <input
              v-model="calc.materialYardGlob.value"
              type="radio"
              :value="opt.value"
              class="sr-only"
              @change="onMaterialYardChange"
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
