<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
const openingOptions = [
  { label: 'Наружу / Правая', id: 1, img: '/web/img/wicket_opening_diagram_02.jpg' },
  { label: 'Наружу / Левая',  id: 3, img: '/web/img/wicket_opening_diagram_01.jpg' },
  { label: 'Внутрь / Левая',  id: 2, img: '/web/img/wicket_opening_diagram_03.jpg' },
  { label: 'Внутрь / Правая', id: 4, img: '/web/img/wicket_opening_diagram_04.jpg' },
]
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
  const name = stolbOptions.value.find(i => String(i.id) === stolb_id.value)?.name ?? ''
  await save()
  openModal(`Внесены изменения: столб '${name}'`, 'Изменения сохранены')
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
  const name = sortamentOptions.value.find(i => String(i.id) === peremichka_sortament.value)?.name ?? ''
  await save()
  openModal(`Внесены изменения: сортамент перемычки '${name}'`, 'Изменения сохранены')
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

  const openingItem = openingOptions.find(o => o.id === opening_option_id.value)
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
      calculation_number:        calc.number.value,
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
        calculation_number: calc.number.value,
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
      <span class="text-2xl font-bold text-center">Столбы / Вариант открытия / Перемычка</span>
      <B24Button label="Далее"  color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-6 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Наличие столбов -->
      <div class="flex flex-wrap gap-10 justify-center">

        <!-- Со столбами -->
        <div class="flex flex-col items-center gap-2">
          <label class="flex items-center gap-2 cursor-pointer font-semibold">
            <input
              v-model="nalichie_stolbov"
              type="radio"
              value="Со столбами"
              class="accent-blue-600"
              @change="onNalichieChange"
            />
            Со столбами
          </label>
          <select
            v-show="showStolbList"
            v-model="stolb_id"
            class="border border-gray-300 rounded px-2 py-1 text-sm min-w-[120px]"
            @change="onStolbChange"
          >
            <option
              v-for="item in stolbOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
        </div>

        <!-- Без столбов -->
        <div class="flex flex-col items-center justify-center">
          <label class="flex items-center gap-2 cursor-pointer font-semibold">
            <input
              v-model="nalichie_stolbov"
              type="radio"
              value="Без столбов"
              class="accent-blue-600"
              @change="onNalichieChange"
            />
            Без столбов
          </label>
        </div>

      </div>

      <!-- Вариант открытия -->
      <div class="flex flex-wrap gap-5 justify-center">
        <div
          v-for="opt in openingOptions"
          :key="opt.id"
          class="flex flex-col items-center w-[180px]"
        >
          <label class="flex flex-col items-center gap-1 cursor-pointer">
            <div class="flex items-center gap-1">
              <input
                v-model="opening_option_id"
                type="radio"
                :value="opt.id"
                class="accent-blue-600"
                @change="onOpeningOptionChange"
              />
              <span class="text-sm font-semibold">{{ opt.label }}</span>
            </div>
            <img
              :src="opt.img"
              :alt="opt.label"
              class="mt-1 border border-gray-300 rounded"
              style="max-width: 180px; height: auto;"
            />
          </label>
        </div>
      </div>

      <!-- Перемычка -->
      <div v-show="showPeremichka" class="flex flex-wrap items-center gap-3">
        <span class="font-bold text-base whitespace-nowrap">Перемычка:</span>
        <div class="flex flex-wrap gap-3 flex-1 min-w-[150px]">
          <select
            v-model="peremichka_polozheniye"
            class="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[140px]"
            @change="onPolozhenieChange"
          >
            <option
              v-for="item in peremichkaOptions"
              :key="item.id"
              :value="String(item.id)"
            >{{ item.name }}</option>
          </select>
          <select
            v-show="showSortament"
            v-model="peremichka_sortament"
            class="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[140px]"
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
