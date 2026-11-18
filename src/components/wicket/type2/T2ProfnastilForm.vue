<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
  getType2ProfnastilFormOptions,
  getProfnastilTable,
  getProfnastilColors,
  type ProfnastilRow,
  type SidingPagination,
  saveWicketData,
  type ProfnastilFormOptions,
} from '../../../app/api/wicket'
import type { ProfnastilCoatingOption } from '../../../app/api/wicket.types'
import { parseFillingDrawingDescriptor } from '../../../app/api/fillingDrawingProfiles'
import { useCalculation } from '../../../composables/useCalculation'
import ProfnastilMaterialTable from '../shared/ProfnastilMaterialTable.vue'
import T2ProfnastilFields from './T2ProfnastilFields.vue'

const props = defineProps<{ side: 'facade' | 'yard'; tableMode?: boolean }>()
const calc = useCalculation()
const options = ref<ProfnastilFormOptions>({
  profiles: [],
  coatings: [],
  manufacturers: [],
  colors: [],
})
const tableRows = ref<ProfnastilRow[]>([])
const tableFilters = ref({ profnastilForm: [] as string[], materials: [] as string[], typeOfCoating: [] as string[] })
const tablePagination = ref<SidingPagination>({ page: 1, pageSize: 100, pageCount: 1, totalCount: 0 })
const tableLoading = ref(false)
const tableError = ref('')
let tableRevision = 0
const loading = ref(false)
const paletteLoading = ref(false)
let paletteRevision = 0
const loaded = ref(false)
const loadError = ref('')
const selectionEdited = ref(false)
const submitted = ref(false)
let requestRevision = 0
let disposed = false
const contextKey = computed(() => JSON.stringify([calc.orderId.value, calc.productRowId.value, calc.modelId.value, props.side,
  props.side === 'facade' ? calc.materialFacadeGlob.value : calc.materialYardGlob.value]))
onBeforeUnmount(() => { disposed = true; requestRevision++; tableRevision++; paletteRevision++ })

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
const fieldBindings = computed(() => ({
  showMaterialSelectors: !props.tableMode,
  profile: profile.value,
  profileSelectItems: profileSelectItems.value,
  selectedMaterialId: selectedMaterialId.value,
  coating: coating.value,
  coatingSelectItems: coatingSelectItems.value,
  dictionaryColorId: dictionaryColorId.value,
  colorSelectItems: colorSelectItems.value,
  loading: loading.value || paletteLoading.value,
  loadError: loadError.value,
  submitted: submitted.value,
  colorValid: colorValid.value,
  onProfileChange: onProfileSelectChange,
  onCoatingChange: onCoatingSelectChange,
  onDictionaryColorChange,
}))
const selectedMaterial = computed(() => options.value.coatings.find(item => String(item.profnastilId) === String(selectedMaterialId.value)))
async function loadPalette(): Promise<void> {
  const revision = ++paletteRevision
  const context = contextKey.value
  const materialId = selectedMaterialId.value
  const current = () => !disposed && revision === paletteRevision && context === contextKey.value && materialId === selectedMaterialId.value
  paletteLoading.value = true
  options.value.colors = []
  try {
    const result = await getProfnastilColors(calc.modelId.value, materialId)
    if (current()) options.value.colors = result.colors
  } catch {
    if (current()) loadError.value = 'Не удалось загрузить палитру материала.'
  } finally {
    if (current()) paletteLoading.value = false
  }
}
watch([contextKey, selectedMaterialId], () => { void loadPalette() }, { immediate: true })
const selectionDiagnostic = computed(() => calc.materialSelectionProblems.value
  .filter(problem => problem.side === props.side).map(problem => problem.message).join(' ')
  || (selectedMaterialId.value && profile.value == null ? 'Не удалось восстановить связи материала. Выберите профиль и покрытие заново.' : '')
  || (loaded.value && !loading.value && !loadError.value && selectedMaterialId.value && !selectedMaterial.value
    ? 'Сохранённый материал недоступен. Выберите профиль и покрытие заново.' : ''))
