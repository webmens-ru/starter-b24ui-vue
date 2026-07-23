<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getType2ProfnastilFormOptions,
  saveWicketData,
  type ProfnastilFormOptions,
} from '../../../app/api/wicket'
import { useCalculation } from '../../../composables/useCalculation'
import { getProfnastilColorMode } from './type2ProfnastilForm'

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
  <div class="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="grid gap-5">
      <label class="grid gap-1.5">
        <span class="font-semibold">Тип профиля <span class="text-red-600">*</span></span>
        <select v-model="profile" class="form-control" :disabled="loading" @change="onProfileChange">
          <option value="">Выберите тип профиля</option>
          <option v-for="item in options.profiles" :key="item.id" :value="item.name">{{ item.name }}</option>
        </select>
        <span v-if="submitted && !profile" class="text-sm text-red-600">Выберите тип профиля</span>
      </label>

      <label class="grid gap-1.5">
        <span class="font-semibold">Производитель</span>
        <select v-model="manufacturerId" class="form-control" :disabled="loading" @change="save">
          <option :value="null">Не выбран</option>
          <option v-for="item in options.manufacturers" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>

      <label class="grid gap-1.5">
        <span class="font-semibold">Тип покрытия <span class="text-red-600">*</span></span>
        <select v-model="coating" class="form-control" :disabled="loading || !profile" @change="onCoatingChange">
          <option value="">Выберите тип покрытия</option>
          <option v-for="item in options.coatings" :key="item.id" :value="item.name">{{ item.name }}</option>
        </select>
        <span v-if="submitted && !coating" class="text-sm text-red-600">Выберите тип покрытия</span>
      </label>

      <label v-if="colorMode === 'list'" class="grid gap-1.5">
        <span class="font-semibold">Цвет <span class="text-red-600">*</span></span>
        <select v-model="colorId" class="form-control" @change="onColorChange">
          <option :value="null">Выберите цвет</option>
          <option v-for="item in options.colors" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <span v-if="submitted && !colorName" class="text-sm text-red-600">Выберите цвет</span>
      </label>

      <label v-else-if="colorMode === 'combobox'" class="grid gap-1.5">
        <span class="font-semibold">Цвет / название Printech <span class="text-red-600">*</span></span>
        <input
          v-model="colorName"
          class="form-control"
          list="type2-profnastil-colors"
          placeholder="Выберите или введите название"
          @change="onColorChange"
        >
        <datalist id="type2-profnastil-colors">
          <option v-for="item in options.colors" :key="item.id" :value="item.name" />
        </datalist>
        <span v-if="submitted && !colorName.trim()" class="text-sm text-red-600">Укажите цвет или название Printech</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.form-control {
  width: 100%;
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  padding: 8px 12px;
}
.form-control:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}
</style>
