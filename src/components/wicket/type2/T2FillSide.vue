<script setup lang="ts">
import { fillingSideCountLabel, hasInvalidFillingSideCountSelection, isFillingSideCount, fillingSideCountOptions } from '../../../app/fillingSideCounts'
import { hasInvalidFillingGroupSelection, fillingMaterialGroupLabel } from '../../../app/fillingMaterialGroups'
import { participantRoleLabel } from '../../../app/participantRoles'
import MaterialProvider from '../MaterialProvider.vue'
import { saveNoFilling } from '../saveNoFilling'
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()
const pageSaveError = ref('')
defineExpose({ validateBeforeLeave: () => !calc.fillingSaveBlocked.value })

const fillSideOptions = fillingSideCountOptions()

function normalizeFixedFillingGroups(): void {
  if (calc.fillSide.value !== 1 && calc.fillSide.value !== 2) return
  if (calc.materialFacadeGlob.value !== 'profnastil') {
    calc.resetFacadeFilling()
    calc.materialFacadeGlob.value = 'profnastil'
  }
  if (calc.fillSide.value === 2 && calc.materialYardGlob.value !== 'profnastil') {
    calc.resetYardFilling()
    calc.materialYardGlob.value = 'profnastil'
  }
}

async function persist(): Promise<void> {
  calc.fillingSaveBlocked.value = true
  try {
    await save()
  } catch {
    pageSaveError.value = 'Не удалось сохранить заполнение. Повторите сохранение.'
  }
}

function onFillSideChange(): void {
  if (calc.fillSide.value === 1) {
    calc.materialYardGlob.value = null
    calc.resetYardFilling()
  }
  void persist()
}

async function save() {
  pageSaveError.value = ''
  normalizeFixedFillingGroups()
  if (await saveNoFilling(calc)) { calc.fillingSaveBlocked.value = false; return }
  const params = [
    { paramCode: 'fillingProvider', name: 'Материал заполнения', value: participantRoleLabel('provide', calc.providesMaterial.value) },
    { paramCode: 'sideCount', name: 'Сторона заполнения',          value: fillingSideCountLabel(calc.fillSide.value) },
    { paramCode: 'facadeGroup', name: 'Материал заполнения (фасад)', value: fillingMaterialGroupLabel(calc.materialFacadeGlob.value) },
  ]
  if (calc.fillSide.value === 2) {
    params.push({ paramCode: 'yardGroup', name: 'Материал заполнения (двор)', value: fillingMaterialGroupLabel(calc.materialYardGlob.value) })
  }
  calc.updateOrCreateBlock('filling', params, 'Заполнение')

  await saveWicketData({
    ...calc.getBaseSavePayload(),
    providesMaterial: calc.providesMaterial.value,
    fillingOrientationCode: calc.raspolozheniyePolotna.value,
    fillSide:                calc.fillSide.value,
    materialFacadeGlob:     calc.materialFacadeGlob.value,
    materialYardGlob:       calc.materialYardGlob.value,
    idFacade:                calc.idFacade.value || null,
    materialFacade:          calc.materialFacade.value || null,
    formFacade:              calc.formFacade.value || null,
    thicknessFacade:         calc.thicknessFacade.value || null,
    typeOfCoatingFacade:     calc.typeOfCoatingFacade.value || null,
    colorFacade:             calc.colorFacade.value || null,
    priceFacade:             null,
    deliveryTimeFacade:     null,
    inStockFacade:          null,
    idYard:                  calc.idYard.value || null,
    materialYard:            calc.materialYard.value || null,
    formYard:                calc.formYard.value || null,
    thicknessYard:           calc.thicknessYard.value || null,
    typeOfCoatingYard:       calc.typeOfCoatingYard.value || null,
    colorYard:               calc.colorYard.value || null,
    priceYard:               null,
    deliveryTimeYard:       null,
    inStockYard:            null,
  })

  calc.fillingSaveBlocked.value = false

  if (calc.priceRetail.value && calc.idFacade.value
    && (calc.fillSide.value === 1 || calc.idYard.value) && isFillingSideCount(calc.fillSide.value)
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
  if (hasInvalidFillingSideCountSelection(calc.fillSide.value)) return
  if (calc.fillSide.value === null) calc.fillSide.value = 1
  await persist()
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

    <MaterialProvider :persist="save" default-facade-group="profnastil" />

    <p v-if="pageSaveError" role="alert" class="text-red-500">{{ pageSaveError }}</p>
    <button v-if="pageSaveError" type="button" @click="persist">Повторить сохранение</button>

    <!-- Группы карточек -->
    <div v-if="calc.fillSide.value !== 0" class="flex flex-col gap-6 mt-4">

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
              name="fillingSideCount"
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