const profileSelectItems = computed(() =>
  options.value.profiles.map(item => ({ id: item.id, label: item.name })),
)
const coatingSelectItems = computed(() =>
  options.value.coatings.map(item => ({ id: item.profnastilId, label: `${item.name} — ${item.thickness} мм` })),
)
const colorSelectItems = computed(() => {
  const items = options.value.colors.map(item => ({ id: item.id, label: item.label ?? item.name, hex: item.hex }))
  if (dictionaryColorId.value && !allowedColor.value) {
    return [...items, { id: dictionaryColorId.value, label: `${colorName.value || `Цвет #${dictionaryColorId.value}`} (недоступен)`, disabled: true }]
  }
  return items
})
const dictionaryColorId = computed<number | undefined>(() => {
  const value = Number(colorId.value)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
})
const hasColorId = computed(() => colorId.value != null && colorId.value !== '')
const allowedColor = computed(() => options.value.colors.some(item => String(item.id) === String(colorId.value)))
const colorDiagnostic = computed(() => {
  if (selectedMaterial.value && options.value.colors.length === 0) {
    return 'У материала нет доступных цветов. Проверьте настройки справочника.'
  }
  if (selectedMaterial.value && hasColorId.value && !allowedColor.value) {
    return 'Сохранённый цвет недоступен для этого материала. Выберите цвет заново.'
  }
  return ''
})
const diagnostic = computed(() => tableError.value || loadError.value || selectionDiagnostic.value || colorDiagnostic.value)
const colorValid = computed(() => hasColorId.value && allowedColor.value)
const valid = computed(() =>
  loaded.value && !loading.value && !paletteLoading.value && !diagnostic.value
  && profile.value !== null
  && selectedMaterial.value !== undefined
  && colorValid.value,
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
    options.value = { ...result, colors: options.value.colors }
    loaded.value = true
    return true
  } catch (error) {
    if (!current()) return false
    loadError.value = 'Не удалось загрузить справочник покрытий.'
    return false
  } finally {
    if (current()) loading.value = false
  }
}

watch(contextKey, () => {
  requestRevision++
  options.value = { profiles: [], coatings: [], manufacturers: [], colors: [] }
  tableRows.value = []
  loaded.value = false
  void load(profile.value, coating.value)
  void loadTable()
})

async function loadTable(page = 1): Promise<void> {
  if (!props.tableMode) return
  const revision = ++tableRevision
  const context = contextKey.value
  const current = () => !disposed && revision === tableRevision && context === contextKey.value
  tableLoading.value = true
  tableError.value = ''
  try {
    const result = await getProfnastilTable(calc.modelId.value, tableFilters.value, page)
    if (!current()) return
    tableRows.value = result.table
    tablePagination.value = result.pagination
  } catch {
    if (current()) tableError.value = 'Не удалось загрузить материалы заполнения. Повторите загрузку.'
  } finally {
    if (current()) tableLoading.value = false
  }
}
watch(tableFilters, () => { void loadTable() }, { deep: true })
const tableSelection = computed<ProfnastilRow | null>(() => {
  if (!selectedMaterialId.value) return null
  return tableRows.value.find(row => String(row.id) === String(selectedMaterialId.value)) ?? {
    id: selectedMaterialId.value,
    drawingProfile: isFacade.value ? calc.fillingProfileFacade.value : calc.fillingProfileYard.value,
    drawingProfileProblem: isFacade.value ? calc.fillingProfileFacadeProblem.value : calc.fillingProfileYardProblem.value,
    name: isFacade.value ? calc.materialFacade.value : calc.materialYard.value,
    material: isFacade.value ? calc.materialFacade.value : calc.materialYard.value,
    thickness: isFacade.value ? calc.thicknessFacade.value : calc.thicknessYard.value,
    typeOfCoating: isFacade.value ? calc.typeOfCoatingFacade.value : calc.typeOfCoatingYard.value,
  }
})
function deselectTableRow(): void {
  selectionEdited.value = true
  if (isFacade.value) calc.resetFacadeFilling()
  else calc.resetYardFilling()
}
async function selectTableRow(row: ProfnastilRow): Promise<void> {
  const profileId = Number(row.profileTypeId)
  const coatingId = Number(row.typeOfCoatingId)
  if (!Number.isSafeInteger(profileId) || profileId < 1 || !Number.isSafeInteger(coatingId) || coatingId < 1) {
    tableError.value = 'У материала не заданы связи профиля и покрытия. Проверьте справочник.'
    return
  }
  if (String(row.id) === String(selectedMaterialId.value)) return
  deselectTableRow()
  profile.value = profileId
  coating.value = coatingId
  if (!await load(profileId, coatingId)) return
  const material = options.value.coatings.find(item => String(item.profnastilId) === String(row.id))
  if (!material) {
    tableError.value = 'Выбранный материал недоступен. Повторите загрузку.'
    return
  }
  tableError.value = ''
  calc.materialSelectionProblems.value = calc.materialSelectionProblems.value.filter(problem => problem.side !== props.side)
  applyMaterial(material)
  applyManufacturer(row.manufacturerId, row.manufacturerName)
  if (valid.value) await save()
}

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
  applyManufacturer(null, null)
  clearColor()
  if (isFacade.value) calc.idFacade.value = ''
  else calc.idYard.value = ''
  if (await load(profile.value, null)) await save()
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

function applyManufacturer(id: number | null | undefined, name: string | null | undefined): void {
  manufacturerId.value = id ?? null
  if (isFacade.value) calc.materialSupplierFacade.value = name ?? ''
  else calc.materialSupplierYard.value = name ?? ''
}

function applyMaterial(selected: ProfnastilCoatingOption) {
  if (String(selected.profnastilId) !== String(selectedMaterialId.value)) {
    applyManufacturer(selected.manufacturerId, selected.manufacturerName)
  }
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
  // Persist a material choice only once its assigned palette color is complete.
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

async function onDictionaryColorChange(value: number | undefined) {
  colorId.value = value ?? null
  await onColorChange()
}

async function save() {
  if (loading.value || loadError.value) return
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
  await Promise.all([load(profile.value, coating.value), loadTable()])
})
</script>

<template>
  <div class="profnastil-form">
    <ProfnastilMaterialTable
      v-if="tableMode" class="col-span-full" :model-id="calc.modelId.value"
      :rows="tableRows" :selected-row="tableSelection" :loading="tableLoading || loading"
      v-model:filters="tableFilters" :pagination="tablePagination"
      @select="selectTableRow" @deselect="deselectTableRow" @page="loadTable"
    >
      <template #appearance>
        <T2ProfnastilFields v-bind="fieldBindings" />
      </template>
    </ProfnastilMaterialTable>
    <button v-if="tableMode && tableError" type="button" class="col-span-full" @click="loadTable()">Повторить загрузку</button>
    <p v-if="submitted && tableMode && !selectedMaterialId" role="alert" class="col-span-full text-red-600">Выберите материал заполнения</p>
    <p v-if="diagnostic" role="alert" class="col-span-full text-red-600">{{ diagnostic }}</p>
    <T2ProfnastilFields v-if="!tableMode" class="col-span-full" v-bind="fieldBindings" />
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
