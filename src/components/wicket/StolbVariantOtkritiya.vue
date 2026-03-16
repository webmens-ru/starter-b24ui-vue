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

// ─── Загрузка данных ─────────────────────────────────────────────────────────
async function loadStolbOptions() {
  try {
    const res = await getAssortmentStolb(calc.modelId.value)
    stolbOptions.value = res.arr_assortment_pipe
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
    peremichkaOptions.value = res.arr_available_polozheniye_jumper
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
    sortamentOptions.value = res.arr_assortment_jumper
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
  calc.peremichka_polozheniye_id.value   = ''
  calc.peremichka_polozheniye_name.value = ''
  calc.peremichka_sortament_id.value     = null
  calc.peremichka_sortament_name.value   = null
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
  calc.nalichie_stolbov_name.value = nalichie_stolbov.value
  calc.nalichie_stolbov_id.value   = nalichie_stolbov.value === 'Со столбами' ? 1 : 0

  if (nalichie_stolbov.value === 'Со столбами') {
    calc.stolb_id.value   = stolb_id.value
    const item = stolbOptions.value.find(i => String(i.id) === stolb_id.value)
    calc.stolb_name.value = item?.name ?? ''
  } else {
    calc.stolb_id.value   = ''
    calc.stolb_name.value = ''
  }

  const openingItem = openingOptions.value.find(o => o.id === opening_option_id.value)
  calc.opening_option_name.value       = openingItem?.label ?? ''
  calc.opening_option_id.value         = opening_option_id.value
  calc.opening_option_path_photo.value = openingItem?.img ?? ''

  calc.peremichka_polozheniye_id.value = peremichka_polozheniye.value
  const polItem = peremichkaOptions.value.find(i => String(i.id) === peremichka_polozheniye.value)
  calc.peremichka_polozheniye_name.value = polItem?.name ?? ''

  if (calc.peremichka_polozheniye_name.value && calc.peremichka_polozheniye_name.value !== 'Без перемычки') {
    calc.peremichka_sortament_id.value = peremichka_sortament.value || null
    const sortItem = sortamentOptions.value.find(i => String(i.id) === peremichka_sortament.value)
    calc.peremichka_sortament_name.value = sortItem?.name ?? null
  } else {
    calc.peremichka_sortament_id.value   = null
    calc.peremichka_sortament_name.value = null
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Наличие столбов', value: calc.nalichie_stolbov_name.value },
  ]
  if (nalichie_stolbov.value === 'Со столбами' && calc.stolb_name.value) {
    params.push({ name: 'Сортамент столбов', value: calc.stolb_name.value })
  }
  if (calc.opening_option_name.value) {
    params.push({ name: 'Вариант открытия', value: calc.opening_option_name.value })
  }
  if (calc.peremichka_polozheniye_name.value) {
    params.push({ name: 'Положение перемычки', value: calc.peremichka_polozheniye_name.value })
  }
  if (calc.peremichka_sortament_name.value) {
    params.push({ name: 'Сортамент перемычки', value: calc.peremichka_sortament_name.value })
  }
  calc.updateOrCreateBlock('Столбы / вариант открытия / перемычка', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      order_id: Number(calc.number.value),
      nalichie_stolbov_name:     calc.nalichie_stolbov_name.value,
      nalichie_stolbov_id:       calc.nalichie_stolbov_id.value,
      stolb_name:                calc.stolb_name.value,
      stolb_id:                  calc.stolb_id.value,
      opening_option_name:       calc.opening_option_name.value,
      opening_option_id:         calc.opening_option_id.value,
      opening_option_path_photo: calc.opening_option_path_photo.value,
      peremichka_polozheniye_name: calc.peremichka_polozheniye_name.value,
      peremichka_polozheniye_id:   calc.peremichka_polozheniye_id.value,
      peremichka_sortament_name:   calc.peremichka_sortament_name.value,
      peremichka_sortament_id:     calc.peremichka_sortament_id.value,
      model_id:                    calc.modelId.value,
    })
  } catch (e) {
    console.warn('saveWicketData:', e)
  }

  if (calc.price_retail.value) {
    try {
      const result = await recalculate({
        order_id: Number(calc.number.value),
        product_type:       calc.productType.value,
        model:              calc.model.value,
        model_id:           calc.modelId.value,
      })
      calc.updatePriceBlock(result.price_dealer, result.price_retail)
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
  if (calc.nalichie_stolbov_name.value) {
    nalichie_stolbov.value = calc.nalichie_stolbov_name.value as 'Со столбами' | 'Без столбов'
  }
  if (calc.opening_option_id.value !== null) {
    opening_option_id.value = calc.opening_option_id.value
  }

  await loadStolbOptions()

  // Восстанавливаем stolb_id после загрузки списка
  if (calc.stolb_id.value) {
    stolb_id.value = String(calc.stolb_id.value)
  }

  if (opening_option_id.value !== null) {
    showPeremichka.value = true
    await loadPolozhenieOptions(opening_option_id.value)
    if (calc.peremichka_polozheniye_id.value) {
      peremichka_polozheniye.value = calc.peremichka_polozheniye_id.value
    }
    if (peremichka_polozheniye.value && peremichka_polozheniye.value !== '1') {
      showSortament.value = true
      await loadSortamentOptions()
      if (calc.peremichka_sortament_id.value) {
        peremichka_sortament.value = String(calc.peremichka_sortament_id.value)
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
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад"  color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Столбы / Вариант открытия / Перемычка</span>
      <B24Button label="Далее"  color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Наличие столбов -->
      <div class="flex flex-col items-center gap-3">
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
          <select
            v-model="stolb_id"
            class="border border-gray-300 rounded px-3 py-2.5 text-base w-full sm:w-auto sm:min-w-[450px]"
            @change="onStolbChange"
          >
            <option
              v-for="item in stolbOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
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
      <div v-show="showPeremichka" class="flex flex-col items-center gap-2">
        <div class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Перемычка:</span>
          <select
            v-model="peremichka_polozheniye"
            class="border border-gray-300 rounded px-3 py-2.5 text-base w-full sm:w-auto sm:min-w-[450px]"
            @change="onPolozhenieChange"
          >
            <option
              v-for="item in peremichkaOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
        </div>
        <div v-show="showSortament" class="peremichka-select-wrap">
          <span class="text-sm font-semibold whitespace-nowrap">Труба:</span>
          <select
            v-model="peremichka_sortament"
            class="border border-gray-300 rounded px-3 py-2.5 text-base w-full sm:w-auto sm:min-w-[450px]"
            @change="onSortamentChange"
          >
            <option
              v-for="item in sortamentOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
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
  align-items: center;
  gap: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .stolb-select-wrap {
    width: auto;
  }
}

.peremichka-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

@media (min-width: 640px) {
  .peremichka-select-wrap {
    width: auto;
  }
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
