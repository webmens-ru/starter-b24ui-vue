<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getType2ProfnastilFormOptions,
  saveWicketData,
  type ProfnastilFormOptions,
} from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import { getPrintechSelectItems, getProfnastilColorMode } from './type2ProfnastilForm'

const props = defineProps<{ side: 'facade' | 'yard' }>()
const calc = useCalculation()
const options = ref<ProfnastilFormOptions>({
  profiles: [],
  coatings: [],
  manufacturers: [],
  colors: [],
})
const loading = ref(false)
const submitted = ref(false)

const isFacade = computed(() => props.side === 'facade')
const profile = computed({
  get: () => String(isFacade.value ? calc.materialFacade.value : calc.materialYard.value),
  set: value => { isFacade.value ? (calc.materialFacade.value = value) : (calc.materialYard.value = value) },
})
const coating = computed({
  get: () => String(isFacade.value ? calc.typeOfCoatingFacade.value : calc.typeOfCoatingYard.value),
  set: value => { isFacade.value ? (calc.typeOfCoatingFacade.value = value) : (calc.typeOfCoatingYard.value = value) },
})
const manufacturerId = computed({
  get: () => isFacade.value ? calc.manufacturerFacadeId.value : calc.manufacturerYardId.value,
  set: value => { isFacade.value ? (calc.manufacturerFacadeId.value = value) : (calc.manufacturerYardId.value = value) },
})
const colorId = computed({
  get: () => isFacade.value ? calc.colorFacadeId.value : calc.colorYardId.value,
  set: value => { isFacade.value ? (calc.colorFacadeId.value = value) : (calc.colorYardId.value = value) },
})
const colorName = computed({
  get: () => String(isFacade.value ? calc.colorFacade.value : calc.colorYard.value),
  set: value => { isFacade.value ? (calc.colorFacade.value = value) : (calc.colorYard.value = value) },
})
const colorMode = computed(() => getProfnastilColorMode(coating.value))
const colorRequired = computed(() => colorMode.value !== 'none')
const manufacturerSelectItems = computed(() => [
  { id: '', label: 'Не выбран' },
  ...options.value.manufacturers.map(item => ({ id: item.id, label: item.name })),
])
const profileSelectItems = computed(() =>
  options.value.profiles.map(item => ({ id: item.name, label: item.name })),
)
const coatingSelectItems = computed(() =>
  options.value.coatings.map(item => ({ id: item.name, label: item.name })),
)
const selectedManufacturerId = computed<string | number>(() => manufacturerId.value ?? '')
const colorSelectItems = computed(() =>
  options.value.colors.map(item => ({ id: item.id, label: item.name })),
)
const printechSelectItems = computed(() =>
  getPrintechSelectItems(
    options.value.colors.map(item => item.name),
    colorName.value,
  ),
)
const dictionaryColorId = computed<number | undefined>(() => {
  const value = Number(colorId.value)
  return Number.isFinite(value) && value > 0 ? value : undefined
})
const valid = computed(() =>
  profile.value.trim() !== ''
  && coating.value.trim() !== ''
  && (!colorRequired.value || colorName.value.trim() !== ''),
)

async function load(profileValue?: string) {
  loading.value = true
  try {
    options.value = await getType2ProfnastilFormOptions(profileValue)
  } finally {
    loading.value = false
  }
}

function clearColor() {
  colorId.value = null
  colorName.value = ''
  if (isFacade.value) {
    calc.colorFacadeHex.value = ''
    calc.colorFacadeImage.value = ''
  } else {
    calc.colorYardHex.value = ''
    calc.colorYardImage.value = ''
  }
}

async function onProfileChange() {
  coating.value = ''
  clearColor()
  if (isFacade.value) calc.idFacade.value = ''
  else calc.idYard.value = ''
  await load(profile.value)
  await save()
}

async function onManufacturerChange(value: string | number | undefined) {
  manufacturerId.value = value === '' || value === undefined ? null : value
  await save()
}

async function onProfileSelectChange(value: string | number | undefined) {
  profile.value = String(value ?? '')
  await onProfileChange()
}

async function onCoatingSelectChange(value: string | number | undefined) {
  coating.value = String(value ?? '')
  await onCoatingChange()
}

async function onCoatingChange() {
  clearColor()
  const selected = options.value.coatings.find(item => item.id === coating.value)
  if (selected) {
    if (isFacade.value) {
      calc.idFacade.value = selected.profnastilId
      calc.thicknessFacade.value = String(selected.thickness)
      calc.coatingFacadeHex.value = selected.coatingHex ?? ''
      calc.coatingFacadeImage.value = selected.coatingImage ?? ''
      calc.reliefFacadeImage.value = selected.reliefImage ?? ''
    } else {
      calc.idYard.value = selected.profnastilId
      calc.thicknessYard.value = String(selected.thickness)
      calc.coatingYardHex.value = selected.coatingHex ?? ''
      calc.coatingYardImage.value = selected.coatingImage ?? ''
      calc.reliefYardImage.value = selected.reliefImage ?? ''
    }
  }
  await save()
}

