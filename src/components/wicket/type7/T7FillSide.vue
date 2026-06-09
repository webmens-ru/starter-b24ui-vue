<script setup lang="ts">
import { onMounted } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

function clearYardSelection() {
  calc.idYard.value = ''
  calc.materialSupplierYard.value = ''
  calc.materialYard.value = ''
  calc.formYard.value = ''
  calc.thicknessYard.value = ''
  calc.typeOfCoatingYard.value = ''
  calc.colorYard.value = ''
}

async function save() {
  calc.fillSide.value = 'Одна сторона'
  calc.materialFacadeGlob.value = 'Сайдинг'
  calc.materialYardGlob.value = null
  clearYardSelection()

  calc.updateOrCreateBlock('Заполнение', [
    { name: 'Сторона заполнения',          value: calc.fillSide.value },
    { name: 'Материал заполнения (фасад)', value: calc.materialFacadeGlob.value },
  ])

  await saveWicketData({
    ...calc.getBaseSavePayload(),
    fillSide:                calc.fillSide.value,
    materialFacadeGlob:     calc.materialFacadeGlob.value,
    materialYardGlob:       null,
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

      <!-- Сторона заполнения (фиксированно: Одна сторона) -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Сторона заполнения</h2>
        <div class="option-grid">
          <div class="lock-card selected">
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Одна сторона</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Материал заполнения (фасад) — фиксированно: SP сайдинг -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (фасад)</h2>
        <div class="option-grid">
          <div class="lock-card selected">
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">SP сайдинг</span>
            </div>
          </div>
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
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.lock-card.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #eff6ff;
}

.card-content {
  padding: 12px;
}
</style>
