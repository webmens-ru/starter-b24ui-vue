<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

declare const window: Window & { _HOSTNAME_: string }
import { useCalculation } from '../../composables/useCalculation'
import {
  getAssortmentStolb,
  getPolozhenieJumper,
  getAssortmentJumper,
  saveWicketData,
  recalculate,
} from '../../app/api/wicket'
import type { SelectItem } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Модальное окно ───────────────────────────────────────────────────────────
const showModal  = ref(false)
const modalTitle = ref('Внимание')
const modalMsg   = ref('')

function openModal(msg: string, title = 'Внимание') {
  modalTitle.value = title
  modalMsg.value   = msg
  showModal.value  = true
}

// ─── Столбы ──────────────────────────────────────────────────────────────────
const stolbOptions      = ref<SelectItem[]>([])
const nalichie_stolbov  = ref<'Со столбами' | 'Без столбов'>('Со столбами')
const stolb_id          = ref<string>('')
const showStolbList     = computed(() => nalichie_stolbov.value === 'Со столбами')

// ─── Вариант открытия ────────────────────────────────────────────────────────
const openingOptions = computed(() => {
  const base = window._HOSTNAME_
  return [
    { label: 'Наружу / Правая', id: 1, img: `${base}/web/img/wicket_opening_diagram_02.jpg` },
    { label: 'Наружу / Левая',  id: 3, img: `${base}/web/img/wicket_opening_diagram_01.jpg` },
    { label: 'Внутрь / Левая',  id: 2, img: `${base}/web/img/wicket_opening_diagram_03.jpg` },
    { label: 'Внутрь / Правая', id: 4, img: `${base}/web/img/wicket_opening_diagram_04.jpg` },
  ]
})
const opening_option_id = ref<number | null>(null)

// ─── Перемычка ───────────────────────────────────────────────────────────────
const showPeremichka         = ref(false)
const peremichkaOptions      = ref<SelectItem[]>([])
const peremichka_polozheniye = ref<string>('')
const showSortament          = ref(false)
const sortamentOptions       = ref<SelectItem[]>([])
const peremichka_sortament   = ref<string>('')

// Формат для B24SelectMenu: { id, label }
const stolbSelectItems       = computed(() => stolbOptions.value.map(o => ({ id: String(o.id), label: o.name })))
const peremichkaSelectItems  = computed(() => peremichkaOptions.value.map(o => ({ id: String(o.id), label: o.name })))
const sortamentSelectItems   = computed(() => sortamentOptions.value.map(o => ({ id: String(o.id), label: o.name })))

// ─── Загрузка данных ─────────────────────────────────────────────────────────
async function loadStolbOptions() {
  try {
    const res = await getAssortmentStolb(calc.modelId.value)
    stolbOptions.value = res.assortmentPipe
    // Дефолтный выбор id=7 при первом открытии
    if (!stolb_id.value) {
      const defaultItem = stolbOptions.value.find(i => i.id === 7)
      stolb_id.value = String(defaultItem?.id ?? stolbOptions.value[0]?.id ?? '')
    }
  } catch (e) {
    console.warn('getAssortmentStolb:', e)
  }
}

async function loadPolozhenieOptions(openingId: number) {
  try {
    const res = await getPolozhenieJumper(calc.modelId.value, openingId)
    peremichkaOptions.value = res.availablePolozheniyeJumper
    if (!peremichka_polozheniye.value) {
      peremichka_polozheniye.value = String(peremichkaOptions.value[0]?.id ?? '')
    }
  } catch (e) {
    console.warn('getPolozhenieJumper:', e)
  }
}

async function loadSortamentOptions() {
  try {
    const res = await getAssortmentJumper(calc.modelId.value)
    sortamentOptions.value = res.assortmentJumper
    // Дефолтный выбор id=11 при первом открытии
    if (!peremichka_sortament.value) {
      const defaultItem = sortamentOptions.value.find(i => i.id === 11)
      peremichka_sortament.value = String(defaultItem?.id ?? sortamentOptions.value[0]?.id ?? '')
    }
  } catch (e) {
    console.warn('getAssortmentJumper:', e)
  }
}

// ─── Обработчики ─────────────────────────────────────────────────────────────
async function onNalichieChange() {
  await save()
}

