<script setup lang="ts">
import { computed } from 'vue'
import { participantRoleOptions } from '../../app/participantRoles'
import { useCalculation } from '../../composables/useCalculation'
import ProviderChoice from './ProviderChoice.vue'
defineProps<{ disabled?: boolean }>()
const calc = useCalculation()
const emit = defineEmits<{ change: [] }>()
const painters = computed(() => participantRoleOptions('perform').filter(option =>
  calc.fillSide.value === 0 || option.value === 'manufacturer',
))
</script>

<template>
  <div class="flex flex-col gap-6">
    <ProviderChoice name="doesPaintingFrame" v-model="calc.doesPaintingFrame.value" title="Кто осуществляет окраску" :options="painters" :disabled="disabled" @change="emit('change')" />
  </div>
</template>
