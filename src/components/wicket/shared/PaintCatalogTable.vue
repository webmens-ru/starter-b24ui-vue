<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PaintItem } from '../../../app/api/wicket.types'
import { formatMaterialPrice } from './materialPrice'
import ColorSelectMenu from './ColorSelectMenu.vue'
const props = defineProps<{ paints: PaintItem[]; paintId: number | null; colorId: number | null; disabled?: boolean }>()
const emit = defineEmits<{ select: [paintId: number, colorId: number] }>()
const typeFilter = ref('all')
const colorFilter = ref('all')
const types = computed(() => [...new Map(props.paints.map(paint => [String(paint.paintTypeId ?? 'none'), { id: String(paint.paintTypeId ?? 'none'), label: paint.paintTypeName ?? 'Без типа' }])).values()])
const colors = computed(() => [...new Map(props.paints.flatMap(paint => paint.colors.map(color => [String(color.id), color] as const))).values()])
const typeItems = computed(() => [{ id: 'all', label: 'Все типы' }, ...types.value])
const colorItems = computed(() => [{ id: 'all', label: 'Все цвета' }, ...colors.value.map(color => ({ id: String(color.id), label: color.label ?? color.name, hex: color.hex }))])
const rows = computed(() => props.paints.flatMap(paint => paint.colors.map(color => ({ paint, color }))).filter(({paint, color}) => (typeFilter.value === 'all' || String(paint.paintTypeId ?? 'none') === typeFilter.value) && (colorFilter.value === 'all' || String(color.id) === colorFilter.value)))
function select(paintId: number, colorId: number): void {
  if (!props.disabled) emit('select', paintId, colorId)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="flex flex-col gap-2"><span class="font-semibold">Тип краски</span>
        <B24SelectMenu v-model="typeFilter" data-testid="paint-type-filter" :items="typeItems" value-key="id" :search-input="{ placeholder: 'Поиск типа краски' }" class="w-full" :disabled="disabled" />
      </label>
      <label class="flex flex-col gap-2"><span class="font-semibold">Цвет</span>
        <ColorSelectMenu v-model="colorFilter" data-testid="paint-color-filter" :items="colorItems" :search-input="{ placeholder: 'Поиск цвета' }" :disabled="disabled" />
      </label>
    </div>
    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table class="w-full text-left paint-table">
        <caption class="sr-only">Выбор краски и цвета. Стоимость материала без работ.</caption>
        <thead><tr><th scope="col">Тип краски</th><th scope="col">Цвет</th><th scope="col" class="text-right">Стоимость, ₽/м²</th></tr></thead>
        <tbody>
          <tr v-for="{paint, color} in rows" :key="`${paint.id}:${color.id}`" :class="{ selected: paint.id === paintId && color.id === colorId, selectable: !disabled }" @click="select(paint.id, color.id)">
            <td><button type="button" class="text-left w-full" :data-paint-row="`${paint.id}:${color.id}`" :aria-pressed="paint.id === paintId && color.id === colorId" :aria-label="`${paint.paintTypeName ?? 'Без типа'}, ${paint.name}, ${color.label ?? color.name}`" :disabled="disabled" @click.stop="select(paint.id, color.id)"><span class="font-semibold">{{ paint.paintTypeName ?? 'Без типа' }}</span><span class="block text-sm text-gray-500">{{ paint.name }}</span></button></td>
            <td><span class="inline-flex items-center gap-2"><span v-if="color.hex" aria-hidden="true" class="inline-block w-5 h-5 shrink-0 rounded border border-gray-300" :style="{ backgroundColor: color.hex }" />{{ color.label ?? color.name }}</span></td>
            <td class="text-right whitespace-nowrap">{{ paint.priceM2 == null ? '—' : formatMaterialPrice(paint.priceM2) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" role="status" class="p-4 text-gray-500">Нет красок по выбранным фильтрам.</p>
    </div>
    <p class="text-sm text-gray-500">Стоимость материала без работ. Нажмите на строку, чтобы выбрать краску и цвет.</p>
  </div>
</template>

<style scoped>
.paint-table th, .paint-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.paint-table th { background: #f9fafb; font-size: 14px; }
.paint-table tr.selectable { cursor: pointer; }
.paint-table tr.selectable:hover { background: #f0f7ff; }
.paint-table tr.selected { background: #eff6ff; box-shadow: inset 3px 0 #3b82f6; }
.paint-table button { cursor: inherit; }
.paint-table button:focus-visible { outline: 2px solid #2563eb; outline-offset: 4px; border-radius: 2px; }
</style>
