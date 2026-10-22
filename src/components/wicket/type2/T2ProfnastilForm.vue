<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getType2ProfnastilFormOptions,
  saveWicketData,
  type ProfnastilFormOptions,
} from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import { getPrintechSelectItems, getProfnastilColorMode } from './type2ProfnastilForm'
import { hasRequiredFillingColor } from '../shared/fillingColorValidation'

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
  get: () => isFacade.value ? calc.profileTypeFacadeId.value : calc.profileTypeYardId.value,
  set: value => {
    if (isFacade.value) calc.profileTypeFacadeId.value = value
    else calc.profileTypeYardId.value = value
  },
})
const coating = computed({
  get: () => isFacade.value ? calc.typeOfCoatingFacadeId.value : calc.typeOfCoatingYardId.value,
  set: value => {
    if (isFacade.value) calc.typeOfCoatingFacadeId.value = value
    else calc.typeOfCoatingYardId.value = value
  },
})
const manufacturerId = computed({
  get: () => isFacade.value ? calc.manufacturerFacadeId.value : calc.manufacturerYardId.value,
  set: value => {
    if (isFacade.value) calc.manufacturerFacadeId.value = value
    else calc.manufacturerYardId.value = value
  },
})
const colorId = computed({
  get: () => isFacade.value ? calc.colorFacadeId.value : calc.colorYardId.value,
  set: value => {
    if (isFacade.value) calc.colorFacadeId.value = value
    else calc.colorYardId.value = value
  },
})
const colorName = computed({
  get: () => String(isFacade.value ? calc.colorFacade.value : calc.colorYard.value),
  set: value => {
    if (isFacade.value) calc.colorFacade.value = value
    else calc.colorYard.value = value
  },
})
const selectedMaterialId = computed<number | undefined>(() => {
  const value = Number(isFacade.value ? calc.idFacade.value : calc.idYard.value)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
})
const selectedMaterial = computed(() => options.value.coatings.find(item => String(item.profnastilId) === String(selectedMaterialId.value)))
const selectionDiagnostic = computed(() => calc.materialSelectionProblems.value
  .filter(problem => problem.side === props.side).map(problem => problem.message).join(' ')
  || (selectedMaterialId.value && profile.value == null ? 'Не удалось восстановить связи материала. Выберите профиль и покрытие заново.' : ''))
// Existing display-name color modes are remediated separately in stage 3.
const colorMode = computed(() => getProfnastilColorMode(selectedMaterial.value?.name ?? ''))
const manufacturerSelectItems = computed(() => [
  { id: '', label: 'Не выбран' },
  ...options.value.manufacturers.map(item => ({ id: item.id, label: item.name })),
])
const profileSelectItems = computed(() =>
  options.value.profiles.map(item => ({ id: item.id, label: item.name })),
)
const coatingSelectItems = computed(() =>
  options.value.coatings.map(item => ({ id: item.profnastilId, label: `${item.name} — ${item.thickness} мм` })),
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
  profile.value !== null
  && selectedMaterial.value !== undefined
  && hasRequiredFillingColor(colorId.value, colorName.value, colorMode.value === 'combobox'),
)

async function load(profileValue: number | null, coatingValue: number | null) {
  loading.value = true
  try {
    options.value = await getType2ProfnastilFormOptions(profileValue ?? undefined, coatingValue ?? undefined)
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
  coating.value = null
  clearColor()
  if (isFacade.value) calc.idFacade.value = ''
  else calc.idYard.value = ''
  await load(profile.value, null)
  await save()
}

async function onManufacturerChange(value: string | number | undefined) {
  manufacturerId.value = value === '' || value === undefined ? null : value
  await save()
}

async function onProfileSelectChange(value: string | number | undefined) {
  calc.materialSelectionProblems.value = calc.materialSelectionProblems.value.filter(problem => problem.side !== props.side)
  const id = Number(value)
  profile.value = options.value.profiles.some(item => Number(item.id) === id) ? id : null
  const label = options.value.profiles.find(item => Number(item.id) === profile.value)?.name ?? ''
  if (isFacade.value) {
    calc.materialFacade.value = label
    calc.typeOfCoatingFacade.value = ''
  } else {
    calc.materialYard.value = label
    calc.typeOfCoatingYard.value = ''
  }
  await onProfileChange()
}

async function onCoatingSelectChange(value: string | number | undefined) {
  const material = options.value.coatings.find(item => String(item.profnastilId) === String(value))
  if (!material) return
  coating.value = material.id
  if (isFacade.value) calc.idFacade.value = material.profnastilId
  else calc.idYard.value = material.profnastilId
  await load(profile.value, coating.value)
  await onCoatingChange()
}

async function onCoatingChange() {
  clearColor()
  const selected = selectedMaterial.value
  if (selected) {
    const profileName = options.value.profiles.find(item => Number(item.id) === profile.value)?.name ?? ''
    if (isFacade.value) {
      calc.materialFacade.value = profileName
      calc.typeOfCoatingFacade.value = selected.name
      calc.idFacade.value = selected.profnastilId
      calc.thicknessFacade.value = String(selected.thickness)
      calc.coatingFacadeHex.value = selected.coatingHex ?? ''
      calc.coatingFacadeImage.value = selected.coatingImage ?? ''
      calc.reliefFacadeImage.value = selected.reliefImage ?? ''
    } else {
      calc.materialYard.value = profileName
      calc.typeOfCoatingYard.value = selected.name
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
    String(item.id) === String(colorId.value),
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
    [`material${suffix}`]: isFacade.value ? calc.materialFacade.value : calc.materialYard.value,
    [`manufacturer${suffix}Id`]: manufacturerId.value || null,
    [`typeOfCoating${suffix}`]: isFacade.value ? calc.typeOfCoatingFacade.value : calc.typeOfCoatingYard.value,
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
  await load(profile.value, coating.value)
})
</script>

<template>
  <div class="profnastil-form">
    <p v-if="selectionDiagnostic" role="alert" class="text-red-600">{{ selectionDiagnostic }}</p>
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
          :model-value="selectedMaterialId || undefined"
          value-key="id"
          :items="coatingSelectItems"
          placeholder="Выберите тип покрытия"
          class="w-full"
          :disabled="loading || !profile"
          @update:model-value="onCoatingSelectChange"
        />
        <span v-if="submitted && !coating" class="text-sm text-red-600">Выберите тип покрытия</span>
    </label>

    <label v-if="colorMode !== 'combobox'" class="form-field">
      <span class="font-semibold">Цвет <span class="text-red-600">*</span></span>
      <B24SelectMenu
        :model-value="dictionaryColorId"
        value-key="id"
        :items="colorSelectItems"
        placeholder="Выберите цвет"
        class="w-full"
        :b24ui="{ content: 'z-50' }"
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
