<script setup lang="ts">
import { useCalculation } from '../../composables/useCalculation'
import ProviderChoice from './ProviderChoice.vue'
const calc = useCalculation()
const emit = defineEmits<{ change: [] }>()
const options = ['Предоставляет изготовитель', 'Предоставляет заказчик']
</script>

<template>
  <ProviderChoice v-model="calc.providesMaterial.value" title="Материал заполнения" :options="options" @change="emit('change')" />
</template>
