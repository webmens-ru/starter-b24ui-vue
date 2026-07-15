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
const isThereLockName  = ref<string>('Есть')
const providesLock  = ref<string>('Предоставляет изготовитель')
const lockInstaller = ref<string>('Выполняет изготовитель')
const isThereCable = ref<string>('Изготовитель устанавливает')

const showLockDetails = computed(() => isThereLockName.value === 'Есть')

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
  calc.isThereLockName.value = isThereLockName.value
  calc.isThereLock.value   = isThereLockName.value === 'Есть' ? 1 : 0

  if (showLockDetails.value) {
    calc.providesLock.value  = providesLock.value
    calc.lockInstaller.value = lockInstaller.value
    calc.isThereCable.value = isThereCable.value
    if (providesLock.value === 'Предоставляет заказчик') {
      calc.typeLock.value      = ''
      calc.lockSetId.value    = null
      calc.lockPenId.value    = null
      calc.lockPenColor.value = ''
      calc.lockPenColorId.value = null
      calc.lockComponentIds.value = []
      calc.lockComponentsInstalled.value = 'Устанавливает изготовитель'
    }
  } else {
    calc.providesLock.value  = ''
    calc.lockInstaller.value = ''
    calc.isThereCable.value = ''
    calc.typeLock.value      = ''
    calc.lockSetId.value    = null
    calc.lockPenId.value    = null
    calc.lockPenColor.value = ''
    calc.lockPenColorId.value = null
    calc.lockComponentIds.value = []
    calc.lockComponentsInstalled.value = 'Устанавливает изготовитель'
  }
}

function buildBlock() {
  const params: { name: string; value: string }[] = [
    { name: 'Замок есть/нет', value: calc.isThereLockName.value },
  ]
  if (showLockDetails.value) {
    params.push({ name: 'Замок предоставляет',    value: calc.providesLock.value })
    params.push({ name: 'Врезку замка выполняет', value: calc.lockInstaller.value })
    params.push({ name: 'Кабель для э/м замка',   value: calc.isThereCable.value })
  }
  calc.updateOrCreateBlock('Замок', params)
}

async function save() {
  syncCalcFields()
  buildBlock()

  try {
    const payload: Record<string, unknown> = {
      ...calc.getBaseSavePayload(),
      isThereLock:   calc.isThereLock.value,
      isThereLockName: calc.isThereLockName.value,
      providesLock:      calc.providesLock.value || null,
      lockInstaller:     calc.lockInstaller.value || null,
      isThereCable:     calc.isThereCable.value || null,
    }
    if (calc.isThereLock.value === 0 || calc.providesLock.value === 'Предоставляет заказчик') {
      payload.typeLock = null
      payload.lockSetId = null
      payload.lockPenId = null
      payload.lockPenColor = null
      payload.lockPenColorId = null
      payload.lockComponentIds = JSON.stringify([])
      payload.lockComponentsInstalled = null
    }
    await saveWicketData(payload)
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

// ─── Монтирование ────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page9')

  if (calc.isThereLockName.value) isThereLockName.value  = calc.isThereLockName.value
  if (calc.providesLock.value)      providesLock.value  = calc.providesLock.value
  if (calc.lockInstaller.value)     lockInstaller.value = calc.lockInstaller.value
  if (calc.isThereCable.value)     isThereCable.value = calc.isThereCable.value

  await save()
})
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Замок</span>
      <B24Button label="Далее" color="air-secondary" @click="emit('next')" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Есть / Нет замок -->
      <div>
        <div class="option-grid">
          <label class="lock-card">
            <input v-model="isThereLockName" type="radio" value="Есть" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">Есть</span>
            </div>
          </label>
          <label class="lock-card">
            <input v-model="isThereLockName" type="radio" value="Нет" class="sr-only" @change="save" />
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
              <input v-model="providesLock" type="radio" :value="opt.value" class="sr-only" @change="save" />
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
              <input v-model="lockInstaller" type="radio" :value="opt.value" class="sr-only" @change="save" />
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
              <input v-model="isThereCable" type="radio" :value="opt.value" class="sr-only" @change="save" />
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
