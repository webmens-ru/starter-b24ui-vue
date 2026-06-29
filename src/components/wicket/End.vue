<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { finalCalculate, deleteCalculation, saveWicketData, fetchSavedOrderPrice } from '../../app/api/wicket'
import { WICKET_SECTIONS, computeSectionValidation } from '../../pages/wicket/wicketSections'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const calc = useCalculation()

const orderViewHref = computed(() => {
  const orderId = Number(calc.number.value)
  return orderId > 0 ? `/orders/view?id=${orderId}` : ''
})

function goToOrderView() {
  if (orderViewHref.value) window.location.href = orderViewHref.value
}

// ─── Модальное окно подтверждения удаления ────────────────────────────────────
const showDeleteModal = ref(false)

// ─── Уведомления (ошибки) ─────────────────────────────────────────────────────
const showErrModal  = ref(false)
const errModalMsg   = ref('')

function openErrModal(msg: string) {
  errModalMsg.value  = msg
  showErrModal.value = true
}

// ─── Состояние расчёта ────────────────────────────────────────────────────────
const calculating       = ref(false)
const loadingSavedPrice = ref(false)
const calculated        = ref(false)
const priceDealer       = ref('')
const priceRetail       = ref('')
const calculatedAtLabel = ref('')

function formatCalculatedAt(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function applyActualSavedPrices(retail: string, dealer: string, lastCalculatedAt?: number) {
  priceDealer.value = dealer
  priceRetail.value = retail
  calc.updatePriceBlock(dealer, retail)
  calculated.value = true
  calculatedAtLabel.value =
    lastCalculatedAt && lastCalculatedAt > 0
      ? `Расчёт от ${formatCalculatedAt(lastCalculatedAt)}`
      : ''
}

async function loadSavedPriceIfActual() {
  const orderId = Number(calc.number.value)
  if (!orderId) return

  loadingSavedPrice.value = true
  try {
    const status = await fetchSavedOrderPrice(orderId, calc.modelId.value)
    if (status.isActual && status.priceRetail && status.priceDealer) {
      applyActualSavedPrices(status.priceRetail, status.priceDealer, status.lastCalculatedAt)
    } else {
      calculated.value = false
      calculatedAtLabel.value = ''
    }
  } catch (e) {
    console.warn('fetchSavedOrderPrice:', e)
  } finally {
    loadingSavedPrice.value = false
  }
}

/** Сохраняет reachedStep / visitedPages в wicket_type* (иначе при reopen остаётся page11). */
async function persistWizardProgress() {
  try {
    await saveWicketData(calc.getBaseSavePayload())
  } catch (e) {
    console.warn('persistWizardProgress:', e)
  }
}

// ─── Расчёт цены ─────────────────────────────────────────────────────────────
const sectionState = computed(() => ({
  isThereLock: calc.isThereLock.value,
  providesLock: calc.providesLock.value,
  lockSetId: calc.lockSetId.value,
  idFacade: calc.idFacade.value,
  idYard: calc.idYard.value,
  fillSide: calc.fillSide.value,
  widthProyema: calc.widthProyema.value,
  heightProyema: calc.heightProyema.value,
  availableSections: calc.availableSections.value,
}))

const sectionErrors = computed(() => {
  const validations = computeSectionValidation(WICKET_SECTIONS, sectionState.value)
  const errors: string[] = []
  validations.forEach((v) => { if (!v.valid) errors.push(...v.errors) })
  return errors
})

const allSectionsValid = computed(() => sectionErrors.value.length === 0)

async function handleCalculate() {
  if (!allSectionsValid.value) {
    openErrModal(sectionErrors.value.join('\n'))
    return
  }
  calculating.value = true
  try {
    const result = await finalCalculate({
      orderId: Number(calc.number.value),
      productType:       calc.productType.value,
      model:              calc.model.value,
      modelId:           calc.modelId.value,
    })
    applyActualSavedPrices(result.priceRetail, result.priceDealer, Math.floor(Date.now() / 1000))
    await persistWizardProgress()
  } catch (e) {
    console.error('finalCalculate:', e)
    openErrModal('Произошла ошибка при выполнении расчёта.')
  } finally {
    calculating.value = false
  }
}

// ─── Удаление расчёта ─────────────────────────────────────────────────────────
const deleting = ref(false)

async function confirmDelete() {
  deleting.value = true
  try {
    await deleteCalculation({
      orderId: Number(calc.number.value),
      modelId:           calc.modelId.value,
    })
    window.location.href = '/orders'
  } catch (e) {
    console.error('deleteCalculation:', e)
    showDeleteModal.value = false
    openErrModal('Произошла ошибка при удалении расчёта.')
  } finally {
    deleting.value = false
  }
}

// ─── Монтирование ─────────────────────────────────────────────────────────────
onMounted(async () => {
  calc.setActivePage('page12')
  await persistWizardProgress()
  calc.fieldsFilled.value = 1
  document.dispatchEvent(new Event('dataUpdated'))
  await loadSavedPriceIfActual()
})
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Модалка: подтверждение удаления -->
    <B24Modal
      v-model:open="showDeleteModal"
      title="Удалить расчёт?"
      description="Это действие необратимо. Расчёт будет удалён."
    >
      <template #footer="{ close }">
        <div class="flex gap-3">
          <B24Button
            color="danger"
            :loading="deleting"
            @click="confirmDelete"
          >Да, удалить</B24Button>
          <B24Button color="air-secondary" @click="close">Нет</B24Button>
        </div>
      </template>
    </B24Modal>

    <!-- Модалка: ошибка -->
    <B24Modal
      v-model:open="showErrModal"
      title="Ошибка"
      :description="errModalMsg"
    >
      <template #footer="{ close }">
        <B24Button color="air-primary" @click="close">Понятно</B24Button>
      </template>
    </B24Modal>

    <!-- Заголовок + кнопка Назад -->
    <div class="sticky-header-fill sticky top-0 z-10 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold flex-1 text-center">Рассчитать</span>
      <B24Button
        label="К заказу"
        color="air-secondary"
        :disabled="!orderViewHref"
        @click="goToOrderView"
      />
    </div>

    <!-- Сообщение -->
    <div class="flex flex-col items-center gap-2 py-4 text-center">
      <h2 class="text-xl font-semibold">Параметры заполнены в полном объёме</h2>
      <h3 class="text-base text-gray-500">Выберите дальнейшие действия</h3>
    </div>

    <!-- Кнопки действий -->
    <div class="flex flex-wrap gap-4 justify-center">
      <B24Button
        color="danger"
        size="lg"
        @click="showDeleteModal = true"
      >
        Не сохранять расчёт
      </B24Button>

      <B24Button
        color="primary"
        size="lg"
        :loading="calculating"
        :disabled="loadingSavedPrice"
        @click="handleCalculate"
      >
        Рассчитать
      </B24Button>
    </div>

    <!-- Результат расчёта -->
    <Transition name="fade">
      <div
        v-if="calculated"
        class="mx-auto mt-4 rounded-xl border border-blue-200 bg-blue-50 px-8 py-6 text-center shadow-sm"
      >
        <p class="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wide">Результат расчёта</p>
        <p
          v-if="calculatedAtLabel"
          class="text-xs text-gray-400 mb-4"
        >{{ calculatedAtLabel }}</p>
        <div class="flex flex-col sm:flex-row gap-6 justify-center">
          <div class="flex flex-col items-center">
            <span class="text-xs text-gray-400 mb-1">Дилерская цена</span>
            <span class="text-2xl font-bold text-blue-700">{{ priceDealer }} ₽</span>
          </div>
          <div class="hidden sm:block w-px bg-blue-200" />
          <div class="flex flex-col items-center">
            <span class="text-xs text-gray-400 mb-1">Рек. розн. цена</span>
            <span class="text-2xl font-bold text-green-600">{{ priceRetail }} ₽</span>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
