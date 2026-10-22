<script setup lang="ts">
import { useCalculation } from '../../composables/useCalculation'
import ProviderChoice from './ProviderChoice.vue'
defineProps<{ disabled?: boolean }>()
const calc = useCalculation()
const emit = defineEmits<{ change: [] }>()
const painters = ['Выполняет изготовитель', 'Выполняет заказчик']
</script>

<template>
  <div class="flex flex-col gap-6">
    <ProviderChoice v-model="calc.doesPaintingFrame.value" title="Окраска каркаса" :options="painters" :disabled="disabled" @change="emit('change')" />
  </div>
</template>