async function onColorChange() {
  const selected = options.value.colors.find(item =>
    String(item.id) === String(colorId.value) || item.name === colorName.value.trim(),
  )
  if (selected) {
    colorId.value = selected.id
    colorName.value = selected.name
    if (isFacade.value) {
      calc.colorFacadeHex.value = selected.hex ?? ''
      calc.colorFacadeImage.value = selected.image ?? ''
    } else {
      calc.colorYardHex.value = selected.hex ?? ''
      calc.colorYardImage.value = selected.image ?? ''
    }
  } else if (colorMode.value === 'combobox') {
    colorId.value = null
  }
  await save()
}

async function onPrintechColorChange(value: number | string | null) {
  const manualValue = String(value ?? '').trim()
  const selected = options.value.colors.find(item =>
    String(item.id) === String(value) || item.name === manualValue,
  )
  if (selected) {
    colorId.value = selected.id
    colorName.value = selected.name
  } else {
    colorId.value = null
    colorName.value = manualValue
  }
  await onColorChange()
}

async function onDictionaryColorChange(value: number | undefined) {
  colorId.value = value ?? null
  await onColorChange()
}

async function save() {
  const suffix = isFacade.value ? 'Facade' : 'Yard'
  await saveWicketData({
    ...calc.getBaseSavePayload(),
    [`id${suffix}`]: isFacade.value ? calc.idFacade.value || null : calc.idYard.value || null,
    [`material${suffix}`]: profile.value,
    [`manufacturer${suffix}Id`]: manufacturerId.value || null,
    [`typeOfCoating${suffix}`]: coating.value,
    [`color${suffix}Id`]: colorId.value || null,
    [`color${suffix}`]: colorName.value.trim(),
    [`thickness${suffix}`]: isFacade.value ? calc.thicknessFacade.value : calc.thicknessYard.value,
  })
}

async function validate(): Promise<boolean> {
  submitted.value = true
  if (valid.value) await save()
  return valid.value
}

defineExpose({ validate })

onMounted(async () => {
  await load(profile.value || undefined)
})
</script>

<template>
  <div class="profnastil-form">
    <label class="form-field">
      <span class="font-semibold">Производитель</span>
      <B24SelectMenu
        :model-value="selectedManufacturerId"
        value-key="id"
        :items="manufacturerSelectItems"
        placeholder="Не выбран"
        class="w-full"
        :disabled="loading"
        @update:model-value="onManufacturerChange"
      />
    </label>

    <label class="form-field">
      <span class="font-semibold">Тип профиля <span class="text-red-600">*</span></span>
      <B24SelectMenu
        :model-value="profile || undefined"
        value-key="id"
        :items="profileSelectItems"
        placeholder="Выберите тип профиля"
        class="w-full"
        :disabled="loading"
        @update:model-value="onProfileSelectChange"
      />
      <span v-if="submitted && !profile" class="text-sm text-red-600">Выберите тип профиля</span>
    </label>

    <label class="form-field">
        <span class="font-semibold">Тип покрытия <span class="text-red-600">*</span></span>
        <B24SelectMenu
          :model-value="coating || undefined"
          value-key="id"
          :items="coatingSelectItems"
          placeholder="Выберите тип покрытия"
          class="w-full"
          :disabled="loading || !profile"
          @update:model-value="onCoatingSelectChange"
        />
        <span v-if="submitted && !coating" class="text-sm text-red-600">Выберите тип покрытия</span>
    </label>

    <label v-if="colorMode === 'list'" class="form-field">
      <span class="font-semibold">Цвет <span class="text-red-600">*</span></span>
      <B24SelectMenu
        :model-value="dictionaryColorId"
        value-key="id"
        :items="colorSelectItems"
        placeholder="Выберите цвет"
        class="w-full"
        @update:model-value="onDictionaryColorChange"
      />
      <span v-if="submitted && !colorName" class="text-sm text-red-600">Выберите цвет</span>
    </label>

    <label v-else-if="colorMode === 'combobox'" class="form-field">
      <span class="font-semibold">Цвет / название Printech <span class="text-red-600">*</span></span>
      <B24InputMenu
        :model-value="colorName"
        :items="printechSelectItems"
        create-item="always"
        placeholder="Выберите или введите название"
        class="w-full"
        :content="{ side: 'bottom', align: 'start', sideOffset: 4, avoidCollisions: false }"
        @update:model-value="onPrintechColorChange"
        @create="onPrintechColorChange"
      />
      <span v-if="submitted && !colorName.trim()" class="text-sm text-red-600">Укажите цвет или название Printech</span>
    </label>
  </div>
</template>

<style scoped>
.profnastil-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  padding: 8px 4px;
}
@media (min-width: 768px) {
  .profnastil-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.form-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}
</style>
