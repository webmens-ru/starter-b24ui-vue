<script setup lang="ts">
import { fillingSideCountLabel, isFillingSideCount } from '../../../app/fillingSideCounts'
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

function normalizeSelection() {
  if (calc.materialFacadeGlob.value !== 'lamella') clearFacadeSelection()
  calc.fillSide.value = 1
  calc.materialFacadeGlob.value = 'lamella'
  calc.materialYardGlob.value = null
  clearYardSelection()
}

async function save() {
  if (await saveNoFilling(calc)) return
  normalizeSelection()
  const params = [
    { paramCode: 'fillingProvider', name: 'Материал заполнения', value: participantRoleLabel('provide', calc.providesMaterial.value) },
    { paramCode: 'sideCount', name: 'Сторона заполнения',          value: fillingSideCountLabel(calc.fillSide.value) },
    { paramCode: 'facadeGroup', name: 'Материал заполнения (фасад)', value: fillingMaterialGroupLabel(calc.materialFacadeGlob.value) },
  ]
  calc.updateOrCreateBlock('filling', params, 'Заполнение')

  await saveWicketData({
    ...calc.getBaseSavePayload(),
    idFacade: calc.idFacade.value || null,
    providesMaterial: calc.providesMaterial.value,
    fillingOrientationCode: calc.raspolozheniyePolotna.value,
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

    <MaterialProvider :persist="save" default-facade-group="lamella" />

    <!-- Группы карточек -->
    <div v-if="calc.fillSide.value !== 0" class="flex flex-col gap-6 mt-4">

      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Сторона заполнения</h2>
        <p class="fixed-selection" data-testid="lamella-side-count">{{ fillingSideCountLabel(1) }}</p>
      </div>
      <div>
        <h2 class="text-center text-xl font-semibold mb-3">Материал заполнения</h2>
        <p class="fixed-selection" data-testid="lamella-material">{{ fillingMaterialGroupLabel('lamella') }}</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.fixed-selection {
  max-width: 600px;
  margin-inline: auto;
  padding: 16px;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  background: #eff6ff;
  text-align: center;
  font-weight: 600;
}
</style>
