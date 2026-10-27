<script setup lang="ts">
import { participantRoleLabel } from '../../app/participantRoles'
import { isOptionPresence, optionPresenceLabel, optionPresenceOptions, parseOptionPresence, type OptionPresenceSelection } from '../../app/optionPresence'
import { ref, computed, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { saveWicketData, recalculate } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
}>()

const calc = useCalculation()

// ─── Поля формы ──────────────────────────────────────────────────────────────
const presence = ref<OptionPresenceSelection>(null)
const presenceOptions = optionPresenceOptions('lock')
const presenceError = ref('')
const providesLock = ref<string>('manufacturer')
const lockInstaller = ref<string>('manufacturer')

const showLockDetails = computed(() => presence.value === 1)

// ─── Группы радио ────────────────────────────────────────────────────────────
const providesOptions = [
  { value: 'manufacturer', label: 'Замок предоставляет изготовитель' },
  { value: 'customer',     label: 'Замок предоставляет заказчик' },
]

const installerOptions = [
  { value: 'manufacturer', label: 'Врезку замка выполняет изготовитель' },
  { value: 'customer',     label: 'Врезку замка выполняет заказчик' },
]

// ─── Синхронизация + сохранение ──────────────────────────────────────────────
function syncCalcFields() {
  calc.isThereLockName.value = optionPresenceLabel(presence.value, 'lock')
  calc.isThereLock.value = presence.value

  if (showLockDetails.value) {
    const switchedToCustomer = providesLock.value === 'customer' && calc.providesLock.value !== 'customer'
    calc.providesLock.value = providesLock.value
    calc.lockInstaller.value = lockInstaller.value
    if (switchedToCustomer) {
      calc.typeLock.value = ''
      calc.lockSetId.value = null
      calc.lockPenId.value = null
      calc.lockPenColor.value = ''
      calc.lockPenColorId.value = null
    }
  } else {
    calc.providesLock.value  = ''
    calc.lockInstaller.value = ''
    calc.typeLock.value      = ''
    calc.lockSetId.value    = null
    calc.lockPenId.value    = null
    calc.lockPenColor.value = ''
    calc.lockPenColorId.value = null
  }
}

function buildBlock() {
  const params: { paramCode?: string; name: string; value: string }[] = [
    { paramCode: 'presence', name: 'Замок есть/нет', value: optionPresenceLabel(calc.isThereLock.value, 'lock') },
  ]
  if (showLockDetails.value) {
    params.push({ paramCode: 'lockProvider', name: 'Замок предоставляет',    value: participantRoleLabel('provide', calc.providesLock.value) })
    params.push({ paramCode: 'lockInstaller', name: 'Врезку замка выполняет', value: participantRoleLabel('perform', calc.lockInstaller.value) })
    if (calc.providesLock.value === 'customer') {
      params.push({ paramCode: 'lockType', name: 'Тип замка', value: 'Комплект заказчика' })
    }
  }
  calc.updateOrCreateBlock('lock', params, 'Замок')
}

async function save() {
  if (!isOptionPresence(presence.value)) return
  presenceError.value = ''
  const previous = {
    isThereLockName: calc.isThereLockName.value,
    isThereLock: calc.isThereLock.value,
    providesLock: calc.providesLock.value,
    lockInstaller: calc.lockInstaller.value,
    lockSetId: calc.lockSetId.value,
    typeLock: calc.typeLock.value,
    lockPenId: calc.lockPenId.value,
    lockPenColor: calc.lockPenColor.value,
    lockPenColorId: calc.lockPenColorId.value,
  }
  syncCalcFields()
  buildBlock()

  try {
    const hasLockSet = calc.isThereLock.value === 1
    await saveWicketData({
      ...calc.getBaseSavePayload(),
      lockSetId: hasLockSet ? calc.lockSetId.value : null,
      providesLock: hasLockSet ? (calc.providesLock.value || null) : null,
      lockInstaller: hasLockSet ? (calc.lockInstaller.value || null) : null,
      lockPenId: hasLockSet ? calc.lockPenId.value : null,
      lockPenColorId: hasLockSet ? calc.lockPenColorId.value : null,
    })
  } catch (e) {
    calc.isThereLockName.value = previous.isThereLockName
    calc.isThereLock.value = previous.isThereLock
    calc.providesLock.value = previous.providesLock
    calc.lockInstaller.value = previous.lockInstaller
    calc.lockSetId.value = previous.lockSetId
    calc.typeLock.value = previous.typeLock
    calc.lockPenId.value = previous.lockPenId
    calc.lockPenColor.value = previous.lockPenColor
    calc.lockPenColorId.value = previous.lockPenColorId
    presence.value = previous.isThereLock
    providesLock.value = previous.providesLock
    lockInstaller.value = previous.lockInstaller
    buildBlock()
    console.warn('saveWicketData:', e)
    return
  }

  if (calc.priceRetail.value) {
    try {
      const result = await recalculate({
        orderId: Number(calc.number.value),
        productRowId: calc.getCurrentProductRowContext().productRowId,
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
onMounted(() => {
  calc.setActivePage('page9')

  presence.value = parseOptionPresence(calc.isThereLock.value)
  providesLock.value = calc.providesLock.value
  lockInstaller.value = calc.lockInstaller.value

})

function validateBeforeLeave(): boolean {
  const valid = isOptionPresence(presence.value)
  presenceError.value = valid ? '' : 'Выберите наличие замка'
  return valid
}

function next(): void {
  if (validateBeforeLeave()) emit('next')
}

defineExpose({ validateBeforeLeave })
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Заголовок + кнопки -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Замок</span>
      <B24Button label="Далее" color="air-secondary" @click="next" />
    </div>

    <div class="flex flex-col gap-6" style="padding-inline: 4px;">

      <!-- Есть / Нет замок -->
      <div>
        <div class="option-grid">
          <label v-for="option in presenceOptions" :key="option.value" class="lock-card">
            <input v-model="presence" name="lock-presence" type="radio" :value="option.value" class="sr-only" @change="save" />
            <div class="card-content">
              <span class="block text-sm font-semibold text-center">{{ option.label }}</span>
            </div>
          </label>
        </div>
        <p v-if="presenceError" class="text-red-500 text-sm" role="alert">{{ presenceError }}</p>
      </div>

      <!-- Детали замка (только если Есть) -->
      <template v-if="showLockDetails">

        <!-- Кто предоставляет замок -->
        <div>
          <div class="option-grid">
            <label v-for="opt in providesOptions" :key="opt.value" class="lock-card">
              <input v-model="providesLock" name="providesLock" type="radio" :value="opt.value" class="sr-only" @change="save" />
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
              <input v-model="lockInstaller" name="lockInstaller" type="radio" :value="opt.value" class="sr-only" @change="save" />
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
