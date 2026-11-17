<script setup lang="ts">
import { computed } from 'vue'
import { colorMenuUi, validColorHex } from '../shared/colorMenuPresentation'
import ColorSelectMenu from '../shared/ColorSelectMenu.vue'
import type { ProfnastilColorMode, ColorInputItem } from './type2ProfnastilForm'

const props = defineProps<{
  manufacturerVisible: boolean
  showMaterialSelectors: boolean
  selectedManufacturerId: string | number
  manufacturerSelectItems: ColorInputItem[]
  profile: number | null | undefined
  profileSelectItems: ColorInputItem[]
  selectedMaterialId: number | undefined
  coating: number | null | undefined
  coatingSelectItems: ColorInputItem[]
  colorMode: ProfnastilColorMode | null
  dictionaryColorId: number | undefined
  colorSelectItems: ColorInputItem[]
  comboboxValue: string | number | undefined
  printechSelectItems: ColorInputItem[]
  loading: boolean
  loadError: string
  submitted: boolean
  colorValid: boolean
}>()
const selectedTextureHex = computed(() => validColorHex(props.printechSelectItems.find(item => String(item.id) === String(props.comboboxValue))?.hex))
const emit = defineEmits<{
  (event: 'manufacturer-change', value: string | number | undefined): void
  (event: 'profile-change', value: string | number | undefined): void
  (event: 'coating-change', value: string | number | undefined): void
  (event: 'dictionary-color-change', value: number | undefined): void
  (event: 'printech-color-change', value: number | string | null): void
  (event: 'custom-color-create', value: string): void
}>()
</script>

<template>
  <div class="profnastil-fields">
    <label v-if="manufacturerVisible" class="form-field">
      <span class="font-semibold">Производитель</span>
      <B24SelectMenu
        :model-value="selectedManufacturerId"
        value-key="id"
        :items="manufacturerSelectItems"
        placeholder="Не выбран"
        class="w-full"
        :disabled="loading"
        @update:model-value="emit('manufacturer-change', $event)"
      />
    </label>

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

    <label v-if="colorMode === 'list'" class="form-field">
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

    <label v-else-if="colorMode === 'combobox'" class="form-field">
      <span class="font-semibold">Цвет / текстура <span class="text-red-600">*</span></span>
      <B24InputMenu
        :model-value="comboboxValue"
        value-key="id"
        :items="printechSelectItems"
        :create-item="false"
        placeholder="Выберите цвет материала"
        class="w-full"
        :disabled="loading || !!loadError"
        :b24ui="{ ...colorMenuUi, base: selectedTextureHex ? 'ps-10' : undefined }"
        :content="{ side: 'bottom', align: 'start', sideOffset: 4, avoidCollisions: true }"
        @update:model-value="emit('printech-color-change', $event)"
        @create="emit('custom-color-create', $event)"
      >
        <template v-if="selectedTextureHex" #leading>
          <span data-color-swatch aria-hidden="true" class="inline-block size-4 shrink-0 border border-black/20" :style="{ backgroundColor: selectedTextureHex, borderRadius: '50%', width: '14px', height: '14px' }" />
        </template>
        <template #item-leading="{ item }">
          <span v-if="validColorHex(item.hex)" data-color-swatch aria-hidden="true" class="inline-block size-4 shrink-0 border border-black/20" :style="{ backgroundColor: validColorHex(item.hex), borderRadius: '50%', width: '14px', height: '14px' }" />
        </template>
      </B24InputMenu>
      <span v-if="submitted && !colorValid" class="text-sm text-red-600">Укажите цвет или текстуру</span>
    </label>
  </div>
</template>

<style scoped>
.profnastil-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; width: 100%; }
@media (min-width: 768px) { .profnastil-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.form-field { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
</style>
