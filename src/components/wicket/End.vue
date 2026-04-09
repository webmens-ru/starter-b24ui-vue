<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import { finalCalculate, deleteCalculation } from '../../app/api/wicket'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const calc = useCalculation()

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
const calculating   = ref(false)
const calculated    = ref(false)
const priceDealer   = ref('')
const priceRetail   = ref('')

// ─── Расчёт цены ─────────────────────────────────────────────────────────────
async function handleCalculate() {
  calculating.value = true
  try {
    const result = await finalCalculate({
      orderId: Number(calc.number.value),
      productType:       calc.productType.value,
      model:              calc.model.value,
      modelId:           calc.modelId.value,
    })
    priceDealer.value = result.priceDealer
    priceRetail.value = result.priceRetail
    calc.updatePriceBlock(result.priceDealer, result.priceRetail)
    calculated.value = true
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
onMounted(() => {
  calc.setActivePage('page12')
  calc.fieldsFilled.value = 1
  document.dispatchEvent(new Event('dataUpdated'))

  // Восстановить цену из стора, если уже считалась
  if (calc.priceDealer.value && calc.priceRetail.value) {
    priceDealer.value = String(calc.priceDealer.value)
    priceRetail.value = String(calc.priceRetail.value)
    calculated.value  = true
  }
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
      <div class="w-[68px]" />
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
