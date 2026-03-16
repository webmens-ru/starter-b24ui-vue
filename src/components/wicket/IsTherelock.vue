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
      order_id: Number(calc.number.value),
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
      <span class="text-2xl font-bold flex-1 text-center">Замок</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Есть / Нет замок -->
      <div>
        <div class="option-grid">
          <label class="lock-card">
            <input v-model="is_there_lock" type="radio" value="Есть" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Есть</span>
            </div>
          </label>
          <label class="lock-card">
            <input v-model="is_there_lock" type="radio" value="Нет" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Нет</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Детали замка (только если Есть) -->
      <template v-if="showLockDetails">

        <!-- Кто предоставляет замок -->
        <div>
          <div class="option-grid">
            <label v-for="opt in providesOptions" :key="opt.value" class="lock-card">
              <input v-model="provides_lock" type="radio" :value="opt.value" class="sr-only" @change="save" />
              <div class="card-content">
                <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Кто выполняет врезку -->
        <div>
          <div class="option-grid">
            <label v-for="opt in installerOptions" :key="opt.value" class="lock-card">
              <input v-model="lock_installer" type="radio" :value="opt.value" class="sr-only" @change="save" />
              <div class="card-content">
                <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Кабель для э/м замка -->
        <div>
          <div class="option-grid">
            <label v-for="opt in cableOptions" :key="opt.value" class="lock-card">
              <input v-model="is_there_cable" type="radio" :value="opt.value" class="sr-only" @change="save" />
              <div class="card-content">
                <span class="block text-sm font-semibold text-center">{{ opt.label }}</span>
              </div>
            </label>
          </div>
        </div>

      </template>

    </div>
  </div>
</template>

<style scoped>
.option-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 4px;
}

@media (min-width: 640px) {
  .option-grid {
    grid-template-columns: repeat(2, 1fr);
    min-width: 350px;
    max-width: 600px;
    margin-inline: auto;
  }
}

.lock-card {
  cursor: pointer;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
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
}
</style>
