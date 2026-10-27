<script setup lang="ts">
import { fillingSideCountLabel, hasInvalidFillingSideCountSelection, isFillingSideCount } from '../../../app/fillingSideCounts'
import { hasInvalidFillingGroupSelection, fillingMaterialGroupLabel } from '../../../app/fillingMaterialGroups'
import { participantRoleLabel } from '../../../app/participantRoles'
import MaterialProvider from '../MaterialProvider.vue'
import { saveNoFilling } from '../saveNoFilling'
import { onMounted } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
defineExpose({ validateBeforeLeave: () => !calc.fillingSaveBlocked.value })

function clearYardSelection() {
  calc.idYard.value = ''
  calc.materialSupplierYard.value = ''
  calc.materialYard.value = ''
  calc.formYard.value = ''
  calc.thicknessYard.value = ''
  calc.typeOfCoatingYard.value = ''
  calc.colorYard.value = ''
}

async function chooseFillingSideCount() {
  calc.fillSide.value = 1
  if (hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)) {
    await saveWicketData({ ...calc.getBaseSavePayload(), providesMaterial: calc.providesMaterial.value, fillSide: 1 })
    return
  }
  await save()
}

async function chooseMaterialGroup() {
  calc.materialFacadeGlob.value = 'siding'
  calc.materialYardGlob.value = null
  if (hasInvalidFillingSideCountSelection(calc.fillSide.value)) {
    await saveWicketData({ ...calc.getBaseSavePayload(), providesMaterial: calc.providesMaterial.value,
      materialFacadeGlob: calc.materialFacadeGlob.value, materialYardGlob: null })
    return
  }
  await save()
}

async function save() {
  if (await saveNoFilling(calc)) return
  if (hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)
    || hasInvalidFillingSideCountSelection(calc.fillSide.value)) {
    await saveWicketData({ ...calc.getBaseSavePayload(), providesMaterial: calc.providesMaterial.value })
    return
  }
  calc.fillSide.value = 1
  calc.materialFacadeGlob.value = 'siding'
  calc.materialYardGlob.value = null
  clearYardSelection()

  calc.updateOrCreateBlock('filling', [
    { paramCode: 'fillingProvider', name: 'Материал заполнения', value: participantRoleLabel('provide', calc.providesMaterial.value) },
    { paramCode: 'sideCount', name: 'Сторона заполнения',          value: fillingSideCountLabel(calc.fillSide.value) },
    { paramCode: 'facadeGroup', name: 'Материал заполнения (фасад)', value: fillingMaterialGroupLabel(calc.materialFacadeGlob.value) },
  ], 'Заполнение')

  await saveWicketData({
    ...calc.getBaseSavePayload(),
    providesMaterial: calc.providesMaterial.value,
    fillingOrientationCode: calc.raspolozheniyePolotna.value,
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

  if (calc.priceRetail.value && isFillingSideCount(calc.fillSide.value)
    && !hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
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
  if (calc.fillSide.value === 0) { calc.clearFilling(); await save(); return }
  if (hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)
    || hasInvalidFillingSideCountSelection(calc.fillSide.value)) return
  if (calc.fillSide.value === null) calc.fillSide.value = 1
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-3xl font-bold flex-1 text-center">Заполнение</span>
      <B24Button label="Далее" :disabled="calc.fillingSaveBlocked.value" color="air-secondary" @click="emit('next')" />
    </div>

    <MaterialProvider :persist="save" />

    <!-- Группы карточек -->
    <div v-if="calc.fillSide.value !== 0" class="flex flex-col gap-6 mt-4">

      <!-- Сторона заполнения (фиксированно: Одна сторона) -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Сторона заполнения</h2>
        <div class="option-grid">
          <label class="lock-card" :class="{ selected: calc.fillSide.value === 1 }">
            <input v-model="calc.fillSide.value" type="radio" name="fillingSideCount" :value="1" class="sr-only" @click="chooseFillingSideCount" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ fillingSideCountLabel(1) }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Материал заполнения (фасад) — фиксированно: SP сайдинг -->
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения (фасад)</h2>
        <div class="option-grid">
          <label class="lock-card" :class="{ selected: calc.materialFacadeGlob.value === 'siding' }">
            <input v-model="calc.materialFacadeGlob.value" type="radio" name="materialFacadeGroup" value="siding" class="sr-only" @click="chooseMaterialGroup" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">SP сайдинг</span>
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