async function onStolbChange() {
  await save()
}

async function onOpeningOptionChange() {
  if (opening_option_id.value === null) return
  showPeremichka.value = true
  showSortament.value  = false
  peremichka_sortament.value = ''
  peremichkaOptions.value    = []
  sortamentOptions.value     = []
  calc.peremichkaPolozheniyeId.value   = ''
  calc.peremichkaPolozheniyeName.value = ''
  calc.peremichkaSortamentId.value     = null
  calc.peremichkaSortamentName.value   = null
  peremichka_polozheniye.value = ''
  await loadPolozhenieOptions(opening_option_id.value)
  await save()
}

async function onPolozhenieChange() {
  showSortament.value = peremichka_polozheniye.value !== '1'
  sortamentOptions.value = []
  peremichka_sortament.value = ''
  if (showSortament.value) {
    await loadSortamentOptions()
  }
  await save()
}

async function onSortamentChange() {
  await save()
}

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.nalichieStolbovName.value = nalichie_stolbov.value
  calc.nalichieStolbovId.value   = nalichie_stolbov.value === 'Со столбами' ? 1 : 0

  if (nalichie_stolbov.value === 'Со столбами') {
    calc.stolbId.value   = stolb_id.value
    const item = stolbOptions.value.find(i => String(i.id) === stolb_id.value)
    calc.stolbName.value = item?.name ?? ''
  } else {
    calc.stolbId.value   = ''
    calc.stolbName.value = ''
  }

  const openingItem = openingOptions.value.find(o => o.id === opening_option_id.value)
  calc.openingOptionName.value       = openingItem?.label ?? ''
  calc.openingOptionId.value         = opening_option_id.value
  calc.openingOptionPathPhoto.value = openingItem?.img ?? ''

  calc.peremichkaPolozheniyeId.value = peremichka_polozheniye.value
  const polItem = peremichkaOptions.value.find(i => String(i.id) === peremichka_polozheniye.value)
  calc.peremichkaPolozheniyeName.value = polItem?.name ?? ''

  if (calc.peremichkaPolozheniyeName.value && calc.peremichkaPolozheniyeName.value !== 'Без перемычки') {
    calc.peremichkaSortamentId.value = peremichka_sortament.value || null
    const sortItem = sortamentOptions.value.find(i => String(i.id) === peremichka_sortament.value)
    calc.peremichkaSortamentName.value = sortItem?.name ?? null
  } else {
    calc.peremichkaSortamentId.value   = null
    calc.peremichkaSortamentName.value = null
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Наличие столбов', value: calc.nalichieStolbovName.value },
  ]
  if (nalichie_stolbov.value === 'Со столбами' && calc.stolbName.value) {
    params.push({ name: 'Сортамент столбов', value: calc.stolbName.value })
  }
  if (calc.openingOptionName.value) {
    params.push({ name: 'Вариант открытия', value: calc.openingOptionName.value })
  }
  if (calc.peremichkaPolozheniyeName.value) {
    params.push({ name: 'Положение перемычки', value: calc.peremichkaPolozheniyeName.value })
  }
  if (calc.peremichkaSortamentName.value) {
    params.push({ name: 'Сортамент перемычки', value: calc.peremichkaSortamentName.value })
  }
  calc.updateOrCreateBlock('Столбы / вариант открытия / перемычка', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      nalichieStolbovName:     calc.nalichieStolbovName.value,
      nalichieStolbovId:       calc.nalichieStolbovId.value,
      stolbName:                calc.stolbName.value,
      stolbId:                  calc.stolbId.value,
      openingOptionName:       calc.openingOptionName.value,
      openingOptionId:         calc.openingOptionId.value,
      openingOptionPathPhoto: calc.openingOptionPathPhoto.value,
      peremichkaPolozheniyeName: calc.peremichkaPolozheniyeName.value,
      peremichkaPolozheniyeId:   calc.peremichkaPolozheniyeId.value,
      peremichkaSortamentName:   calc.peremichkaSortamentName.value,
      peremichkaSortamentId:     calc.peremichkaSortamentId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productType:       calc.productType.value,
        model:              calc.model.value,
        modelId:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    } catch (e) {
      console.warn('recalculate:', e)
    }
  }
}

