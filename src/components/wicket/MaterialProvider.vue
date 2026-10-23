<script setup lang="ts">
import { participantRoleOptions } from '../../app/participantRoles'
import { useCalculation } from '../../composables/useCalculation'
import ProviderChoice from './ProviderChoice.vue'
const calc = useCalculation()
const emit = defineEmits<{ change: [] }>()
const options = participantRoleOptions('provide')
</script>

<template>
  <ProviderChoice name="providesMaterial" v-model="calc.providesMaterial.value" title="Материал заполнения" :options="options" @change="emit('change')" />
</template>
