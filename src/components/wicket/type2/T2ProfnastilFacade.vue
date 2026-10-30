<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCalculation } from '../../../composables/useCalculation'
import { createStepLeaveAttempt } from '../stepLeaveAttempt'
import T2ProfnastilForm from './T2ProfnastilForm.vue'

const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()
const calc = useCalculation()
const formRef = ref<InstanceType<typeof T2ProfnastilForm> | null>(null)

const { validateBeforeLeave, next: onContinue } = createStepLeaveAttempt(
  async () => await formRef.value?.validate() ?? true,
  () => emit('next'),
)

defineExpose({ validateBeforeLeave })

onMounted(() => calc.setActivePage('page2_facade_profnastil'))
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="sticky-header-fill sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 pb-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="flex-1 text-center text-3xl font-bold">Заполнение (фасад)</span>
      <B24Button label="Далее" color="air-secondary" @click="onContinue" />
    </div>
    <T2ProfnastilForm ref="formRef" side="facade" table-mode />
  </div>
</template>