// ─── Кнопка «Далее» ──────────────────────────────────────────────────────────
function handleNext() {
  if (opening_option_id.value === null) {
    openModal('Выберите вариант открытия')
    return
  }
  emit('next')
}

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page5')

  // Восстанавливаем сохранённые значения
  if (calc.nalichieStolbovName.value) {
    nalichie_stolbov.value = calc.nalichieStolbovName.value as 'Со столбами' | 'Без столбов'
  }
  if (calc.openingOptionId.value !== null) {
    opening_option_id.value = calc.openingOptionId.value
  }

  await loadStolbOptions()

  // Восстанавливаем stolb_id после загрузки списка
  if (calc.stolbId.value) {
    stolb_id.value = String(calc.stolbId.value)
  }

  if (opening_option_id.value !== null) {
    showPeremichka.value = true
    await loadPolozhenieOptions(opening_option_id.value)
    if (calc.peremichkaPolozheniyeId.value) {
      peremichka_polozheniye.value = String(calc.peremichkaPolozheniyeId.value)
    }
    if (peremichka_polozheniye.value && peremichka_polozheniye.value !== '1') {
      showSortament.value = true
      await loadSortamentOptions()
      if (calc.peremichkaSortamentId.value) {
        peremichka_sortament.value = String(calc.peremichkaSortamentId.value)
      }
    }
  }

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <B24Modal
      v-model:open="showModal"
      :title="modalTitle"
      :description="modalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Столбы / Вариант открытия / Перемычка</span>
      <B24Button label="Далее"  color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Наличие столбов -->
      <div class="flex flex-col items-start gap-3 w-full">
        <div class="stolb-grid">
          <label class="lock-card">
            <input
              v-model="nalichie_stolbov"
              type="radio"
              value="Со столбами"
              class="sr-only"
              @change="onNalichieChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Со столбами</span>
            </div>
          </label>
          <label class="lock-card">
            <input
              v-model="nalichie_stolbov"
              type="radio"
              value="Без столбов"
              class="sr-only"
              @change="onNalichieChange"
            />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Без столбов</span>
            </div>
          </label>
        </div>
        <div v-show="showStolbList" class="stolb-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Столб:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="stolb_id"
              value-key="id"
              :items="stolbSelectItems"
              placeholder="Выберите столб"
              class="w-full"
              @update:model-value="onStolbChange"
            />
          </div>
        </div>
      </div>

      <!-- Вариант открытия -->
      <div class="opening-grid">
        <label
          v-for="opt in openingOptions"
          :key="opt.id"
          class="lock-card"
        >
          <input
            v-model="opening_option_id"
            type="radio"
            :value="opt.id"
            class="sr-only"
            @change="onOpeningOptionChange"
          />
          <div class="card-content">
            <img
              :src="opt.img"
              :alt="opt.label"
              class="w-full h-[140px] object-contain mb-2"
            />
            <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
          </div>
        </label>
      </div>

      <!-- Перемычка -->
      <div v-show="showPeremichka" class="flex flex-col items-start gap-2 w-full">
        <div class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Перемычка:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="peremichka_polozheniye"
              value-key="id"
              :items="peremichkaSelectItems"
              placeholder="Выберите перемычку"
              class="w-full"
              @update:model-value="onPolozhenieChange"
            />
          </div>
        </div>
        <div v-show="showSortament" class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Труба:</span>
          <div class="select-full-width">
            <B24SelectMenu
              v-model="peremichka_sortament"
              value-key="id"
              :items="sortamentSelectItems"
              placeholder="Выберите трубу"
              class="w-full"
              @update:model-value="onSortamentChange"
            />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stolb-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 4px;
  width: 100%;
}

@media (min-width: 640px) {
  .stolb-grid {
    grid-template-columns: repeat(2, 1fr);
    min-width: 350px;
    max-width: 600px;
  }
}

.stolb-select-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}


.peremichka-select-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.opening-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 4px;
}

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lock-card:hover {
  border-color: #93c5fd;
}

.lock-card:has(input[type="radio"]:checked) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #eff6ff;
}

.card-content {
  padding: 12px;
  background: transparent;
  transition: background 0.15s ease;
}

.lock-card:has(input[type="radio"]:checked) .card-content {
  background: #eff6ff;
}
</style>
