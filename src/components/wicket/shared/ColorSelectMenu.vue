<script setup lang="ts">
import { computed } from 'vue'
import { colorMenuUi, validColorHex } from './colorMenuPresentation'

defineOptions({ inheritAttrs: false })
interface ColorItem { id: string | number; label: string; hex?: string | null; disabled?: boolean }
const props = defineProps<{ modelValue?: string | number; items: ColorItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number | undefined] }>()
const selectedHex = computed(() => validColorHex(props.items.find(item => String(item.id) === String(props.modelValue))?.hex))
</script>

<template>
  <B24SelectMenu
    v-bind="$attrs"
    :model-value="modelValue"
    :items="items"
    value-key="id"
    :b24ui="{ ...colorMenuUi, base: selectedHex ? 'ps-10' : undefined }"
    :content="{ align: 'start' }"
    class="w-full"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="selectedHex" #leading>
      <span data-color-swatch aria-hidden="true" class="inline-block size-4 shrink-0 border border-black/20" :style="{ backgroundColor: selectedHex, borderRadius: '50%', width: '14px', height: '14px' }" />
    </template>
    <template #item-leading="{ item }">
      <span v-if="validColorHex(item.hex)" data-color-swatch aria-hidden="true" class="inline-block size-4 shrink-0 border border-black/20" :style="{ backgroundColor: validColorHex(item.hex), borderRadius: '50%', width: '14px', height: '14px' }" />
    </template>
  </B24SelectMenu>
</template>
