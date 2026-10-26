<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
  getType2ProfnastilFormOptions,
  saveWicketData,
  type ProfnastilFormOptions,
} from '../../../app/api/wicket'
import type { ProfnastilCoatingOption } from '../../../app/api/wicket.types'
import { parseFillingDrawingDescriptor } from '../../../app/api/fillingDrawingProfiles'
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
const loaded = ref(false)
const loadError = ref('')
const selectionEdited = ref(false)
const submitted = ref(false)
let requestRevision = 0
let disposed = false
const contextKey = computed(() => JSON.stringify([calc.orderId.value, calc.productRowId.value, calc.modelId.value, props.side,
  props.side === 'facade' ? calc.materialFacadeGlob.value : calc.materialYardGlob.value]))
onBeforeUnmount(() => { disposed = true; requestRevision++ })

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
  get: () => String((isFacade.value ? calc.colorFacade.value : calc.colorYard.value) ?? ''),
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
  || (selectedMaterialId.value && profile.value == null ? 'Не удалось восстановить связи материала. Выберите профиль и покрытие заново.' : '')
  || (loaded.value && !loading.value && !loadError.value && selectedMaterialId.value && !selectedMaterial.value
    ? 'Сохранённый материал недоступен. Выберите профиль и покрытие заново.' : ''))
