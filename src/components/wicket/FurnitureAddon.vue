<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'
import ImageViewer from './ImageViewer.vue'

interface AddonConfig {
  key: 'doorCloser' | 'bumper' | 'skud'
  title: string
  page: string
  saveKeys: { isThere: string; id: string; provided: string; installed: string }
}
const props = defineProps<{ config: AddonConfig }>()
const emit = defineEmits<{ (e: 'next'): void; (e: 'back'): void }>()

const calc = useCalculation()
const items = computed(() => calc.addonItems.value[props.config.key])

const isThereName = ref<string>(calc.addons.value[props.config.key].isThere === 1 ? 'Будет' : 'Не будет')
const provided = ref<string>(calc.addons.value[props.config.key].provided || 'Предоставляет изготовитель')
const installed = ref<string>(calc.addons.value[props.config.key].installed || 'Устанавливает изготовитель')
const selectedId = ref<number | null>(calc.addons.value[props.config.key].itemId)

const showDetails = computed(() => isThereName.value === 'Будет')
const showSelection = computed(() => provided.value === 'Предоставляет изготовитель')

const providedOptions = [
  { value: 'Предоставляет изготовитель', label: 'Предоставляет изготовитель' },
  { value: 'Предоставляет заказчик', label: 'Предоставляет заказчик' },
]
const installedOptions = [
  { value: 'Устанавливает изготовитель', label: 'Устанавливает изготовитель' },
  { value: 'Устанавливает заказчик', label: 'Устанавливает заказчик' },
]

function sync() {
  const st = calc.addons.value[props.config.key]
  st.isThere = isThereName.value === 'Будет' ? 1 : 0
  if (showDetails.value) {
    st.provided = provided.value
    st.installed = installed.value
    if (showSelection.value) {
      st.itemId = selectedId.value
      st.marking = items.value.find(i => i.id === selectedId.value)?.marking ?? ''
    } else {
      st.itemId = null; st.marking = ''
    }
  } else {
    st.provided = ''; st.installed = ''; st.itemId = null; st.marking = ''
  }
}

function buildBlock() {
  const st = calc.addons.value[props.config.key]
  const params: { name: string; value: string }[] = [{ name: props.config.title, value: isThereName.value }]
  if (showDetails.value) {
    params.push({ name: 'Предоставляет', value: st.provided })
    params.push({ name: 'Устанавливает', value: st.installed })
    if (showSelection.value && st.itemId != null && st.marking) {
      params.push({ name: 'Модель', value: st.marking })
    }
  }
  calc.updateOrCreateBlock(props.config.title, params)
}

async function save() {
  sync(); buildBlock()
  const st = calc.addons.value[props.config.key]
  const k = props.config.saveKeys
  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      [k.isThere]: st.isThere,
      [k.provided]: st.provided || null,
      [k.installed]: st.installed || null,
      [k.id]: st.itemId,
    })
  } catch (e) { console.warn('saveWicketData:', e) }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType: calc.productType.value,
        model: calc.model.value,
        modelId: calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) { console.warn('recalculate:', e) }
  }
}

watch(selectedId, () => save())
watch(isThereName, () => save())
watch([provided, installed], () => save())

onMounted(async () => {
  calc.setActivePage(props.config.page)
  if (showSelection.value && items.value.length && !items.value.some(i => i.id === selectedId.value)) {
    selectedId.value = items.value[0].id
  }
  await save()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">{{ config.title }}</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">
      <div class="option-grid">
        <label class="lock-card"><input v-model="isThereName" type="radio" value="Будет" class="sr-only" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">Будет</span></div></label>
        <label class="lock-card"><input v-model="isThereName" type="radio" value="Не будет" class="sr-only" />
          <div class="card-content"><span class="block text-sm font-semibold text-center">Не будет</span></div></label>
      </div>

      <template v-if="showDetails">
        <div class="option-grid">
          <label v-for="opt in providedOptions" :key="opt.value" class="lock-card">
            <input v-model="provided" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content"><span class="block text-sm font-semibold text-center">{{ opt.label }}</span></div></label>
        </div>
        <div class="option-grid">
          <label v-for="opt in installedOptions" :key="opt.value" class="lock-card">
            <input v-model="installed" type="radio" :value="opt.value" class="sr-only" />
            <div class="card-content"><span class="block text-sm font-semibold text-center">{{ opt.label }}</span></div></label>
        </div>

        <template v-if="showSelection">
          <div>
            <h2 class="text-lg font-semibold mb-2 text-center">Модель</h2>
            <div v-if="items.length" class="pen-cards-row">
              <label v-for="it in items" :key="it.id" class="lock-viewer-card pen-card">
                <input v-model="selectedId" type="radio" :value="it.id" class="sr-only" />
                <div class="card-content">
                  <ImageViewer v-if="it.imageUrls?.length" :title="it.marking" :images="it.imageUrls" image-height="100px" />
                  <div v-else class="pen-placeholder" aria-hidden="true" />
                  <span class="block text-sm font-semibold text-center mt-2">{{ it.marking }}</span>
                </div>
              </label>
            </div>
            <div v-else class="px-2 py-4 text-sm text-gray-500 text-center">Нет доступных моделей</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.option-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 4px; }
@media (min-width: 640px) { .option-grid { grid-template-columns: repeat(2, 1fr); min-width: 350px; max-width: 600px; margin-inline: auto; } }
.pen-cards-row { display: grid; grid-template-columns: 1fr; gap: 16px 24px; padding: 4px; width: 100%; min-width: 0; }
@media (min-width: 900px) { .pen-cards-row { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); max-width: 1424px; margin: 0 auto; } }
.pen-placeholder { width: 100%; height: 100px; background: #f3f4f6; border-radius: 8px; margin-bottom: 8px; }
.lock-card, .lock-viewer-card { cursor: pointer; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.lock-card:hover, .lock-viewer-card:hover { border-color: #93c5fd; }
.lock-card:has(input:checked), .lock-viewer-card:has(input:checked) { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); background: #eff6ff; }
.card-content { padding: 12px; }
</style>
