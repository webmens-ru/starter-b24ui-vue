<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Поля формы ──────────────────────────────────────────────────────────────
const is_there_lock  = ref<string>('Есть')
const provides_lock  = ref<string>('Предоставляет изготовитель')
const lock_installer = ref<string>('Выполняет изготовитель')
const is_there_cable = ref<string>('Изготовитель устанавливает')

const showLockDetails = computed(() => is_there_lock.value === 'Есть')

// ─── Группы радио ────────────────────────────────────────────────────────────
const providesOptions = [
  { value: 'Предоставляет изготовитель', label: 'Замок предоставляет изготовитель' },
  { value: 'Предоставляет заказчик',     label: 'Замок предоставляет заказчик' },
]

const installerOptions = [
  { value: 'Выполняет изготовитель', label: 'Врезку замка выполняет изготовитель' },
  { value: 'Выполняет заказчик',     label: 'Врезку замка выполняет заказчик' },
]

const cableOptions = [
  { value: 'Изготовитель устанавливает',     label: 'Кабель для э/м замка изготовитель устанавливает' },
  { value: 'Изготовитель не устанавливает',  label: 'Кабель для э/м замка изготовитель не устанавливает' },
]

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.is_there_lock_name.value = is_there_lock.value
  calc.is_there_lock_id.value   = is_there_lock.value === 'Есть' ? 1 : 0

  if (showLockDetails.value) {
    calc.provides_lock.value  = provides_lock.value
    calc.lock_installer.value = lock_installer.value
    calc.is_there_cable.value = is_there_cable.value
  } else {
    calc.provides_lock.value  = ''
    calc.lock_installer.value = ''
    calc.is_there_cable.value = ''
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Замок есть/нет', value: calc.is_there_lock_name.value },
  ]
  if (showLockDetails.value) {
    params.push({ name: 'Замок предоставляет',    value: calc.provides_lock.value })
    params.push({ name: 'Врезку замка выполняет', value: calc.lock_installer.value })
    params.push({ name: 'Кабель для э/м замка',   value: calc.is_there_cable.value })
  }
  calc.updateOrCreateBlock('Замок', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    await saveWicketData({
      calculation_number: calc.number.value,
      is_there_lock_id:   calc.is_there_lock_id.value,
      is_there_lock_name: calc.is_there_lock_name.value,
      provides_lock:      calc.provides_lock.value || null,
      lock_installer:     calc.lock_installer.value || null,
      is_there_cable:     calc.is_there_cable.value || null,
      model_id:           calc.modelId.value,
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

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page9')

  if (calc.is_there_lock_name.value) is_there_lock.value  = calc.is_there_lock_name.value
  if (calc.provides_lock.value)      provides_lock.value  = calc.provides_lock.value
  if (calc.lock_installer.value)     lock_installer.value = calc.lock_installer.value
  if (calc.is_there_cable.value)     is_there_cable.value = calc.is_there_cable.value

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Замок</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Есть / Нет замок -->
      <div class="flex justify-center gap-24 flex-wrap">
        <label class="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            v-model="is_there_lock"
            type="radio"
            value="Есть"
            class="accent-blue-600"
            @change="save"
          />
          Есть
        </label>
        <label class="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            v-model="is_there_lock"
            type="radio"
            value="Нет"
            class="accent-blue-600"
            @change="save"
          />
          Нет
        </label>
      </div>

      <!-- Детали замка (только если Есть) -->
      <template v-if="showLockDetails">

        <!-- Кто предоставляет замок -->
        <div class="flex justify-center gap-12 flex-wrap">
          <label
            v-for="opt in providesOptions"
            :key="opt.value"
            class="flex flex-col items-center gap-1 cursor-pointer text-center max-w-[180px]"
          >
            <input
              v-model="provides_lock"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm mt-1">{{ opt.label }}</span>
          </label>
        </div>

        <!-- Кто выполняет врезку -->
        <div class="flex justify-center gap-12 flex-wrap">
          <label
            v-for="opt in installerOptions"
            :key="opt.value"
            class="flex flex-col items-center gap-1 cursor-pointer text-center max-w-[180px]"
          >
            <input
              v-model="lock_installer"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm mt-1">{{ opt.label }}</span>
          </label>
        </div>

        <!-- Кабель для э/м замка -->
        <div class="flex justify-center gap-12 flex-wrap">
          <label
            v-for="opt in cableOptions"
            :key="opt.value"
            class="flex flex-col items-center gap-1 cursor-pointer text-center max-w-[180px]"
          >
            <input
              v-model="is_there_cable"
              type="radio"
              :value="opt.value"
              class="accent-blue-600"
              @change="save"
            />
            <span class="text-sm mt-1">{{ opt.label }}</span>
          </label>
        </div>

      </template>

    </div>
  </div>
</template>