const colorSettings = computed(() => {
  if (!selectedMaterial.value) return { mode: null, error: '' }
  try {
    return { mode: getProfnastilColorMode(selectedMaterial.value.colorInputMode), error: '' }
  } catch (error) {
    return { mode: null, error: error instanceof Error ? error.message : 'Некорректный режим цвета покрытия.' }
  }
})
const colorMode = computed(() => colorSettings.value.mode)
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
const colorSelectItems = computed(() => {
  const items = options.value.colors.map(item => ({ id: item.id, label: item.name }))
  if (dictionaryColorId.value && !allowedColor.value) {
    return [...items, { id: dictionaryColorId.value, label: `${colorName.value || `Цвет #${dictionaryColorId.value}`} (недоступен)`, disabled: true }]
  }
  return items
})
const printechSelectItems = computed(() =>
  getPrintechSelectItems(
    colorSelectItems.value,
    colorId.value == null || colorId.value === '' ? colorName.value : '',
  ),
)
const comboboxValue = computed(() => dictionaryColorId.value
  ?? (colorName.value.trim() ? `custom:${colorName.value.trim()}` : undefined))
const dictionaryColorId = computed<number | undefined>(() => {
  const value = Number(colorId.value)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
})
const hasColorId = computed(() => colorId.value != null && colorId.value !== '')
const allowedColor = computed(() => options.value.colors.some(item => String(item.id) === String(colorId.value)))
const colorDiagnostic = computed(() => {
  if (colorMode.value === 'list' && options.value.colors.length === 0) {
    return 'У покрытия нет доступных цветов. Проверьте настройки справочника.'
  }
  if (colorMode.value === 'none' && (hasColorId.value || colorName.value.trim())) {
    return 'Для этого покрытия цвет не выбирается. Выберите покрытие заново, чтобы очистить старый цвет.'
  }
  if (colorMode.value && hasColorId.value && !allowedColor.value) {
    return 'Сохранённый цвет недоступен для этого покрытия. Выберите цвет заново.'
  }
  return ''
})
const diagnostic = computed(() => loadError.value || colorSettings.value.error || selectionDiagnostic.value || colorDiagnostic.value)
const colorValid = computed(() => colorMode.value === 'none'
  ? !hasColorId.value && colorName.value.trim() === ''
  : hasColorId.value ? allowedColor.value : colorMode.value === 'combobox' && colorName.value.trim() !== '')
const valid = computed(() =>
  loaded.value && !loading.value && !diagnostic.value
  && profile.value !== null
  && selectedMaterial.value !== undefined
  && colorMode.value !== null && colorValid.value,
)

async function load(profileValue: number | null, coatingValue: number | null) {
  const revision = ++requestRevision
  const context = contextKey.value
  const current = () => !disposed && revision === requestRevision && context === contextKey.value
  loading.value = true
  loadError.value = ''
  try {
    const result = await getType2ProfnastilFormOptions(profileValue ?? undefined, coatingValue ?? undefined)
    if (!current()) return false
    options.value = result
    loaded.value = true
    return true
  } catch (error) {
    if (!current()) return false
    loadError.value = error instanceof Error ? error.message : 'Не удалось загрузить справочник покрытий.'
    return false
  } finally {
    if (current()) loading.value = false
  }
}

watch(contextKey, () => {
  requestRevision++
  options.value = { profiles: [], coatings: [], manufacturers: [], colors: [] }
  loaded.value = false
  void load(profile.value, coating.value)
})

function setDrawingProfile(material: ProfnastilCoatingOption | null) {
  const descriptor = material === null ? { profile: null, problem: null }
    : parseFillingDrawingDescriptor(material.drawingProfile, material.drawingProfileProblem)
  if (isFacade.value) {
    calc.fillingProfileFacade.value = descriptor.profile
    calc.fillingProfileFacadeProblem.value = descriptor.problem
  } else {
    calc.fillingProfileYard.value = descriptor.profile
    calc.fillingProfileYardProblem.value = descriptor.problem
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
  setDrawingProfile(null)
  coating.value = null
  clearColor()
  if (isFacade.value) calc.idFacade.value = ''
  else calc.idYard.value = ''
  if (await load(profile.value, null)) await save()
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
  selectionEdited.value = true
  coating.value = material.id
  applyMaterial(material)
  clearColor()
  if (await load(profile.value, coating.value)) await onCoatingChange()
}

function applyMaterial(selected: ProfnastilCoatingOption) {
  setDrawingProfile(selected)
  const profileName = options.value.profiles.find(item => Number(item.id) === profile.value)?.name ?? ''
  if (isFacade.value) {
    calc.materialFacade.value = profileName
    calc.typeOfCoatingFacade.value = selected.name
    calc.idFacade.value = selected.profnastilId
    calc.thicknessFacade.value = String(selected.thickness)
    calc.coatingFacadeHex.value = selected.coatingHex ?? ''
    calc.coatingFacadeImage.value = selected.coatingImage ?? ''
    calc.reliefFacadeImage.value = selected.reliefImage ?? ''
    calc.reliefFacadeAlongMode.value = selected.reliefAlongMode ?? 'stretch'
    calc.reliefFacadeAcrossMode.value = selected.reliefAcrossMode ?? 'repeat'
  } else {
    calc.materialYard.value = profileName
    calc.typeOfCoatingYard.value = selected.name
    calc.idYard.value = selected.profnastilId
    calc.thicknessYard.value = String(selected.thickness)
    calc.coatingYardHex.value = selected.coatingHex ?? ''
    calc.coatingYardImage.value = selected.coatingImage ?? ''
    calc.reliefYardImage.value = selected.reliefImage ?? ''
    calc.reliefYardAlongMode.value = selected.reliefAlongMode ?? 'stretch'
    calc.reliefYardAcrossMode.value = selected.reliefAcrossMode ?? 'repeat'
  }
}

async function onCoatingChange() {
  clearColor()
  const selected = selectedMaterial.value
  if (selected) applyMaterial(selected)
  // A list/combobox choice is only persisted once its required color is complete.
  if (valid.value) await save()
}

async function onColorChange() {
  selectionEdited.value = true
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
  } else {
    clearColor()
  }
  if (valid.value) await save()
}

async function onPrintechColorChange(value: number | string | null) {
  const selected = options.value.colors.find(item => typeof value === 'number' && item.id === value)
  if (selected) {
    colorId.value = selected.id
    await onColorChange()
  } else if (value === `custom:${colorName.value.trim()}`) {
    await onCustomColorCreate(colorName.value)
  }
}

async function onCustomColorCreate(value: string) {
  selectionEdited.value = true
  clearColor()
  colorName.value = String(value).trim()
  if (valid.value) await save()
}

async function onDictionaryColorChange(value: number | undefined) {
  colorId.value = value ?? null
  await onColorChange()
}

async function save() {
  if (loading.value || loadError.value || colorSettings.value.error) return
  if (selectionEdited.value && selectedMaterialId.value && !valid.value) return
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
  selectionEdited.value = false
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
    <p v-if="diagnostic" role="alert" class="text-red-600">{{ diagnostic }}</p>
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

    <label v-if="colorMode === 'list'" class="form-field">
      <span class="font-semibold">Цвет <span class="text-red-600">*</span></span>
      <B24SelectMenu
        :model-value="dictionaryColorId"
        value-key="id"
        :items="colorSelectItems"
        placeholder="Выберите цвет"
        class="w-full"
        :b24ui="{ content: 'z-50' }"
        :disabled="loading || !!loadError"
        @update:model-value="onDictionaryColorChange"
      />
      <span v-if="submitted && !colorValid" class="text-sm text-red-600">Выберите цвет</span>
    </label>

    <label v-else-if="colorMode === 'combobox'" class="form-field">
      <span class="font-semibold">Цвет / текстура <span class="text-red-600">*</span></span>
      <B24InputMenu
        :model-value="comboboxValue"
        value-key="id"
        :items="printechSelectItems"
        create-item="always"
        placeholder="Выберите или введите название"
        class="w-full"
        :disabled="loading || !!loadError"
        :content="{ side: 'bottom', align: 'start', sideOffset: 4, avoidCollisions: false }"
        @update:model-value="onPrintechColorChange"
        @create="onCustomColorCreate"
      />
      <span v-if="submitted && !colorValid" class="text-sm text-red-600">Укажите цвет или текстуру</span>
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
