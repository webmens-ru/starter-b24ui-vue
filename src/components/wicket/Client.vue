<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCalculation } from '../../composables/useCalculation'
import {
  saveWicketData,
  saveCalculationNumber,
  saveClientInfo,
  getAddressSuggestions,
} from '../../app/api/wicket'

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

// ─── Поля формы ──────────────────────────────────────────────────────────────
const calculation_name = ref('')
const client_name      = ref('')
const client_last_name = ref('')
const client_surname   = ref('')
const country_code     = ref('+7')
const phone            = ref('')
const client_email     = ref('')
const address          = ref('')
const client_comment   = ref('')

// ─── Ошибки ──────────────────────────────────────────────────────────────────
const errName  = ref(false)
const errPhone = ref(false)

// ─── Телефонная маска ─────────────────────────────────────────────────────────
function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  let result = ''
  if (digits.length > 0) result += '(' + digits.slice(0, 3)
  if (digits.length >= 3) result += ') '
  if (digits.length >= 4) result += digits.slice(3, 6)
  if (digits.length >= 6) result += '-' + digits.slice(6, 8)
  if (digits.length >= 8) result += '-' + digits.slice(8, 10)
  return result
}

function onPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement
  const raw = input.value
  const masked = applyPhoneMask(raw)
  phone.value = masked
  input.value = masked
  debouncedSync()
}

function onPhoneKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    const digits = phone.value.replace(/\D/g, '')
    phone.value = applyPhoneMask(digits.slice(0, -1))
    debouncedSync()
  }
}

const VALID_CODES = ['+1', '+7', '+31', '+33', '+44', '+49', '+380', '+375']

function onCountryCodeBlur() {
  if (!VALID_CODES.includes(country_code.value)) {
    openModal('Неверный код страны!')
    country_code.value = ''
  }
}

// ─── Подсказки адреса ─────────────────────────────────────────────────────────
const suggestions      = ref<string[]>([])
const showSuggestions  = ref(false)
let   suggestTimer: ReturnType<typeof setTimeout> | null = null

async function onAddressInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  const q = address.value
  if (q.length < 3) {
    suggestions.value    = []
    showSuggestions.value = false
    debouncedSync()
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await getAddressSuggestions(q)
      suggestions.value    = res.suggestions.map(s => s.value)
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value    = []
      showSuggestions.value = false
    }
    debouncedSync()
  }, 300)
}

function selectSuggestion(val: string) {
  address.value         = val
  showSuggestions.value = false
  syncCalcFields()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.address-wrapper')) {
    showSuggestions.value = false
  }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
let syncTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => syncCalcFields(), 500)
}

// ─── Синхронизация ───────────────────────────────────────────────────────────
function syncCalcFields() {
  calc.calculation_name.value = calculation_name.value
  calc.client_name.value      = client_name.value
  calc.client_last_name.value = client_last_name.value
  calc.client_surname.value   = client_surname.value
  calc.client_phone.value     = country_code.value + ' ' + phone.value
  calc.client_email.value     = client_email.value
  calc.client_address.value   = address.value
  calc.client_comment.value   = client_comment.value
  calc.country_code.value     = country_code.value

  calc.updateOrCreateBlock('Клиент', [
    { name: 'Название расчета', value: calc.calculation_name.value },
    { name: 'Имя',             value: calc.client_name.value },
    { name: 'Фамилия',         value: calc.client_last_name.value },
    { name: 'Отчество',        value: calc.client_surname.value },
    { name: 'Телефон',         value: calc.client_phone.value },
    { name: 'Эл. почта',       value: calc.client_email.value },
    { name: 'Адрес',           value: calc.client_address.value },
    { name: 'Комментарий',     value: calc.client_comment.value },
  ])
}

// ─── Валидация + сохранение при "Далее" ───────────────────────────────────────
function validate(): boolean {
  errName.value  = false
  errPhone.value = false
  const msgs: string[] = []
  if (!client_name.value.trim()) { errName.value  = true; msgs.push('Заполните поле: Имя') }
  if (!phone.value.trim())       { errPhone.value = true; msgs.push('Заполните поле: Телефон') }
  if (msgs.length) { openModal(msgs.join('\n')); return false }
  return true
}

