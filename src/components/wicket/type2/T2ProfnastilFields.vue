<script setup lang="ts">
import ColorSelectMenu from '../shared/ColorSelectMenu.vue'
import type { ColorInputItem } from './type2ProfnastilForm'

defineProps<{
  showMaterialSelectors: boolean
  profile: number | null | undefined
  profileSelectItems: ColorInputItem[]
  selectedMaterialId: number | undefined
  coating: number | null | undefined
  coatingSelectItems: ColorInputItem[]
  dictionaryColorId: number | undefined
  colorSelectItems: ColorInputItem[]
  loading: boolean
  loadError: string
  submitted: boolean
  colorValid: boolean
}>()
const emit = defineEmits<{
  (event: 'profile-change', value: string | number | undefined): void
  (event: 'coating-change', value: string | number | undefined): void
  (event: 'dictionary-color-change', value: number | undefined): void
}>()
</script>

<template>
  <div class="profnastil-fields">
    <label v-if="showMaterialSelectors" class="form-field">
      <span class="font-semibold">Тип профиля <span class="text-red-600">*</span></span>
      <B24SelectMenu
        :model-value="profile || undefined"
        value-key="id"
        :items="profileSelectItems"
        placeholder="Выберите тип профиля"
        class="w-full"
        :disabled="loading"
        @update:model-value="emit('profile-change', $event)"
      />
      <span v-if="submitted && !profile" class="text-sm text-red-600">Выберите тип профиля</span>
    </label>

    <label v-if="showMaterialSelectors" class="form-field">
        <span class="font-semibold">Тип покрытия <span class="text-red-600">*</span></span>
        <B24SelectMenu
          :model-value="selectedMaterialId || undefined"
          value-key="id"
          :items="coatingSelectItems"
          placeholder="Выберите тип покрытия"
          class="w-full"
          :disabled="loading || !profile"
          @update:model-value="emit('coating-change', $event)"
        />
        <span v-if="submitted && !coating" class="text-sm text-red-600">Выберите тип покрытия</span>
    </label>

    <label class="form-field">
      <span class="font-semibold">Цвет <span class="text-red-600">*</span></span>
      <ColorSelectMenu
        :model-value="dictionaryColorId"
        value-key="id"
        :items="colorSelectItems"
        placeholder="Выберите цвет"
        class="w-full"
        :disabled="loading || !!loadError"
        @update:model-value="emit('dictionary-color-change', $event === undefined ? undefined : Number($event))"
      />
      <span v-if="submitted && !colorValid" class="text-sm text-red-600">Выберите цвет</span>
    </label>

  </div>
</template>

<style scoped>
.profnastil-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; width: 100%; }
@media (min-width: 768px) { .profnastil-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.form-field { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
</style>
