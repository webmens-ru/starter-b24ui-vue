<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  getFillingAppearanceOptions,
  type FillingAppearanceOptions,
} from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'

type FillingSide = 'facade' | 'yard'
type SelectValue = string | number | null | undefined

const props = defineProps<{
  modelId: string | number
  materialGroup: string
  side: FillingSide
}>()

const emit = defineEmits<{
  (event: 'change'): void
}>()

const calc = useCalculation()
const options = ref<FillingAppearanceOptions>({ manufacturers: [], colors: [] })
const loading = ref(false)
let loadVersion = 0

const selectedManufacturerId = computed(() => (
  props.side === 'facade'
    ? calc.manufacturerFacadeId.value ?? undefined
    : calc.manufacturerYardId.value ?? undefined
))

const selectedColorId = computed(() => (
  props.side === 'facade'
    ? calc.colorFacadeId.value ?? undefined
    : calc.colorYardId.value ?? undefined
))

const manufacturerItems = computed(() => [
  { id: '', label: 'Не выбран' },
  ...options.value.manufacturers.map(item => ({ id: item.id, label: item.name })),
])

const colorItems = computed(() => [
  { id: '', label: 'Не выбран' },
  ...options.value.colors.map(item => ({ id: item.id, label: item.name })),
])

function sameValue(left: SelectValue, right: SelectValue): boolean {
  return String(left ?? '') === String(right ?? '')
}

function setManufacturer(
  selected: FillingAppearanceOptions['manufacturers'][number] | undefined,
): boolean {
  if (props.side === 'facade') {
    const changed = !sameValue(calc.manufacturerFacadeId.value, selected?.id)
      || calc.materialSupplierFacade.value !== (selected?.name ?? '')
    calc.manufacturerFacadeId.value = selected?.id ?? null
    calc.materialSupplierFacade.value = selected?.name ?? ''
    return changed
  }

  const changed = !sameValue(calc.manufacturerYardId.value, selected?.id)
    || calc.materialSupplierYard.value !== (selected?.name ?? '')
  calc.manufacturerYardId.value = selected?.id ?? null
  calc.materialSupplierYard.value = selected?.name ?? ''
  return changed
}

function setColor(
  selected: FillingAppearanceOptions['colors'][number] | undefined,
): boolean {
  if (props.side === 'facade') {
    const changed = !sameValue(calc.colorFacadeId.value, selected?.id)
      || calc.colorFacade.value !== (selected?.name ?? '')
      || calc.colorFacadeHex.value !== (selected?.hex ?? '')
      || calc.colorFacadeImage.value !== (selected?.image ?? '')
    calc.colorFacadeId.value = selected?.id ?? null
    calc.colorFacade.value = selected?.name ?? ''
    calc.colorFacadeHex.value = selected?.hex ?? ''
    calc.colorFacadeImage.value = selected?.image ?? ''
    return changed
  }

  const changed = !sameValue(calc.colorYardId.value, selected?.id)
    || calc.colorYard.value !== (selected?.name ?? '')
    || calc.colorYardHex.value !== (selected?.hex ?? '')
    || calc.colorYardImage.value !== (selected?.image ?? '')
  calc.colorYardId.value = selected?.id ?? null
  calc.colorYard.value = selected?.name ?? ''
  calc.colorYardHex.value = selected?.hex ?? ''
  calc.colorYardImage.value = selected?.image ?? ''
  return changed
}

function reconcileSelection(): void {
  const manufacturer = options.value.manufacturers.find(item => (
    sameValue(item.id, selectedManufacturerId.value)
  ))
  const color = options.value.colors.find(item => sameValue(item.id, selectedColorId.value))
  const manufacturerChanged = setManufacturer(manufacturer)
  const colorChanged = setColor(color)
  if (manufacturerChanged || colorChanged) emit('change')
}

async function loadOptions(): Promise<void> {
  const version = ++loadVersion
  loading.value = true
  try {
    const loaded = await getFillingAppearanceOptions(props.modelId, props.materialGroup)
    if (version !== loadVersion) return
    options.value = loaded
    reconcileSelection()
  } catch (error) {
    if (version !== loadVersion) return
    options.value = { manufacturers: [], colors: [] }
    console.warn('Варианты оформления заполнения недоступны:', error)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function onManufacturerChange(value: SelectValue): void {
  const selected = options.value.manufacturers.find(item => sameValue(item.id, value))
  if (setManufacturer(selected)) emit('change')
}

function onColorChange(value: SelectValue): void {
  const selected = options.value.colors.find(item => sameValue(item.id, value))
  if (setColor(selected)) emit('change')
}

watch(
  () => [props.modelId, props.materialGroup] as const,
  loadOptions,
  { immediate: true },
)

onBeforeUnmount(() => {
  loadVersion += 1
})
</script>

<template>
  <div class="appearance-fields">
    <label class="appearance-field">
      <span class="font-semibold">Производитель</span>
      <B24SelectMenu
        data-testid="appearance-manufacturer"
        :model-value="selectedManufacturerId"
        value-key="id"
        :items="manufacturerItems"
        placeholder="Не выбран"
        class="w-full"
        :disabled="loading"
        @update:model-value="onManufacturerChange"
      />
    </label>

    <label class="appearance-field">
      <span class="font-semibold">Цвет</span>
      <B24SelectMenu
        data-testid="appearance-color"
        :model-value="selectedColorId"
        value-key="id"
        :items="colorItems"
        placeholder="Не выбран"
        class="w-full"
        :disabled="loading"
        @update:model-value="onColorChange"
      />
    </label>

    <span v-if="loading" class="text-xs text-gray-400">Загрузка вариантов...</span>
  </div>
</template>

<style scoped>
.appearance-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  padding: 8px 4px;
}

@media (min-width: 768px) {
  .appearance-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.appearance-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}
</style>