async function handleNext() {
  syncCalcFields()
  if (!validate()) return

  const payload = {
    calculation_number: calc.number.value,
    calculation_name:   calc.calculation_name.value,
    client_name:        calc.client_name.value,
    client_last_name:   calc.client_last_name.value,
    client_surname:     calc.client_surname.value,
    client_phone:       calc.client_phone.value,
    client_email:       calc.client_email.value,
    client_address:     calc.client_address.value,
    client_comment:     calc.client_comment.value,
    model_id:           calc.modelId.value,
  }

  try {
    await saveWicketData(payload)
    await saveCalculationNumber(payload)
    await saveClientInfo(payload)
  } catch (e) {
    console.warn('saveClientData:', e)
  }

  emit('next')
}

// ─── Монтирование ─────────────────────────────────────────────────────────────
onMounted(() => {
  calc.setActivePage('page11')

  calculation_name.value = calc.calculation_name.value
  client_name.value      = calc.client_name.value
  client_last_name.value = calc.client_last_name.value
  client_surname.value   = calc.client_surname.value
  client_email.value     = calc.client_email.value
  address.value          = calc.client_address.value
  client_comment.value   = calc.client_comment.value

  if (calc.country_code.value)  country_code.value = calc.country_code.value
  if (calc.client_phone.value) {
    const parts = calc.client_phone.value.split(' ')
    if (parts.length > 1) phone.value = parts.slice(1).join(' ')
  }

  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
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
      <B24Button label="Назад" color="air-secondary" @click="emit('back')" />
      <span class="text-2xl font-bold text-center">Клиент</span>
      <B24Button label="Далее" color="air-secondary" @click="handleNext" />
    </div>

    <div class="flex flex-col gap-4 overflow-y-auto" style="max-height: 500px; padding-right: 4px;">

      <!-- Название расчёта -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Название расчета:</label>
        <input
          v-model="calculation_name"
          type="text"
          placeholder="Введите название расчета"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Имя -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Имя: <span class="text-red-500">*</span></label>
        <input
          v-model="client_name"
          type="text"
          placeholder="Введите имя"
          class="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          :class="errName ? 'border-red-500' : 'border-gray-300'"
          @input="debouncedSync"
        />
      </div>

      <!-- Фамилия -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Фамилия:</label>
        <input
          v-model="client_last_name"
          type="text"
          placeholder="Введите фамилию"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Отчество -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Отчество:</label>
        <input
          v-model="client_surname"
          type="text"
          placeholder="Введите отчество"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Телефон -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Телефон: <span class="text-red-500">*</span></label>
        <div class="flex gap-2">
          <input
            v-model="country_code"
            type="text"
            list="country-codes"
            placeholder="+7"
            style="width: 70px; text-align: center;"
            class="border border-gray-300 rounded px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            @blur="onCountryCodeBlur"
          />
          <datalist id="country-codes">
            <option value="+7">Россия / Казахстан</option>
            <option value="+375">Беларусь</option>
          </datalist>
          <input
            :value="phone"
            type="text"
            placeholder="(___) ___-__-__"
            class="flex-1 border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            :class="errPhone ? 'border-red-500' : 'border-gray-300'"
            @input="onPhoneInput"
            @keydown="onPhoneKeydown"
          />
        </div>
      </div>

      <!-- Эл. почта -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Электронная почта:</label>
        <input
          v-model="client_email"
          type="email"
          placeholder="Введите электронную почту"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="debouncedSync"
        />
      </div>

      <!-- Адрес с подсказками -->
      <div class="flex flex-col gap-1 address-wrapper relative">
        <label class="font-semibold text-sm">Адрес:</label>
        <input
          v-model="address"
          type="text"
          placeholder="Введите адрес полностью"
          autocomplete="off"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          @input="onAddressInput"
        />
        <ul
          v-if="showSuggestions"
          class="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          <li
            v-for="s in suggestions"
            :key="s"
            class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
            @mousedown.prevent="selectSuggestion(s)"
          >
            {{ s }}
          </li>
        </ul>
      </div>

      <!-- Комментарий -->
      <div class="flex flex-col gap-1">
        <label class="font-semibold text-sm">Комментарий:</label>
        <textarea
          v-model="client_comment"
          rows="4"
          placeholder="Ваш комментарий"
          class="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          @input="debouncedSync"
        />
      </div>

    </div>
  </div>
</template>
