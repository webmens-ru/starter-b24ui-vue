<script setup lang="ts">
import { participantRoleOptions } from '../../app/participantRoles'
import { hasInvalidFillingGroupSelection } from '../../app/fillingMaterialGroups'
import { hasInvalidFillingSideCountSelection } from '../../app/fillingSideCounts'
import { useCalculation } from '../../composables/useCalculation'
import ProviderChoice from './ProviderChoice.vue'
const calc = useCalculation()
const emit = defineEmits<{ change: [] }>()
const options = participantRoleOptions('provide')
</script>

<template>
  <ProviderChoice name="providesMaterial" v-model="calc.providesMaterial.value" title="Материал заполнения" :options="options" @change="emit('change')" />
  <p v-if="hasInvalidFillingSideCountSelection(calc.fillSide.value)" role="alert" data-side-count-problem class="text-red-500">
    Сохранённое количество сторон некорректно. Выберите количество сторон заново.
  </p>
  <p v-if="hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)" role="alert" class="text-red-500">
    Сохранённая группа заполнения некорректна. Выберите материал заполнения заново.
  </p>
</template>
