<script setup lang="ts">
import { computed, ref } from 'vue'
import { participantRoleOptions } from '../../app/participantRoles'
import { hasInvalidFillingGroupSelection } from '../../app/fillingMaterialGroups'
import { hasInvalidFillingSideCountSelection } from '../../app/fillingSideCounts'
import { useCalculation } from '../../composables/useCalculation'

const calc = useCalculation()
const props = defineProps<{ persist: () => Promise<void> }>()
const busy = ref(false)
const saveError = ref('')
async function persist(): Promise<void> {
  busy.value = true
  calc.fillingSaveBlocked.value = true
  saveError.value = ''
  try {
    await props.persist()
    calc.fillingSaveBlocked.value = false
  } catch {
    saveError.value = 'Не удалось сохранить заполнение. Повторите сохранение.'
  } finally { busy.value = false }
}
const options = [...participantRoleOptions('provide'), { value: 'none', label: 'Без заполнения' }]
const choice = computed({
  get: () => calc.fillSide.value === 0 ? 'none' : calc.providesMaterial.value,
  set: (value: string) => {
    if (value === 'none') {
      calc.fillSide.value = 0
      calc.clearFilling()
    } else if (value === 'manufacturer' || value === 'customer') {
      if (calc.fillSide.value === 0) { calc.clearFilling(); calc.fillSide.value = 1 }
      calc.providesMaterial.value = value
    }
  },
})
</script>

<template>
  <fieldset :disabled="busy" class="min-w-0">
    <legend class="w-full text-center text-xl font-semibold mb-3">Материал заполнения</legend>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[800px] mx-auto">
      <label v-for="option in options" :key="option.value" class="provider-card">
        <input v-model="choice" name="providesMaterial" type="radio" :value="option.value" class="sr-only" @change="persist" />
        <span class="block p-3 text-sm font-semibold text-center">{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
  <p v-if="saveError" role="alert" data-filling-save-error class="text-red-500">{{ saveError }}</p>
  <button v-if="saveError" data-filling-save-retry type="button" :disabled="busy" @click="persist">Повторить сохранение</button>
  <p v-if="hasInvalidFillingSideCountSelection(calc.fillSide.value)" role="alert" data-side-count-problem class="text-red-500">
    Сохранённое количество сторон некорректно. Выберите количество сторон заново.
  </p>
  <p v-if="calc.fillSide.value !== 0 && hasInvalidFillingGroupSelection(calc.materialFacadeGlob.value, calc.materialYardGlob.value)" role="alert" class="text-red-500">
    Сохранённая группа заполнения некорректна. Выберите материал заполнения заново.
  </p>
</template>

<style scoped>
.provider-card { cursor: pointer; border: 2px solid #e5e7eb; border-radius: 12px; background: #fff; }
.provider-card:hover { border-color: #93c5fd; }
.provider-card:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgb(59 130 246 / 15%); background: #eff6ff; }
.provider-card:has(input:focus-visible) { outline: 2px solid #2563eb; outline-offset: 3px; }
</style>
