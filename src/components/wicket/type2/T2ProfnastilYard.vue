<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { recalculate } from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import T2ProfnastilForm from './T2ProfnastilForm.vue'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const formRef = ref<InstanceType<typeof T2ProfnastilForm> | null>(null)

async function onContinue() {
  if (!await formRef.value?.validate()) return
  if (calc.priceRetail.value) {
    const result = await recalculate({
      orderId: Number(calc.number.value),
      productType: calc.productType.value,
      model: calc.model.value,
      modelId: calc.modelId.value,
    })
    calc.updatePriceBlock(result.priceDealer, result.priceRetail)
  }
  emit('next')
}

onMounted(() => calc.setActivePage('page2_yard_profnastil'))
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="sticky-header-fill sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 pb-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="flex-1 text-center text-3xl font-bold">Заполнение (двор)</span>
      <B24Button label="Далее" color="air-secondary" @click="onContinue" />
    </div>
    <T2ProfnastilForm ref="formRef" side="yard" />
  </div>
</template>
